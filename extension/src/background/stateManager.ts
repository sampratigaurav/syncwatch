import { DEFAULT_STATE } from '../shared/messages'
import type { ExtensionState } from '../shared/messages'

type PersistedState = {
  roomId: string | null
  nickname: string
  role: 'host' | 'viewer' | null
  socketId: string | null
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  videoId: string | null
}

export async function saveState(partial: Partial<PersistedState>): Promise<void> {
  await chrome.storage.session.set(partial as Record<string, unknown>)
}

export async function loadState(): Promise<ExtensionState> {
  const stored = (await chrome.storage.session.get([
    'roomId',
    'nickname',
    'role',
    'connectionStatus',
    'videoId',
  ])) as Partial<PersistedState>

  return {
    ...DEFAULT_STATE,
    roomId: stored.roomId ?? null,
    nickname: stored.nickname ?? '',
    role: stored.role ?? null,
    // Always start as connecting/disconnected on wake — socket will update this
    connectionStatus: stored.connectionStatus === 'connected' ? 'connecting' : 'disconnected',
    videoId: stored.videoId ?? null,
    isInRoom: !!stored.roomId,
  }
}

export async function clearState(): Promise<void> {
  await chrome.storage.session.clear()
}
