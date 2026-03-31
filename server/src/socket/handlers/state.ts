// Shared in-memory state used across all socket handler modules
import { Socket } from 'socket.io';
import crypto from 'crypto';
import { EVENTS } from '../../../../shared/socketEvents';

// Keyed by socket.id — tracks pending disconnect grace-period timers
export const disconnectTimers = new Map<string, NodeJS.Timeout>();

// Keyed by roomId — tracks buffering auto-pause timers
export const bufferingTimers = new Map<string, NodeJS.Timeout>();

// Keyed by socket.id — last reaction timestamp for per-socket debouncing
export const lastReactionTimes = new Map<string, number>();

// Keyed by IP — PIN attempt timestamps (not socket.id, to prevent bypass via reconnect)
export const pinAttemptTimes = new Map<string, number[]>();

// Keyed by socket.id — recent chat timestamps for rate-limiting
export const lastChatTimes = new Map<string, number[]>();

// Reconnect tokens: token → { roomId, nickname, role }
export const reconnectTokens = new Map<string, { roomId: string; nickname: string; role: 'host' | 'viewer' }>();

// Maps socket.id → its current reconnect token so we can clean up on removal
export const socketToToken = new Map<string, string>();

/** Issue a fresh reconnect token and send it to the socket. */
export function issueReconnectToken(socket: Socket, roomId: string, nickname: string, role: 'host' | 'viewer') {
  const oldToken = socketToToken.get(socket.id);
  if (oldToken) reconnectTokens.delete(oldToken);

  const token = crypto.randomBytes(32).toString('hex');
  reconnectTokens.set(token, { roomId, nickname, role });
  socketToToken.set(socket.id, token);
  socket.emit(EVENTS.RECONNECT_TOKEN, { token });
}

/** Remove all reconnect tokens belonging to a given socket. */
export function revokeReconnectToken(socketId: string) {
  const token = socketToToken.get(socketId);
  if (token) {
    reconnectTokens.delete(token);
    socketToToken.delete(socketId);
  }
}
