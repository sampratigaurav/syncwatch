export const EVENTS = {
  // client → server
  JOIN_ROOM: 'join_room',
  FILE_VERIFIED: 'file_verified',
  PLAYBACK_EVENT: 'playback_event',
  BUFFERING_STATE: 'buffering_state',
  CHAT_MESSAGE: 'chat_message',
  PING: 'ping',
  SET_CONTROL_POLICY: 'set_control_policy',

  // server → client
  ROOM_STATE: 'room_state',
  PLAYBACK_BROADCAST: 'playback_broadcast',
  PARTICIPANT_UPDATE: 'participant_update',
  FILE_MISMATCH: 'file_mismatch',
  FILE_MATCH: 'file_match',
  CHAT_BROADCAST: 'chat_broadcast',
  FORCE_PAUSE: 'force_pause',
  RESUME_ALLOWED: 'resume_allowed',
  PONG: 'pong',
  HOST_LEFT: 'host_left',
  CONTROL_POLICY_UPDATE: 'control_policy_update',
  ROOM_NOT_FOUND: 'room_not_found',
  SUBTITLE_STATE_BROADCAST: 'subtitle_state_broadcast',
  WRONG_PASSWORD: 'wrong_password',
  ROOM_REQUIRES_PASSWORD: 'room_requires_password',

  // WebRTC Voice Chat Signalling
  WEBRTC_OFFER: 'webrtc_offer',
  WEBRTC_ANSWER: 'webrtc_answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc_ice_candidate',
  VOICE_JOIN: 'voice_join',
  VOICE_LEAVE: 'voice_leave',
  VOICE_STATE_UPDATE: 'voice_state_update',
  VOICE_MUTE_TOGGLE: 'voice_mute_toggle',
  VOICE_SPEAKING: 'voice_speaking',

  // Reactions
  SEND_REACTION: 'send_reaction',
  REACTION_BROADCAST: 'reaction_broadcast',
} as const;
