// shared/types.ts

export type ParticipantRole = 'host' | 'viewer'
export type ParticipantStatus = 'ready' | 'buffering' | 'disconnected'

export interface Participant {
  id: string
  nickname: string
  role: ParticipantRole
  status: ParticipantStatus
  fileHash: string | null
  latencyMs: number
  joinedAt: number
}

export interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  lastUpdatedAt: number
  hostId: string
  lastActionBy?: string
  lastActionNickname?: string
}

export type ControlPolicy = 'host_only' | 'everyone' | 'selected'

export interface RoomState {
  id: string
  createdAt: number
  playback: PlaybackState
  participants: Map<string, Participant>
  chatHistory: ChatMessage[]
  fileHash: string | null
  fileName: string | null
  fileSize: number | null
  controlPolicy: ControlPolicy
  controllerIds: string[]
}

export interface SetControlPolicyPayload {
  policy: ControlPolicy
  controllerIds: string[]
}

export interface ChatMessage {
  id: string
  senderId: string
  senderNickname: string
  text: string
  timestamp: number
}

export type PlaybackAction = 'play' | 'pause' | 'seek' | 'sync_check'

export interface PlaybackEvent {
  action: PlaybackAction
  currentTime: number
  timestamp: number
  lastActionBy?: string
  lastActionNickname?: string
}

export interface FileVerifyPayload {
  hash: string
  name: string
  size: number
}
