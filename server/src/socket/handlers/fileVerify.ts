import { Server, Socket } from 'socket.io';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';

const VALID_HASH_RE = /^[0-9a-f]{64}$/i;
const MAX_FILE_NAME_LENGTH = 255;

export function registerFileVerify(_io: Server, socket: Socket) {
  socket.on(EVENTS.FILE_VERIFIED, (payload: { hash: string; size: number; name: string }) => {
    if (
      !payload ||
      typeof payload.hash !== 'string' || !VALID_HASH_RE.test(payload.hash) ||
      typeof payload.size !== 'number' || !Number.isFinite(payload.size) || payload.size < 0 ||
      typeof payload.name !== 'string' || payload.name.length === 0 || payload.name.length > MAX_FILE_NAME_LENGTH
    ) {
      socket.emit('error', { message: 'Invalid file verification payload' });
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

    if (participant.role === 'host') {
      room.fileHash = payload.hash;
      room.fileName = payload.name;
      room.fileSize = payload.size;
      participant.status = 'ready';
      participant.fileHash = payload.hash;

      socket.emit(EVENTS.FILE_MATCH);
      _io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);

      for (const [vId, viewer] of room.participants.entries()) {
        if (vId !== socket.id && viewer.fileHash) {
          if (viewer.fileHash === payload.hash) {
            viewer.status = 'ready';
            _io.to(vId).emit(EVENTS.FILE_MATCH);
            _io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, viewer);
          } else {
            viewer.status = 'disconnected';
            _io.to(vId).emit(EVENTS.FILE_MISMATCH);
          }
        }
      }
    } else {
      if (room.fileHash) {
        if (room.fileHash === payload.hash && room.fileSize === payload.size) {
          participant.fileHash = payload.hash;
          participant.status = 'ready';
          socket.emit(EVENTS.FILE_MATCH);
          _io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
        } else {
          participant.status = 'disconnected';
          socket.emit(EVENTS.FILE_MISMATCH);
          _io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
        }
      } else {
        participant.fileHash = payload.hash;
      }
    }
  });
}
