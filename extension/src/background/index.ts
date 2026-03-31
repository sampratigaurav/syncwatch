import {
  initSocket,
  getSocket,
  getState,
  patchState,
  notifyPopup,
  disconnectSocket,
  startPingInterval,
} from './socketClient'
import { saveState, loadState, clearState } from './stateManager'
import { SOCKET_EVENTS } from '../shared/events'
import { DEFAULT_STATE } from '../shared/messages'
import type { ExtensionMessage, MessageResponse, ExtensionState } from '../shared/messages'

const SERVER_URL = 'https://syncwatch-backend-vwk3.onrender.com'

// The YouTube tab we are currently syncing
let activeYouTubeTabId: number | null = null

// Drift correction interval handle
let driftInterval: ReturnType<typeof setInterval> | null = null

// ─── SHA-256 via Web Crypto ───────────────────────────────────────────────────

async function sha256Hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  )
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// ─── YouTube tab helpers ──────────────────────────────────────────────────────

async function getYouTubeTabId(): Promise<number | null> {
  if (activeYouTubeTabId !== null) {
    try {
      const tab = await chrome.tabs.get(activeYouTubeTabId)
      if (tab.url?.includes('youtube.com/watch')) return activeYouTubeTabId
    } catch {
      activeYouTubeTabId = null
    }
  }
  const tabs = await chrome.tabs.query({
    url: ['https://www.youtube.com/watch*', 'https://youtube.com/watch*'],
  })
  if (tabs[0]?.id !== undefined) {
    activeYouTubeTabId = tabs[0].id
    return tabs[0].id
  }
  return null
}

// ─── Drift correction (host only) ────────────────────────────────────────────

function startDriftCorrection(): void {
  if (driftInterval !== null) clearInterval(driftInterval)

  driftInterval = setInterval(async () => {
    const state = getState()
    if (!state.isInRoom || state.role !== 'host') return

    const tabId = await getYouTubeTabId()
    if (tabId === null) return

    chrome.tabs.sendMessage(
      tabId,
      { type: 'GET_CURRENT_TIME' } satisfies ExtensionMessage,
      (response: { currentTime: number } | undefined) => {
        if (chrome.runtime.lastError) return
        if (response?.currentTime === undefined) return

        const socket = getSocket()
        if (socket?.connected) {
          socket.emit(SOCKET_EVENTS.PLAYBACK_EVENT, {
            action: 'sync_check',
            currentTime: response.currentTime,
            timestamp: Date.now(),
          })
        }
      },
    )
  }, 5_000)
}

function stopDriftCorrection(): void {
  if (driftInterval !== null) {
    clearInterval(driftInterval)
    driftInterval = null
  }
}

// ─── Service-worker wake handler ─────────────────────────────────────────────

async function onWake(): Promise<void> {
  const stored = await loadState()
  patchState(stored)

  if (stored.roomId && stored.nickname) {
    initSocket(getYouTubeTabId)
    startPingInterval()
    if (stored.role === 'host') startDriftCorrection()
  }
}

onWake().catch(console.error)

// ─── Keep-alive port (prevents service worker sleep while content is open) ───

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'keepAlive') return
  port.onDisconnect.addListener(() => {
    // Content script disconnected — port closed, worker may sleep
  })
})

