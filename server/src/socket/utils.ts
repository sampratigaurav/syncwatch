import { Socket } from 'socket.io';
import crypto from 'crypto';
import { RoomState } from '../../../shared/types';
import { EVENTS } from '../../../shared/socketEvents';
import { reconnectTokens, socketToToken } from './state';
import { getRoom } from '../rooms/RoomManager';

export function getClientIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    return ips[ips.length - 1] ?? socket.handshake.address;
  }
  return socket.handshake.address;
}

export function canControl(room: RoomState, socketId: string): boolean {
  if (room.controlPolicy === 'everyone') return true;
  if (room.controlPolicy === 'host_only') {
    return room.playback.hostId === socketId;
  }
  if (room.controlPolicy === 'selected') {
    return (
      room.playback.hostId === socketId ||
      room.controllerIds.includes(socketId)
    );
  }
  return false;
}

export function issueReconnectToken(socket: Socket, roomId: string, nickname: string, role: 'host' | 'viewer') {
  const oldToken = socketToToken.get(socket.id);
  if (oldToken) reconnectTokens.delete(oldToken);

  const token = crypto.randomBytes(32).toString('hex');
  reconnectTokens.set(token, { roomId, nickname, role });
  socketToToken.set(socket.id, token);
  socket.emit(EVENTS.RECONNECT_TOKEN, { token });
}

export function revokeReconnectToken(socketId: string) {
  const token = socketToToken.get(socketId);
  if (token) {
    reconnectTokens.delete(token);
    socketToToken.delete(socketId);
  }
}
