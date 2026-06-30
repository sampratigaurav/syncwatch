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

let activeYouTubeTabId: number | null = null
let driftInterval: ReturnType<typeof setInterval> | null = null

// ─── Offscreen Document ────────────────────────────────────────────────────────

let creatingOffscreen: Promise<void> | null = null;
async function setupOffscreenDocument() {
  const hasDocument = await chrome.offscreen.hasDocument();
  if (hasDocument) return;

  if (creatingOffscreen) {
    await creatingOffscreen;
  } else {
    creatingOffscreen = chrome.offscreen.createDocument({
      url: 'src/offscreen/index.html',
      reasons: [chrome.offscreen.Reason.WEB_RTC, chrome.offscreen.Reason.USER_MEDIA],
      justification: 'Background WebRTC connection and voice chat handling'
    });
    await creatingOffscreen;
    creatingOffscreen = null;
  }
}

// ─── Wake-readiness gate ──────────────────────────────────────────────────────
// Message handlers must await this before reading state, so they don't race
// against onWake()'s async storage read.
let wakeReady: Promise<void>

async function onWake(): Promise<void> {
  const stored = await loadState()
  patchState(stored)

  if (stored.roomId && stored.nickname) {
    await setupOffscreenDocument()
    initSocket(getYouTubeTabId)
    startPingInterval()
    if (stored.role === 'host') startDriftCorrection()
  }
}

wakeReady = onWake().catch(console.error) as Promise<void>

// ─── SHA-256 ──────────────────────────────────────────────────────────────────

async function sha256Hex(text: string): Promise<string> {
  const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
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

// (Script injection is not done programmatically — loader filenames are
// content-hashed and change each build.  The popup's PING probe already
// tells the user to refresh their YouTube tab if the content script is
// absent, which is the correct and reliable fix.)

// ─── Drift correction (host only, every 5 s) ─────────────────────────────────

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
        if (chrome.runtime.lastError || response?.currentTime === undefined) return
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

// ─── Keep-alive port ──────────────────────────────────────────────────────────

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'keepAlive') return
  port.onDisconnect.addListener(() => {
    // Content script tab closed — port gone
  })
})

// ─── Main message handler ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (r: MessageResponse | ExtensionState | { pong: true }) => void,
  ) => {
    if (sender.tab?.id && sender.url?.includes('youtube.com')) {
      activeYouTubeTabId = sender.tab.id
    }

    const handle = async (): Promise<void> => {
      // Wait for state to be restored from storage before handling any message.
      await wakeReady

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
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = (await res.json()) as { roomId: string }
            roomId = data.roomId
          } catch (e) {
            console.error('[SW] CREATE_ROOM fetch failed', e)
            sendResponse({ success: false, error: 'Failed to create room' })
            return
          }

          await setupOffscreenDocument()
          const socket = initSocket(getYouTubeTabId)
          socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, nickname: message.nickname })

          patchState({ roomId, nickname: message.nickname, role: 'host', isInRoom: true, connectionStatus: 'connecting' })
          await saveState({ roomId, nickname: message.nickname, role: 'host', connectionStatus: 'connecting', videoId: getState().videoId, socketId: null })

          startPingInterval()
          startDriftCorrection()

          const vid = getState().videoId
          if (vid) {
            const hash = await sha256Hex(vid)
            socket.emit(SOCKET_EVENTS.FILE_VERIFIED, { hash, name: `YouTube: ${vid}`, size: 0 })
          }

          sendResponse({ success: true, roomId })
          notifyPopup({ type: 'STATE_UPDATE', state: getState() })
          break
        }

        // ── JOIN_ROOM ──────────────────────────────────────────────────────
        case 'JOIN_ROOM': {
          try {
            const res = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(message.roomId)}/exists`)
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const data = (await res.json()) as { exists: boolean }
            if (!data.exists) { sendResponse({ success: false, error: 'Room not found' }); return }
          } catch (e) {
            console.error('[SW] JOIN_ROOM check failed', e)
            sendResponse({ success: false, error: 'Could not reach server' })
            return
          }

          await setupOffscreenDocument()
          const socket = initSocket(getYouTubeTabId)
          socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId: message.roomId, nickname: message.nickname })

          patchState({ roomId: message.roomId, nickname: message.nickname, role: 'viewer', isInRoom: true, connectionStatus: 'connecting' })
          await saveState({ roomId: message.roomId, nickname: message.nickname, role: 'viewer', connectionStatus: 'connecting', videoId: getState().videoId, socketId: null })

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

        // ── PLAYBACK_EVENT ─────────────────────────────────────────────────
        case 'PLAYBACK_EVENT': {
          const state = getState()
          if (!state.isInRoom) {
            console.warn('[SW] PLAYBACK_EVENT dropped — not in room')
            break
          }
          const socket = getSocket()
          if (!socket) {
            console.warn('[SW] PLAYBACK_EVENT dropped — no socket')
            break
          }
          // Emit regardless of socket.connected — socket.io buffers until connected.
          console.log('[SW] Emitting playback_event', message.action, message.currentTime)
          socket.emit(SOCKET_EVENTS.PLAYBACK_EVENT, {
            action: message.action,
            currentTime: message.currentTime,
            timestamp: message.timestamp,
          })
          break
        }

        // ── PLAYER_READY ───────────────────────────────────────────────────
        case 'PLAYER_READY': {
          if (sender.tab?.id) activeYouTubeTabId = sender.tab.id
          patchState({ videoId: message.videoId })
          await saveState({ videoId: message.videoId })
          console.log('[SW] Player ready, videoId:', message.videoId)

          const socket = getSocket()
          if (socket) {
            const hash = await sha256Hex(message.videoId)
            socket.emit(SOCKET_EVENTS.FILE_VERIFIED, { hash, name: `YouTube: ${message.videoId}`, size: 0 })
          }
          break
        }

        default:
          break
      }
    }

    handle().catch(console.error)
    return true
  },
)
