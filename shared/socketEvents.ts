export const EVENTS = {
  // client → server
  JOIN_ROOM: 'join_room',
  FILE_VERIFIED: 'file_verified',
  PLAYBACK_EVENT: 'playback_event',
  BUFFERING_STATE: 'buffering_state',
  CHAT_MESSAGE: 'chat_message',
  PING: 'ping',
  TRANSFER_HOST: 'transfer_host',
  COUNTDOWN_START: 'countdown_start',
  COUNTDOWN_CANCEL: 'countdown_cancel',

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
  HOST_TRANSFERRED: 'host_transferred',
  COUNTDOWN_BROADCAST: 'countdown_broadcast',
  COUNTDOWN_CANCELLED: 'countdown_cancelled',
} as const;
