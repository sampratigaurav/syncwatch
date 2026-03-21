import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { rooms } from '../rooms/RoomManager';
import { EVENTS } from '../../../shared/socketEvents';
import { Participant, RoomState, PlaybackEvent } from '../../../shared/types';

const disconnectTimers = new Map<string, NodeJS.Timeout>();
const bufferingTimers = new Map<string, NodeJS.Timeout>();

function canControl(room: RoomState, socketId: string): boolean {
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

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {

    socket.on(EVENTS.JOIN_ROOM, (payload: { roomId: string, nickname: string, password?: string }) => {
      const { roomId, nickname, password } = payload;
      const room = rooms.get(roomId);
      if (!room) {
        socket.emit(EVENTS.ROOM_NOT_FOUND, { roomId });
        return; // handle error or emit not found
      }

      if (room.hasPassword) {
        if (!password) {
          socket.emit(EVENTS.ROOM_REQUIRES_PASSWORD, { roomId });
          return;
        }
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        if (hash !== room.password) {
          // TODO: add rate limiting on wrong PIN attempts before production
          socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Incorrect PIN' });
          return;
        }
      }
      
      // cancel disconnect timer if rejoining
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
        const disconnectedMatch = Array.from(room.participants.values()).find(p => p.nickname === nickname && p.status === 'disconnected');
        if (disconnectedMatch) {
          room.participants.delete(disconnectedMatch.id);
          existing = disconnectedMatch;
          if (disconnectTimers.has(disconnectedMatch.id)) {
            clearTimeout(disconnectTimers.get(disconnectedMatch.id));
            disconnectTimers.delete(disconnectedMatch.id);
          }
        }
      }

      let role: 'host' | 'viewer';
      if (existing) {
        role = existing.role;
        if (role === 'host') {
          room.playback.hostId = socket.id;
        }
      } else {
        const hasHost = Array.from(room.participants.values()).some(p => p.role === 'host');
        role = hasHost ? 'viewer' : 'host';
        if (role === 'host') {
          room.playback.hostId = socket.id;
        }
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

      // Serialize participants map to array for client
      const roomStatePayload = {
        ...room,
        participants: Array.from(room.participants.values())
      };
      
      // CRITICAL: Ensure password is never transmitted implicitly via room state objects
      delete (roomStatePayload as any).password;

      socket.emit(EVENTS.ROOM_STATE, roomStatePayload);
      socket.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
    });

    socket.on(EVENTS.FILE_VERIFIED, (payload: { hash: string, size: number, name: string }) => {
      let roomId = '';
      let participant: Participant | undefined;
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          participant = room.participants.get(socket.id);
          break;
        }
      }

      if (!roomId || !participant) return;
      const room = rooms.get(roomId)!;

      if (participant.role === 'host') {
        room.fileHash = payload.hash;
        room.fileName = payload.name;
        room.fileSize = payload.size;
        participant.status = 'ready';
        participant.fileHash = payload.hash;
        
        socket.emit(EVENTS.FILE_MATCH);
        io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
        
        // Let any waiting viewers know if they match now
        for (const [vId, viewer] of room.participants.entries()) {
          if (vId !== socket.id && viewer.fileHash) {
             if (viewer.fileHash === payload.hash) {
                viewer.status = 'ready';
                io.to(vId).emit(EVENTS.FILE_MATCH);
                io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, viewer);
             } else {
                viewer.status = 'disconnected';
                io.to(vId).emit(EVENTS.FILE_MISMATCH);
             }
          }
        }
      } else {
        if (room.fileHash) {
          if (room.fileHash === payload.hash && room.fileSize === payload.size) {
            participant.fileHash = payload.hash;
            participant.status = 'ready';
            socket.emit(EVENTS.FILE_MATCH);
            io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
          } else {
            participant.status = 'disconnected';
            socket.emit(EVENTS.FILE_MISMATCH);
            io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
          }
        } else {
          // Tentatively set hash, but wait for host
          participant.fileHash = payload.hash;
        }
      }
    });

    socket.on(EVENTS.PLAYBACK_EVENT, (payload: PlaybackEvent) => {
      let roomId = '';
      let participant: Participant | undefined;
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          participant = room.participants.get(socket.id);
          break;
        }
      }

      if (!roomId || !participant) return;
      
      const room = rooms.get(roomId)!;
      if (!canControl(room, socket.id)) return; // Validate against control policy

      if (payload.action === 'play') room.playback.isPlaying = true;
      if (payload.action === 'pause') room.playback.isPlaying = false;
      
      if (payload.action === 'subtitle_toggle' || payload.action === 'subtitle_track_change') {
        if (payload.subtitleState) {
          room.subtitleState = payload.subtitleState;
        }
        socket.to(roomId).emit(EVENTS.SUBTITLE_STATE_BROADCAST, {
           isEnabled: room.subtitleState.isEnabled,
           trackIndex: room.subtitleState.trackIndex
        });
        return; // Complete routing exclusively for subtitles without altering video engine blocks
      }

      room.playback.currentTime = payload.currentTime;
      room.playback.lastUpdatedAt = Date.now();
      room.playback.lastActionBy = socket.id;
      room.playback.lastActionNickname = participant.nickname;

      socket.to(roomId).emit(EVENTS.PLAYBACK_BROADCAST, { 
        ...payload, 
        lastActionBy: socket.id, 
        lastActionNickname: participant.nickname 
      });
    });

    socket.on(EVENTS.SET_CONTROL_POLICY, (payload: { policy: any, controllerIds: string[] }) => {
      let roomId = '';
      let participant: Participant | undefined;
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          participant = room.participants.get(socket.id);
          break;
        }
      }

      if (!roomId || !participant) return;
      if (participant.role !== 'host') return;

      const room = rooms.get(roomId)!;
      room.controlPolicy = payload.policy;
      room.controllerIds = payload.controllerIds;

      io.to(roomId).emit(EVENTS.CONTROL_POLICY_UPDATE, {
        policy: room.controlPolicy,
        controllerIds: room.controllerIds
      });
    });

    socket.on(EVENTS.BUFFERING_STATE, (payload: { isBuffering: boolean }) => {
      let roomId = '';
      let participant: Participant | undefined;
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          participant = room.participants.get(socket.id);
          break;
        }
      }

      if (!roomId || !participant) return;
      const room = rooms.get(roomId)!;

      participant.status = payload.isBuffering ? 'buffering' : 'ready';
      io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);

      const anyBuffering = Array.from(room.participants.values()).some(p => p.status === 'buffering');
      
      if (anyBuffering) {
        if (!bufferingTimers.has(roomId)) {
          const timer = setTimeout(() => {
            const stillBuffering = Array.from(room.participants.values()).some(p => p.status === 'buffering');
            if (stillBuffering) {
              io.to(roomId).emit(EVENTS.FORCE_PAUSE);
            }
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
        if (host) {
          io.to(host.id).emit(EVENTS.RESUME_ALLOWED);
        }
      }
    });

    socket.on(EVENTS.PING, (payload: { sentAt: number }) => {
      socket.emit(EVENTS.PONG, payload);
    });

    socket.on(EVENTS.CHAT_MESSAGE, (payload: { text: string }) => {
      let roomId = '';
      let participant: Participant | undefined;
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          participant = room.participants.get(socket.id);
          break;
        }
      }

      if (!roomId || !participant) return;
      const room = rooms.get(roomId)!;

      const message = {
        id: Math.random().toString(36).substring(2, 10),
        senderId: participant.id,
        senderNickname: participant.nickname,
        text: payload.text,
        timestamp: Date.now()
      };

      room.chatHistory.push(message);
      if (room.chatHistory.length > 100) {
        room.chatHistory.shift();
      }

      io.to(roomId).emit(EVENTS.CHAT_BROADCAST, message);
    });

    socket.on('disconnect', () => {
      // Find which room this socket belongs to
      let roomId = '';
      let disconnectedParticipant: Participant | undefined;
      
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          disconnectedParticipant = room.participants.get(socket.id);
          break;
        }
      }

      if (!roomId || !disconnectedParticipant) return;

      const room = rooms.get(roomId)!;
      disconnectedParticipant.status = 'disconnected';
      io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, disconnectedParticipant);

      const timer = setTimeout(() => {
        const p = room.participants.get(socket.id);
        if (p && p.status === 'disconnected') {
          room.participants.delete(socket.id);
          io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, { ...p, status: 'removed' });
          if (p.role === 'host') {
             io.to(roomId).emit(EVENTS.HOST_LEFT);
          }
          if (room.participants.size === 0) {
            rooms.delete(roomId);
          }
        }
        disconnectTimers.delete(socket.id);
      }, 30000);

      disconnectTimers.set(socket.id, timer);
    });
  });
};
