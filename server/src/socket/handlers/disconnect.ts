import { Server, Socket } from 'socket.io';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';
import { Participant } from '../../../../shared/types';
import {
  disconnectTimers,
  lastReactionTimes,
  lastChatTimes,
  revokeReconnectToken,
} from './state';

export function registerDisconnect(io: Server, socket: Socket) {
  socket.on('disconnect', () => {
    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }

    if (!roomId) {
      revokeReconnectToken(socket.id);
      lastReactionTimes.delete(socket.id);
      lastChatTimes.delete(socket.id);
      return;
    }

    const room = rooms.get(roomId)!;
    const disconnectedParticipant = room.participants.get(socket.id);
    if (!disconnectedParticipant) return;

    disconnectedParticipant.status = 'disconnected';

    if (room.voiceParticipants) {
      const prevLen = room.voiceParticipants.length;
      room.voiceParticipants = room.voiceParticipants.filter(p => p.id !== socket.id);
      if (room.voiceParticipants.length !== prevLen) {
        io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
      }
    }

    io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, disconnectedParticipant);

    // Keep the slot alive for 30 seconds to allow reconnect token reclaim
    const timer = setTimeout(() => {
      const p = room.participants.get(socket.id);
      if (p && p.status === 'disconnected') {
        room.participants.delete(socket.id);
        revokeReconnectToken(socket.id);
        const removedParticipant: Participant = { ...p, status: 'removed' };
        io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, removedParticipant);
        if (p.role === 'host') io.to(roomId).emit(EVENTS.HOST_LEFT);
        if (room.participants.size === 0) rooms.delete(roomId);
      }
      disconnectTimers.delete(socket.id);
    }, 30_000);

    disconnectTimers.set(socket.id, timer);
    lastReactionTimes.delete(socket.id);
    lastChatTimes.delete(socket.id);
    // pinAttemptTimes is keyed by IP, not socket.id — no cleanup needed here
  });
}
