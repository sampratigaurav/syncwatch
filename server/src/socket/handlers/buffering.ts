import { Server, Socket } from 'socket.io';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';
import { bufferingTimers } from './state';

export function registerBuffering(io: Server, socket: Socket) {
  socket.on(EVENTS.BUFFERING_STATE, (payload: { isBuffering: boolean }) => {
    if (!payload || typeof payload.isBuffering !== 'boolean') {
      socket.emit('error', { message: 'Invalid buffering state' });
      return;
    }

    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    const participant = room.participants.get(socket.id);
    if (!participant) return;

    participant.status = payload.isBuffering ? 'buffering' : 'ready';
    io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);

    const anyBuffering = Array.from(room.participants.values()).some(p => p.status === 'buffering');

    if (anyBuffering) {
      if (!bufferingTimers.has(roomId)) {
        const timer = setTimeout(() => {
          const stillBuffering = Array.from(room.participants.values()).some(p => p.status === 'buffering');
          if (stillBuffering) io.to(roomId).emit(EVENTS.FORCE_PAUSE);
          bufferingTimers.delete(roomId);
        }, 500);
        bufferingTimers.set(roomId, timer);
      }
    } else {
      if (bufferingTimers.has(roomId)) {
        clearTimeout(bufferingTimers.get(roomId));
        bufferingTimers.delete(roomId);
      }
      const host = Array.from(room.participants.values()).find(p => p.role === 'host');
      if (host) io.to(host.id).emit(EVENTS.RESUME_ALLOWED);
    }
  });
}
