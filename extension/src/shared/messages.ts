export type Participant = {
  id: string
  nickname: string
  role: 'host' | 'viewer'
  latencyMs: number
}

export type ExtensionState = {
  roomId: string | null
  nickname: string
  role: 'host' | 'viewer' | null
  participants: Participant[]
  connectionStatus: 'connected' | 'connecting' | 'disconnected'
  latencyMs: number
  isInRoom: boolean
  videoId: string | null
}

export const DEFAULT_STATE: ExtensionState = {
  roomId: null,
  nickname: '',
  role: null,
  participants: [],
  connectionStatus: 'disconnected',
  latencyMs: 0,
  isInRoom: false,
  videoId: null,
}

export type ExtensionMessage =
  | { type: 'CREATE_ROOM'; nickname: string }
  | { type: 'JOIN_ROOM'; roomId: string; nickname: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'GET_STATE' }
  | { type: 'PLAYBACK_EVENT'; action: string; currentTime: number; timestamp: number }
  | { type: 'REACTION'; emoji: string }
  | { type: 'STATE_UPDATE'; state: ExtensionState }
  | { type: 'APPLY_PLAYBACK'; action: string; currentTime: number }
  | { type: 'PLAYER_READY'; videoId: string }
  | { type: 'PLAYER_NOT_FOUND' }
  | { type: 'GET_CURRENT_TIME' }
  | { type: 'CURRENT_TIME_RESPONSE'; currentTime: number }

export type MessageResponse =
  | { success: true; roomId?: string }
  | { success: false; error: string }
