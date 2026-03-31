import crypto from 'crypto';
import { Server, Socket } from 'socket.io';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';
import { lastReactionTimes } from './state';

const ALLOWED_EMOJIS = ['😂', '❤️', '😮', '😭', '🔥', '👏', '😍', '💀', '🤯', '👀'];
const REACTION_DEBOUNCE_MS = 2000;

export function registerReactions(io: Server, socket: Socket) {
  socket.on(EVENTS.SEND_REACTION, (payload: { emoji: string }) => {
    if (!ALLOWED_EMOJIS.includes(payload.emoji)) return;

    const now = Date.now();
    if (now - (lastReactionTimes.get(socket.id) || 0) < REACTION_DEBOUNCE_MS) return;

    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    const participant = room.participants.get(socket.id);
    if (!participant) return;

    lastReactionTimes.set(socket.id, now);

    io.to(roomId).emit(EVENTS.REACTION_BROADCAST, {
      emoji: payload.emoji,
      senderId: socket.id,
      senderNickname: participant.nickname,
      id: crypto.randomUUID()
    });
  });
}
