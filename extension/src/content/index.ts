import type { ExtensionMessage } from '../shared/messages'

// ─── Keep service worker alive ────────────────────────────────────────────────

function connectKeepAlive(): void {
  const port = chrome.runtime.connect({ name: 'keepAlive' })
  port.onDisconnect.addListener(() => { connectKeepAlive() })
}
connectKeepAlive()

// ─── Page → Background relay ──────────────────────────────────────────────────

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!isPageMessage(event.data)) return

  const data = event.data

  if (data.type === 'PLAYER_READY') {
    chrome.runtime.sendMessage(
      { type: 'PLAYER_READY', videoId: data.videoId } satisfies ExtensionMessage
    ).catch(() => {})
    return
  }

  if (data.type === 'PLAYBACK_EVENT') {
    chrome.runtime.sendMessage({
      type: 'PLAYBACK_EVENT',
      action: data.action,
      currentTime: data.currentTime,
      timestamp: data.timestamp,
    } satisfies ExtensionMessage).catch(() => {})
    return
  }
})

// ─── Background → Page relay (+ PING probe) ───────────────────────────────────

chrome.runtime.onMessage.addListener(
  (msg: ExtensionMessage, _sender, sendResponse) => {

    // Health-check probe used by background to see if we're alive.
    if (msg.type === 'PING') {
      sendResponse({ pong: true })
      return false
    }

    if (msg.type === 'APPLY_PLAYBACK') {
      window.postMessage(
        { source: 'SYNCWATCH_CONTENT', type: 'APPLY_PLAYBACK', action: msg.action, currentTime: msg.currentTime },
        '*',
      )
      return false
    }

    if (msg.type === 'GET_CURRENT_TIME') {
      const handler = (event: MessageEvent<unknown>) => {
        if (!isPageMessage(event.data)) return
        if (event.data.type !== 'CURRENT_TIME_RESPONSE') return
        window.removeEventListener('message', handler)
        sendResponse({ currentTime: event.data.currentTime })
      }
      window.addEventListener('message', handler)
      window.postMessage({ source: 'SYNCWATCH_CONTENT', type: 'GET_CURRENT_TIME' }, '*')
      setTimeout(() => window.removeEventListener('message', handler), 1_500)
      return true
    }

    return false
  },
)

// ─── Type guards ──────────────────────────────────────────────────────────────

type PlayerReadyMsg       = { source: 'SYNCWATCH_PAGE'; type: 'PLAYER_READY'; videoId: string }
type PlaybackEventMsg     = { source: 'SYNCWATCH_PAGE'; type: 'PLAYBACK_EVENT'; action: string; currentTime: number; timestamp: number }
type CurrentTimeRespMsg   = { source: 'SYNCWATCH_PAGE'; type: 'CURRENT_TIME_RESPONSE'; currentTime: number }
type PageMessage = PlayerReadyMsg | PlaybackEventMsg | CurrentTimeRespMsg

function isPageMessage(data: unknown): data is PageMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)['source'] === 'SYNCWATCH_PAGE'
  )
}
