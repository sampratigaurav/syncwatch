/**
 * Content script — isolated world.
 *
 * Responsibilities:
 *  1. Relay messages between the MAIN-world page script and the background
 *     service worker.
 *  2. Keep the service worker alive via a long-lived chrome.runtime.connect()
 *     port (prevents MV3 worker suspension while the tab is open).
 */

import type { ExtensionMessage } from '../shared/messages'

// ─── Keep-alive port ──────────────────────────────────────────────────────────

function connectKeepAlive(): void {
  const port = chrome.runtime.connect({ name: 'keepAlive' })
  port.onDisconnect.addListener(() => {
    // Reconnect when the background restarts
    connectKeepAlive()
  })
}

connectKeepAlive()

// ─── Page → Background relay ──────────────────────────────────────────────────

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!isPageMessage(event.data)) return

  const data = event.data

  if (data.type === 'PLAYER_READY') {
    chrome.runtime
      .sendMessage({ type: 'PLAYER_READY', videoId: data.videoId } satisfies ExtensionMessage)
      .catch(() => {})
    return
  }

  if (data.type === 'PLAYBACK_EVENT') {
    chrome.runtime
      .sendMessage({
        type: 'PLAYBACK_EVENT',
        action: data.action,
        currentTime: data.currentTime,
        timestamp: data.timestamp,
      } satisfies ExtensionMessage)
      .catch(() => {})
    return
  }
})

// ─── Background → Page relay ──────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (msg: ExtensionMessage, _sender, sendResponse) => {
    if (msg.type === 'APPLY_PLAYBACK') {
      window.postMessage(
        {
          source: 'SYNCWATCH_CONTENT',
          type: 'APPLY_PLAYBACK',
          action: msg.action,
          currentTime: msg.currentTime,
        },
        '*',
      )
      return false
    }

    if (msg.type === 'GET_CURRENT_TIME') {
      // Post to page script, wait for the response, then call sendResponse
      const handler = (event: MessageEvent<unknown>) => {
        if (!isPageMessage(event.data)) return
        if (event.data.type !== 'CURRENT_TIME_RESPONSE') return
        window.removeEventListener('message', handler)
        sendResponse({ currentTime: event.data.currentTime })
      }

      window.addEventListener('message', handler)

      window.postMessage({ source: 'SYNCWATCH_CONTENT', type: 'GET_CURRENT_TIME' }, '*')

      // Safety timeout — avoid leaking the listener
      setTimeout(() => window.removeEventListener('message', handler), 1_500)

      return true // keep message channel open for async sendResponse
    }

    return false
  },
)

// ─── Type guards ──────────────────────────────────────────────────────────────

type PlayerReadyMsg = { source: 'SYNCWATCH_PAGE'; type: 'PLAYER_READY'; videoId: string }
type PlaybackEventMsg = {
  source: 'SYNCWATCH_PAGE'
  type: 'PLAYBACK_EVENT'
  action: string
  currentTime: number
  timestamp: number
}
type CurrentTimeResponseMsg = {
  source: 'SYNCWATCH_PAGE'
  type: 'CURRENT_TIME_RESPONSE'
  currentTime: number
}

type PageMessage = PlayerReadyMsg | PlaybackEventMsg | CurrentTimeResponseMsg

function isPageMessage(data: unknown): data is PageMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)['source'] === 'SYNCWATCH_PAGE'
  )
}
