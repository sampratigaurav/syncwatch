import crypto from 'crypto';
import { Server, Socket } from 'socket.io';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';
import { lastChatTimes } from './state';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_CHAT_PER_WINDOW = 5;
const CHAT_WINDOW_MS = 3_000;

export function registerChat(io: Server, socket: Socket) {
  socket.on(EVENTS.PING, (payload: { sentAt: number }) => {
    socket.emit(EVENTS.PONG, payload);
  });

  socket.on(EVENTS.CHAT_MESSAGE, (payload: { text: string }) => {
    if (!payload.text || typeof payload.text !== 'string') return;
    const trimmed = payload.text.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return;

    const now = Date.now();
    const recentChats = (lastChatTimes.get(socket.id) || []).filter(t => now - t < CHAT_WINDOW_MS);
    if (recentChats.length >= MAX_CHAT_PER_WINDOW) return;
    recentChats.push(now);
    lastChatTimes.set(socket.id, recentChats);

    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    const participant = room.participants.get(socket.id);
    if (!participant) return;

    const message = {
      id: crypto.randomUUID(),
      senderId: participant.id,
      senderNickname: participant.nickname,
      text: trimmed,
      timestamp: Date.now()
    };

    room.chatHistory.push(message);
    if (room.chatHistory.length > 100) room.chatHistory.shift();

    io.to(roomId).emit(EVENTS.CHAT_BROADCAST, message);
  });
}
