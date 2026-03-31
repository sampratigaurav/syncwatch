import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';
import { Participant } from '../../../../shared/types';
import {
  disconnectTimers,
  pinAttemptTimes,
  reconnectTokens,
  socketToToken,
  issueReconnectToken,
} from './state';

const MAX_NICKNAME_LENGTH = 50;
const MAX_PIN_ATTEMPTS = 5;
const PIN_WINDOW_MS = 60_000;

function getClientIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    return ips[ips.length - 1] ?? socket.handshake.address;
  }
  return socket.handshake.address;
}

export function registerJoinRoom(io: Server, socket: Socket) {
  socket.on(EVENTS.JOIN_ROOM, (payload: { roomId: string; nickname: string; password?: string; reconnectToken?: string }) => {
    const { roomId, nickname, password, reconnectToken } = payload;

    if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 1 || nickname.length > MAX_NICKNAME_LENGTH) {
      socket.emit('error', { message: 'Nickname must be 1-50 characters' });
      return;
    }

    const room = rooms.get(roomId);
    if (!room) {
      socket.emit(EVENTS.ROOM_NOT_FOUND, { roomId });
      return;
    }

    if (room.hasPassword) {
      if (!password) {
        socket.emit(EVENTS.ROOM_REQUIRES_PASSWORD, { roomId });
        return;
      }

      const ip = getClientIp(socket);
      const now = Date.now();
      const recentAttempts = (pinAttemptTimes.get(ip) || []).filter(t => now - t < PIN_WINDOW_MS);
      if (recentAttempts.length >= MAX_PIN_ATTEMPTS) {
        socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Too many attempts. Please wait before trying again.' });
        return;
      }

      const hash = crypto.pbkdf2Sync(password, room.passwordSalt!, 100_000, 32, 'sha256').toString('hex');
      if (hash !== room.password) {
        recentAttempts.push(now);
        pinAttemptTimes.set(ip, recentAttempts);
        socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Incorrect PIN' });
        return;
      }
      pinAttemptTimes.delete(ip);
    }

    if (disconnectTimers.has(socket.id)) {
      clearTimeout(disconnectTimers.get(socket.id));
      disconnectTimers.delete(socket.id);
    }

    if (room.participants.size >= 5 && !room.participants.has(socket.id)) {
      socket.emit('error', { message: 'Room is full (max 5 participants)' });
      return;
    }

    socket.join(roomId);

    const isNewSocket = !room.participants.has(socket.id);
    let existing = room.participants.get(socket.id);

    if (!existing) {
      if (reconnectToken && typeof reconnectToken === 'string') {
        const tokenData = reconnectTokens.get(reconnectToken);
        if (tokenData && tokenData.roomId === roomId && tokenData.nickname === nickname) {
          const disconnectedMatch = Array.from(room.participants.values()).find(
            p => p.nickname === nickname && p.status === 'disconnected'
          );
          if (disconnectedMatch) {
            room.participants.delete(disconnectedMatch.id);
            existing = disconnectedMatch;
            if (disconnectTimers.has(disconnectedMatch.id)) {
              clearTimeout(disconnectTimers.get(disconnectedMatch.id));
              disconnectTimers.delete(disconnectedMatch.id);
            }
          }
          reconnectTokens.delete(reconnectToken);
          socketToToken.delete(socket.id);
        }
      }
    }

    let role: 'host' | 'viewer';
    if (existing) {
      role = existing.role;
      if (role === 'host') room.playback.hostId = socket.id;
    } else {
      const hasHost = Array.from(room.participants.values()).some(p => p.role === 'host');
      role = hasHost ? 'viewer' : 'host';
      if (role === 'host') room.playback.hostId = socket.id;
    }

    const participant: Participant = {
      id: socket.id,
      nickname,
      role,
      status: (existing && !isNewSocket) ? existing.status : 'disconnected',
      fileHash: (existing && !isNewSocket) ? existing.fileHash : null,
      latencyMs: existing ? existing.latencyMs : 0,
      joinedAt: existing ? existing.joinedAt : Date.now()
    };

    room.participants.set(socket.id, participant);
    issueReconnectToken(socket, roomId, nickname, role);

    const roomStatePayload = {
      ...room,
      participants: Array.from(room.participants.values())
    };
    delete (roomStatePayload as any).password;
    delete (roomStatePayload as any).passwordSalt;
    delete (roomStatePayload as any).chatHistory;

    socket.emit(EVENTS.ROOM_STATE, roomStatePayload);
    socket.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
  });
}
