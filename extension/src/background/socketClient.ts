import { io, type Socket } from 'socket.io-client'
import { SOCKET_EVENTS } from '../shared/events'
import { saveState } from './stateManager'
import type { ExtensionMessage, ExtensionState, Participant } from '../shared/messages'
import { DEFAULT_STATE } from '../shared/messages'

const SERVER_URL = 'https://syncwatch-backend-vwk3.onrender.com'

let socket: Socket | null = null
let pingInterval: ReturnType<typeof setInterval> | null = null
let pingSentAt = 0

let state: ExtensionState = { ...DEFAULT_STATE }

export function getSocket(): Socket | null {
  return socket
}

export function getState(): ExtensionState {
  return state
}

export function patchState(partial: Partial<ExtensionState>): void {
  state = { ...state, ...partial }
}

export function notifyPopup(message: ExtensionMessage): void {
  chrome.runtime.sendMessage(message).catch(() => {})
}

// ─── Exact shapes the server sends ───────────────────────────────────────────

/**
 * room_state payload (sent to the joining socket only).
 * It is the full serialized RoomState — participants is an array, not a Map.
 * There is NO top-level `role` field; the role lives inside each Participant.
 */
type RoomStatePayload = {
  id: string
  participants: ServerParticipant[]
  playback: {
    hostId: string
    isPlaying: boolean
    currentTime: number
    lastUpdatedAt: number
  }
  controlPolicy: string
  // (other fields we don't use are ignored)
}

/**
 * participant_update payload — the server sends a SINGLE Participant object
 * (not an array, not a wrapper object).
 * It can also carry status === 'removed' when someone permanently leaves.
 */
type ServerParticipant = {
  id: string
  nickname: string
  role: 'host' | 'viewer'
  status: 'ready' | 'buffering' | 'disconnected' | 'removed'
  fileHash: string | null
  latencyMs: number
  joinedAt: number
}

type PlaybackBroadcastPayload = {
  action: string
  currentTime: number
  timestamp: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toParticipant(p: ServerParticipant): Participant {
  return { id: p.id, nickname: p.nickname, role: p.role, latencyMs: p.latencyMs }
}

// ─── Socket init ──────────────────────────────────────────────────────────────

export function initSocket(onYouTubeTabNeeded?: () => Promise<number | null>): Socket {
  if (socket?.connected) return socket

  // Tear down any stale socket first
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
  }

  socket = io(SERVER_URL, {
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10_000,
    timeout: 20_000,
    transports: ['websocket', 'polling'],
  })

  // ── connect ─────────────────────────────────────────────────────────────────
  socket.on('connect', async () => {
    patchState({ connectionStatus: 'connected' })
    await saveState({ connectionStatus: 'connected' })

    // Re-join room after service-worker wake / reconnect
    if (state.roomId && state.nickname) {
      socket!.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomId: state.roomId,
        nickname: state.nickname,
      })
    }

    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  // ── disconnect ──────────────────────────────────────────────────────────────
  socket.on('disconnect', async () => {
    patchState({ connectionStatus: 'disconnected' })
    await saveState({ connectionStatus: 'disconnected' })
    notifyPopup({ type: 'STATE_UPDATE', state })
    stopPingInterval()
  })

  socket.on('connect_error', () => {
    patchState({ connectionStatus: 'disconnected' })
    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  // ── room_state ───────────────────────────────────────────────────────────────
  // Sent ONLY to the socket that just joined.
  // The full room object is spread — there is NO top-level `role` field.
  // We find our own role by looking up socket.id in the participants array.
  socket.on(SOCKET_EVENTS.ROOM_STATE, async (data: RoomStatePayload) => {
    const mySocketId = socket!.id

    const me = data.participants.find(p => p.id === mySocketId)
    // Fall back to whatever role we already have (e.g. restored from storage)
    const myRole: 'host' | 'viewer' = me?.role ?? state.role ?? 'viewer'

    const participants: Participant[] = data.participants.map(toParticipant)

    patchState({ participants, role: myRole, isInRoom: true })
    await saveState({ role: myRole })
    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  // ── participant_update ───────────────────────────────────────────────────────
  // Sent to ALL OTHER sockets in the room (not the one who just joined).
  // Payload is a SINGLE Participant object — NOT an array, NOT { participants: [] }.
  // We merge/add/remove it into our local participants array.
  socket.on(SOCKET_EVENTS.PARTICIPANT_UPDATE, (p: ServerParticipant) => {
    let updated: Participant[]

    if (p.status === 'removed') {
      // Participant permanently left — remove from list
      updated = state.participants.filter(existing => existing.id !== p.id)
    } else {
      const idx = state.participants.findIndex(existing => existing.id === p.id)
      const entry = toParticipant(p)
      if (idx >= 0) {
        // Update existing entry
        updated = [...state.participants]
        updated[idx] = entry
      } else {
        // New participant joined
        updated = [...state.participants, entry]
      }
    }

    patchState({ participants: updated })
    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  // ── playback_broadcast ───────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.PLAYBACK_BROADCAST, async (data: PlaybackBroadcastPayload) => {
    const tabId = onYouTubeTabNeeded ? await onYouTubeTabNeeded() : null
    if (tabId === null) return

    chrome.tabs.sendMessage(tabId, {
      type: 'APPLY_PLAYBACK',
      action: data.action,
      currentTime: data.currentTime,
    }).catch(() => {})
  })

  // ── pong ─────────────────────────────────────────────────────────────────────
  socket.on(SOCKET_EVENTS.PONG, () => {
    const latencyMs = Math.round((Date.now() - pingSentAt) / 2)
    patchState({ latencyMs })
    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  return socket
}

// ─── Ping interval ────────────────────────────────────────────────────────────

export function startPingInterval(): void {
  stopPingInterval()
  pingInterval = setInterval(() => {
    if (!state.isInRoom || !socket?.connected) return
    pingSentAt = Date.now()
    // Server echoes the payload back; we send sentAt for compatibility
    socket.emit(SOCKET_EVENTS.PING, { sentAt: pingSentAt })
  }, 10_000)
}

export function stopPingInterval(): void {
  if (pingInterval !== null) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

export function disconnectSocket(): void {
  stopPingInterval()
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
