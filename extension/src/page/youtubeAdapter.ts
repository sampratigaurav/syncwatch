/**
 * YouTube player adapter — runs in MAIN world.
 *
 * Has direct access to YouTube's JavaScript player element.
 * Detects play/pause/seek events and forwards them to the content script
 * via window.postMessage.  Applies remote events received from the content
 * script back onto the player, with echo-suppression to prevent loops.
 */

// ─── YouTube player typings (subset we use) ──────────────────────────────────

interface YTPlayer extends HTMLElement {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  getVideoData(): { video_id: string; title: string }
}

const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

// ─── Echo-suppression flag ────────────────────────────────────────────────────

let isApplyingRemoteEvent = false

// ─── Module-level player + poll handle references ────────────────────────────

let player: YTPlayer | null = null
let pollHandle: ReturnType<typeof setInterval> | null = null
let lastPlayerState: number | null = null
let lastReportedTime = 0

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initYouTubeAdapter(): void {
  trackNavigation()
  waitForPlayer()
}

// ─── Navigation tracker (YouTube is a SPA) ───────────────────────────────────

function trackNavigation(): void {
  let lastVideoId = new URL(window.location.href).searchParams.get('v') ?? ''

  setInterval(() => {
    const videoId = new URL(window.location.href).searchParams.get('v') ?? ''
    if (videoId && videoId !== lastVideoId) {
      lastVideoId = videoId
      // Player element may have changed after navigation — reinitialise
      if (pollHandle !== null) {
        clearInterval(pollHandle)
        pollHandle = null
      }
      player = null
      waitForPlayer()
    }
  }, 1_000)
}

// ─── Player discovery ─────────────────────────────────────────────────────────

function waitForPlayer(maxAttempts = 30): void {
  let attempts = 0

  const interval = setInterval(() => {
    const el = document.querySelector('#movie_player') as YTPlayer | null

    if (el && typeof el.getCurrentTime === 'function') {
      clearInterval(interval)
      player = el
      onPlayerReady(el)
      return
    }

    if (++attempts >= maxAttempts) {
      clearInterval(interval)
      window.postMessage({ source: 'SYNCWATCH_PAGE', type: 'PLAYER_NOT_FOUND' }, '*')
    }
  }, 1_000)
}

// ─── Player ready callback ────────────────────────────────────────────────────

function onPlayerReady(p: YTPlayer): void {
  const videoId = p.getVideoData().video_id

  window.postMessage(
    { source: 'SYNCWATCH_PAGE', type: 'PLAYER_READY', videoId },
    '*',
  )

  lastPlayerState = p.getPlayerState()
  lastReportedTime = p.getCurrentTime()

  startPolling(p)
}

// ─── State-change polling (500 ms) ───────────────────────────────────────────

function startPolling(p: YTPlayer): void {
  if (pollHandle !== null) clearInterval(pollHandle)

  pollHandle = setInterval(() => {
    if (isApplyingRemoteEvent) return

    const state = p.getPlayerState()
    const currentTime = p.getCurrentTime()

    // Play / pause transitions
    if (state !== lastPlayerState) {
      if (state === YT_STATE.PLAYING) {
        emitPlayback('play', currentTime)
      } else if (state === YT_STATE.PAUSED) {
        emitPlayback('pause', currentTime)
      }
      lastPlayerState = state
    }

    // Seek detection: large jump in current time while not buffering
    if (
      state !== YT_STATE.BUFFERING &&
      Math.abs(currentTime - lastReportedTime) > 1.5
    ) {
      emitPlayback('seek', currentTime)
    }

    lastReportedTime = currentTime
  }, 500)
}

function emitPlayback(action: string, currentTime: number): void {
  if (isApplyingRemoteEvent) return
  window.postMessage(
    {
      source: 'SYNCWATCH_PAGE',
      type: 'PLAYBACK_EVENT',
      action,
      currentTime,
      timestamp: Date.now(),
    },
    '*',
  )
  lastReportedTime = currentTime
}

// ─── Apply remote event ───────────────────────────────────────────────────────

function applyRemote(action: string, currentTime: number): void {
  if (!player) return

  isApplyingRemoteEvent = true

  if (action === 'play') {
    player.playVideo()
  } else if (action === 'pause') {
    player.pauseVideo()
  } else if (action === 'seek' || action === 'sync_check') {
    const diff = Math.abs(player.getCurrentTime() - currentTime)
    if (action === 'seek' || diff > 0.5) {
      player.seekTo(currentTime, true)
    }
  }

  // Reset flag after the current event loop tick so our own poll doesn't fire
  setTimeout(() => {
    isApplyingRemoteEvent = false
  }, 0)
}

// ─── Listen for messages from content script ─────────────────────────────────

window.addEventListener('message', (event: MessageEvent<unknown>) => {
  if (!isContentMessage(event.data)) return

  if (event.data.type === 'APPLY_PLAYBACK') {
    applyRemote(event.data.action, event.data.currentTime)
    return
  }

  if (event.data.type === 'GET_CURRENT_TIME') {
    const currentTime = player?.getCurrentTime() ?? 0
    window.postMessage(
      {
        source: 'SYNCWATCH_PAGE',
        type: 'CURRENT_TIME_RESPONSE',
        currentTime,
      },
      '*',
    )
    return
  }
})

// ─── Type guards ──────────────────────────────────────────────────────────────

type ApplyPlaybackMsg = {
  source: 'SYNCWATCH_CONTENT'
  type: 'APPLY_PLAYBACK'
  action: string
  currentTime: number
}

type GetCurrentTimeMsg = {
  source: 'SYNCWATCH_CONTENT'
  type: 'GET_CURRENT_TIME'
}

type ContentMessage = ApplyPlaybackMsg | GetCurrentTimeMsg

function isContentMessage(data: unknown): data is ContentMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>)['source'] === 'SYNCWATCH_CONTENT'
  )
}