// ─── Main message router ──────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (r: MessageResponse | ExtensionState) => void,
  ) => {
    // Track the YouTube tab that sent this message
    if (sender.tab?.id && sender.url?.includes('youtube.com')) {
      activeYouTubeTabId = sender.tab.id
    }

    const handle = async (): Promise<void> => {
      switch (message.type) {
        // ── CREATE_ROOM ────────────────────────────────────────────────────
        case 'CREATE_ROOM': {
          let roomId: string
          try {
            const res = await fetch(`${SERVER_URL}/api/rooms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
            if (!res.ok) throw new Error('Server error')
            const data = (await res.json()) as { roomId: string }
            roomId = data.roomId
          } catch {
            sendResponse({ success: false, error: 'Failed to create room' })
            return
          }

          const socket = initSocket(getYouTubeTabId)
          socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
            roomId,
            nickname: message.nickname,
          })

          patchState({
            roomId,
            nickname: message.nickname,
            role: 'host',
            isInRoom: true,
            connectionStatus: 'connecting',
          })

          await saveState({
            roomId,
            nickname: message.nickname,
            role: 'host',
            connectionStatus: 'connecting',
            videoId: getState().videoId,
            socketId: null,
          })

          startPingInterval()
          startDriftCorrection()

          // Emit file_verified for already-detected video
          const vid = getState().videoId
          if (vid && socket.connected) {
            const hash = await sha256Hex(vid)
            socket.emit(SOCKET_EVENTS.FILE_VERIFIED, {
              hash,
              name: `YouTube: ${vid}`,
              size: 0,
            })
          }

          sendResponse({ success: true, roomId })
          notifyPopup({ type: 'STATE_UPDATE', state: getState() })
          break
        }

        // ── JOIN_ROOM ──────────────────────────────────────────────────────
        case 'JOIN_ROOM': {
          try {
            const res = await fetch(
              `${SERVER_URL}/api/rooms/${encodeURIComponent(message.roomId)}/exists`,
            )
            if (!res.ok) throw new Error('Network error')
            const data = (await res.json()) as { exists: boolean }
            if (!data.exists) {
              sendResponse({ success: false, error: 'Room not found' })
              return
            }
          } catch {
            sendResponse({ success: false, error: 'Could not reach server' })
            return
          }

          const socket = initSocket(getYouTubeTabId)
          socket.emit(SOCKET_EVENTS.JOIN_ROOM, {
            roomId: message.roomId,
            nickname: message.nickname,
          })

          patchState({
            roomId: message.roomId,
            nickname: message.nickname,
            role: 'viewer',
            isInRoom: true,
            connectionStatus: 'connecting',
          })

          await saveState({
            roomId: message.roomId,
            nickname: message.nickname,
            role: 'viewer',
            connectionStatus: 'connecting',
            videoId: getState().videoId,
            socketId: null,
          })

          startPingInterval()

          sendResponse({ success: true })
          notifyPopup({ type: 'STATE_UPDATE', state: getState() })
          break
        }

        // ── LEAVE_ROOM ─────────────────────────────────────────────────────
        case 'LEAVE_ROOM': {
          stopDriftCorrection()
          disconnectSocket()
          await clearState()
          patchState({ ...DEFAULT_STATE })
          sendResponse({ success: true })
          notifyPopup({ type: 'STATE_UPDATE', state: getState() })
          break
        }

        // ── GET_STATE ──────────────────────────────────────────────────────
        case 'GET_STATE': {
          sendResponse(getState())
          break
        }

        // ── PLAYBACK_EVENT (from content → background → socket) ────────────
        case 'PLAYBACK_EVENT': {
          const state = getState()
          if (!state.isInRoom) break

          const socket = getSocket()
          if (socket?.connected) {
            socket.emit(SOCKET_EVENTS.PLAYBACK_EVENT, {
              action: message.action,
              currentTime: message.currentTime,
              timestamp: message.timestamp,
            })
          }
          break
        }

        // ── PLAYER_READY (YouTube player detected) ─────────────────────────
        case 'PLAYER_READY': {
          if (sender.tab?.id) activeYouTubeTabId = sender.tab.id

          patchState({ videoId: message.videoId })
          await saveState({ videoId: message.videoId })

          const socket = getSocket()
          if (socket?.connected) {
            const hash = await sha256Hex(message.videoId)
            socket.emit(SOCKET_EVENTS.FILE_VERIFIED, {
              hash,
              name: `YouTube: ${message.videoId}`,
              size: 0,
            })
          }
          break
        }

        default:
          break
      }
    }

    handle().catch(console.error)
    return true // keep message channel open for async sendResponse
  },
)
