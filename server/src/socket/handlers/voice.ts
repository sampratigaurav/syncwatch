import { Server, Socket } from 'socket.io';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';

export function registerVoice(io: Server, socket: Socket) {
  socket.on(EVENTS.VOICE_JOIN, () => {
    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    const participant = room.participants.get(socket.id);
    if (!participant) return;

    if (!room.voiceParticipants) room.voiceParticipants = [];
    if (room.voiceParticipants.some(p => p.id === socket.id)) return;

    const vp = { id: socket.id, nickname: participant.nickname, isMuted: false, isSpeaking: false };
    room.voiceParticipants.push(vp);
    io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
    socket.to(roomId).emit(EVENTS.VOICE_JOIN, vp);
  });

  socket.on(EVENTS.VOICE_LEAVE, () => {
    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    if (!room.voiceParticipants) return;

    const prevLen = room.voiceParticipants.length;
    room.voiceParticipants = room.voiceParticipants.filter(p => p.id !== socket.id);
    if (room.voiceParticipants.length !== prevLen) {
      io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
    }
  });

  socket.on(EVENTS.VOICE_MUTE_TOGGLE, (payload: { isMuted: boolean }) => {
    if (!payload || typeof payload.isMuted !== 'boolean') {
      socket.emit('error', { message: 'Invalid mute state' });
      return;
    }

    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    if (!room.voiceParticipants) return;

    const vp = room.voiceParticipants.find(p => p.id === socket.id);
    if (vp) {
      vp.isMuted = payload.isMuted;
      io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
    }
  });

  socket.on(EVENTS.VOICE_SPEAKING, (payload: { isSpeaking: boolean }) => {
    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    if (!room.voiceParticipants) return;

    const vp = room.voiceParticipants.find(p => p.id === socket.id);
    if (vp && vp.isSpeaking !== payload.isSpeaking) {
      vp.isSpeaking = payload.isSpeaking;
      socket.to(roomId).emit(EVENTS.VOICE_SPEAKING, { isSpeaking: payload.isSpeaking, fromId: socket.id });
    }
  });

  // WebRTC signalling — forward only when both peers are in the same room
  const getSharedRoom = (senderSocketId: string, targetSocketId: string): string | null => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.participants.has(senderSocketId) && room.participants.has(targetSocketId)) {
        return roomId;
      }
    }
    return null;
  };

  socket.on(EVENTS.WEBRTC_OFFER, (payload: { offer: any; targetId: string }) => {
    if (!getSharedRoom(socket.id, payload.targetId)) return;
    io.to(payload.targetId).emit(EVENTS.WEBRTC_OFFER, { offer: payload.offer, fromId: socket.id });
  });

  socket.on(EVENTS.WEBRTC_ANSWER, (payload: { answer: any; targetId: string }) => {
    if (!getSharedRoom(socket.id, payload.targetId)) return;
    io.to(payload.targetId).emit(EVENTS.WEBRTC_ANSWER, { answer: payload.answer, fromId: socket.id });
  });

  socket.on(EVENTS.WEBRTC_ICE_CANDIDATE, (payload: { candidate: any; targetId: string }) => {
    if (!getSharedRoom(socket.id, payload.targetId)) return;
    io.to(payload.targetId).emit(EVENTS.WEBRTC_ICE_CANDIDATE, { candidate: payload.candidate, fromId: socket.id });
  });
}
