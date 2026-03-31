import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { rooms } from '../rooms/RoomManager';
import { EVENTS } from '../../../shared/socketEvents';
import { Participant, RoomState, PlaybackEvent } from '../../../shared/types';

const disconnectTimers = new Map<string, NodeJS.Timeout>();
const bufferingTimers = new Map<string, NodeJS.Timeout>();
const lastReactionTimes = new Map<string, number>();
const pinAttemptTimes = new Map<string, number[]>();
const lastChatTimes = new Map<string, number[]>();

const MAX_NICKNAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_PIN_ATTEMPTS = 5;
const PIN_WINDOW_MS = 60_000;
const MAX_CHAT_PER_WINDOW = 5;
const CHAT_WINDOW_MS = 3_000;

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

      // Fix 8: Server-side nickname validation
      if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 1 || nickname.length > MAX_NICKNAME_LENGTH) {
        socket.emit('error', { message: 'Nickname must be 1-50 characters' });
        return;
      }

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

        // Fix 2: Rate limit PIN attempts per socket (5 per 60s)
        const now = Date.now();
        const recentAttempts = (pinAttemptTimes.get(socket.id) || []).filter(t => now - t < PIN_WINDOW_MS);
        if (recentAttempts.length >= MAX_PIN_ATTEMPTS) {
          socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Too many attempts. Please wait before trying again.' });
          return;
        }

        const hash = crypto.pbkdf2Sync(password, room.passwordSalt!, 100_000, 32, 'sha256').toString('hex');
        if (hash !== room.password) {
          recentAttempts.push(now);
          pinAttemptTimes.set(socket.id, recentAttempts);
          socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Incorrect PIN' });
          return;
        }
        // Successful auth: clear attempt history
        pinAttemptTimes.delete(socket.id);
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
      // Fix 6: Validate message content
      if (!payload.text || typeof payload.text !== 'string') return;
      const trimmed = payload.text.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return;

      // Fix 6: Rate limit chat messages (5 per 3s per socket)
      const now = Date.now();
      const recentChats = (lastChatTimes.get(socket.id) || []).filter(t => now - t < CHAT_WINDOW_MS);
      if (recentChats.length >= MAX_CHAT_PER_WINDOW) return;
      recentChats.push(now);
      lastChatTimes.set(socket.id, recentChats);

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
        id: crypto.randomUUID(), // Fix 10: Use cryptographically random ID
        senderId: participant.id,
        senderNickname: participant.nickname,
        text: trimmed,
        timestamp: Date.now()
      };

      room.chatHistory.push(message);
      if (room.chatHistory.length > 100) {
        room.chatHistory.shift();
      }

      io.to(roomId).emit(EVENTS.CHAT_BROADCAST, message);
    });

    socket.on(EVENTS.VOICE_JOIN, () => {
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
      if (!room.voiceParticipants) room.voiceParticipants = [];
      if (room.voiceParticipants.some(p => p.id === socket.id)) return;
      
      const vp = {
        id: socket.id,
        nickname: participant.nickname,
        isMuted: false,
        isSpeaking: false
      };
      
      room.voiceParticipants.push(vp);
      io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
      socket.to(roomId).emit(EVENTS.VOICE_JOIN, vp);
    });

    socket.on(EVENTS.VOICE_LEAVE, () => {
      let roomId = '';
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          break;
        }
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
      let roomId = '';
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          break;
        }
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
        if (room.participants.has(socket.id)) {
          roomId = id;
          break;
        }
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

    // Fix 5: Validate that WebRTC target is in the same room as the sender
    const getSharedRoom = (senderSocketId: string, targetSocketId: string): string | null => {
      for (const [roomId, room] of rooms.entries()) {
        if (room.participants.has(senderSocketId) && room.participants.has(targetSocketId)) {
          return roomId;
        }
      }
      return null;
    };

    socket.on(EVENTS.WEBRTC_OFFER, (payload: { offer: any, targetId: string }) => {
      if (!getSharedRoom(socket.id, payload.targetId)) return;
      io.to(payload.targetId).emit(EVENTS.WEBRTC_OFFER, {
        offer: payload.offer,
        fromId: socket.id
      });
    });

    socket.on(EVENTS.WEBRTC_ANSWER, (payload: { answer: any, targetId: string }) => {
      if (!getSharedRoom(socket.id, payload.targetId)) return;
      io.to(payload.targetId).emit(EVENTS.WEBRTC_ANSWER, {
        answer: payload.answer,
        fromId: socket.id
      });
    });

    socket.on(EVENTS.WEBRTC_ICE_CANDIDATE, (payload: { candidate: any, targetId: string }) => {
      if (!getSharedRoom(socket.id, payload.targetId)) return;
      io.to(payload.targetId).emit(EVENTS.WEBRTC_ICE_CANDIDATE, {
        candidate: payload.candidate,
        fromId: socket.id
      });
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
      
      if (room.voiceParticipants) {
        const prevLen = room.voiceParticipants.length;
        room.voiceParticipants = room.voiceParticipants.filter(p => p.id !== socket.id);
        if (room.voiceParticipants.length !== prevLen) {
           io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
        }
      }

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
      lastReactionTimes.delete(socket.id);
      pinAttemptTimes.delete(socket.id);
      lastChatTimes.delete(socket.id);
    });

    socket.on(EVENTS.SEND_REACTION, (payload: { emoji: string }) => {
      const ALLOWED_EMOJIS = ['😂', '❤️', '😮', '😭', '🔥', '👏', '😍', '💀', '🤯', '👀'];
      if (!ALLOWED_EMOJIS.includes(payload.emoji)) return;

      const now = Date.now();
      const lastTime = lastReactionTimes.get(socket.id) || 0;
      if (now - lastTime < 2000) return;

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

      lastReactionTimes.set(socket.id, now);

      io.to(roomId).emit(EVENTS.REACTION_BROADCAST, {
        emoji: payload.emoji,
        senderId: socket.id,
        senderNickname: participant.nickname,
        id: crypto.randomUUID()
      });
    });
  });
};
