export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join_room',
  PLAYBACK_EVENT: 'playback_event',
  PLAYBACK_BROADCAST: 'playback_broadcast',
  FILE_VERIFIED: 'file_verified',
  PARTICIPANT_UPDATE: 'participant_update',
  ROOM_STATE: 'room_state',
  PING: 'ping',
  PONG: 'pong',
  CHAT_MESSAGE: 'chat_message',
  CHAT_BROADCAST: 'chat_broadcast',
  SEND_REACTION: 'send_reaction',
  REACTION_BROADCAST: 'reaction_broadcast',
  VOICE_JOIN: 'voice_join',
  VOICE_LEAVE: 'voice_leave',
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc_ice_candidate',
} as const

export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS]
