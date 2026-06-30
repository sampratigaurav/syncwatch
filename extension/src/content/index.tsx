import React from 'react'
import { createRoot } from 'react-dom/client'
import type { ExtensionMessage } from '../shared/messages'
import tailwindCss from '../styles/tailwind.css?inline'
import Sidebar from './Sidebar'

// ─── Shadow DOM Injection ─────────────────────────────────────────────────────

function injectSidebar() {
  // Wait for the YouTube player container to exist
  const container = document.getElementById('movie_player') || document.body;
  if (container.querySelector('#syncwatch-root')) return;

  const rootEl = document.createElement('div');
  rootEl.id = 'syncwatch-root';
  rootEl.style.position = 'absolute';
  rootEl.style.top = '0';
  rootEl.style.left = '0';
  rootEl.style.width = '100%';
  rootEl.style.height = '100%';
  rootEl.style.zIndex = '999999'; // Ensure it's on top inside #movie_player
  // pointerEvents = none on wrapper so it doesn't block video clicks when closed
  rootEl.style.pointerEvents = 'none'; 
  container.appendChild(rootEl);

  const shadowRoot = rootEl.attachShadow({ mode: 'open' });
  
  const style = document.createElement('style');
  style.textContent = tailwindCss;
  shadowRoot.appendChild(style);
  
  const reactRoot = document.createElement('div');
  reactRoot.style.height = '100%';
  reactRoot.style.pointerEvents = 'auto'; // Re-enable pointer events for the react app
  shadowRoot.appendChild(reactRoot);

  createRoot(reactRoot).render(<Sidebar />);
}

// Observe DOM for the player, as it might load asynchronously in SPA
const observer = new MutationObserver(() => {
  if (document.getElementById('movie_player')) {
    injectSidebar();
  }
});
observer.observe(document.body, { childList: true, subtree: true });
// Also try immediately
injectSidebar();

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
