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
} as const;
