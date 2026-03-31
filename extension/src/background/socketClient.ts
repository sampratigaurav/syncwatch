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

type RoomStatePayload = {
  participants: Participant[]
  role: 'host' | 'viewer'
}

type ParticipantUpdatePayload = {
  participants: Participant[]
}

type PlaybackBroadcastPayload = {
  action: string
  currentTime: number
  timestamp: number
}

export function initSocket(onYouTubeTabNeeded?: () => Promise<number | null>): Socket {
  if (socket?.connected) return socket

  // Disconnect stale socket before creating a new one
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

  socket.on('connect', async () => {
    patchState({ connectionStatus: 'connected' })
    await saveState({ connectionStatus: 'connected' })

    // Re-join room if we were in one before sleep
    if (state.roomId && state.nickname) {
      socket!.emit(SOCKET_EVENTS.JOIN_ROOM, {
        roomId: state.roomId,
        nickname: state.nickname,
      })
    }

    notifyPopup({ type: 'STATE_UPDATE', state })
  })

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

  socket.on(SOCKET_EVENTS.ROOM_STATE, async (data: RoomStatePayload) => {
    patchState({
      participants: data.participants,
      role: data.role,
      isInRoom: true,
    })
    await saveState({ role: data.role })
    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  socket.on(SOCKET_EVENTS.PARTICIPANT_UPDATE, (data: ParticipantUpdatePayload) => {
    patchState({ participants: data.participants })
    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  socket.on(SOCKET_EVENTS.PLAYBACK_BROADCAST, async (data: PlaybackBroadcastPayload) => {
    const tabId = onYouTubeTabNeeded ? await onYouTubeTabNeeded() : null
    if (tabId !== null) {
      chrome.tabs.sendMessage(tabId, {
        type: 'APPLY_PLAYBACK',
        action: data.action,
        currentTime: data.currentTime,
      }).catch(() => {})
    }
  })

  socket.on(SOCKET_EVENTS.PONG, () => {
    const latencyMs = Math.round((Date.now() - pingSentAt) / 2)
    patchState({ latencyMs })
    notifyPopup({ type: 'STATE_UPDATE', state })
  })

  return socket
}

export function startPingInterval(): void {
  stopPingInterval()
  pingInterval = setInterval(() => {
    if (!state.isInRoom || !socket?.connected) return
    pingSentAt = Date.now()
    socket.emit(SOCKET_EVENTS.PING)
  }, 10_000)
}

export function stopPingInterval(): void {
  if (pingInterval !== null) {
    clearInterval(pingInterval)
    pingInterval = null
  }
}

export function disconnectSocket(): void {
  stopPingInterval()
  socket?.removeAllListeners()
  socket?.disconnect()
  socket = null
}
