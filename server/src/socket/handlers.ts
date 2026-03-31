import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { rooms } from '../rooms/RoomManager';
import { EVENTS } from '../../../shared/socketEvents';
import { Participant, RoomState, PlaybackEvent, ControlPolicy } from '../../../shared/types';

const disconnectTimers = new Map<string, NodeJS.Timeout>();
const bufferingTimers = new Map<string, NodeJS.Timeout>();
const lastReactionTimes = new Map<string, number>();
// PIN attempts keyed by IP, not socket id, to prevent bypass via reconnection
const pinAttemptTimes = new Map<string, number[]>();
const lastChatTimes = new Map<string, number[]>();

// Reconnect tokens: token → { roomId, nickname, role }
// Allows a participant to reclaim their previous role after a disconnect
const reconnectTokens = new Map<string, { roomId: string; nickname: string; role: 'host' | 'viewer' }>();
// Track the current reconnect token for each socket so we can clean up on removal
const socketToToken = new Map<string, string>();

const MAX_NICKNAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_PIN_ATTEMPTS = 5;
const PIN_WINDOW_MS = 60_000;
const MAX_CHAT_PER_WINDOW = 5;
const CHAT_WINDOW_MS = 3_000;
const MAX_FILE_NAME_LENGTH = 255;
const VALID_HASH_RE = /^[0-9a-f]{64}$/i; // SHA-256 hex string
const VALID_CONTROL_POLICIES: ControlPolicy[] = ['host_only', 'everyone', 'selected'];

function getClientIp(socket: Socket): string {
  // With `trust proxy: 1` configured on Express, the server trusts one upstream
  // proxy (e.g., Render.com's load balancer).  Each proxy in the chain appends
  // the IP it received the connection from to X-Forwarded-For, so the rightmost
  // entry is the one added by our trusted proxy — the actual client IP as seen
  // by that proxy.  Taking the rightmost IP prevents a client from injecting a
  // fake IP into the leftmost position of X-Forwarded-For before our proxy adds
  // the real one on the right.
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    // Rightmost = added by the trusted proxy; cannot be spoofed by the client.
    return ips[ips.length - 1] ?? socket.handshake.address;
  }
  return socket.handshake.address;
}

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

/** Issue a fresh reconnect token and send it to the socket. */
function issueReconnectToken(socket: Socket, roomId: string, nickname: string, role: 'host' | 'viewer') {
  // Revoke any existing token for this socket
  const oldToken = socketToToken.get(socket.id);
  if (oldToken) reconnectTokens.delete(oldToken);

  const token = crypto.randomBytes(32).toString('hex');
  reconnectTokens.set(token, { roomId, nickname, role });
  socketToToken.set(socket.id, token);
  socket.emit(EVENTS.RECONNECT_TOKEN, { token });
}

/** Remove all reconnect tokens belonging to a given socket. */
function revokeReconnectToken(socketId: string) {
  const token = socketToToken.get(socketId);
  if (token) {
    reconnectTokens.delete(token);
    socketToToken.delete(socketId);
  }
}

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {

    socket.on(EVENTS.JOIN_ROOM, (payload: { roomId: string, nickname: string, password?: string, reconnectToken?: string }) => {
      const { roomId, nickname, password, reconnectToken } = payload;

      // Server-side nickname validation
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

        // Rate limit PIN attempts per IP (not socket id) to prevent bypass via reconnect
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
        // Successful auth: clear attempt history for this IP
        pinAttemptTimes.delete(ip);
      }
      
      // Cancel disconnect timer if rejoining
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
        // Allow role reclamation only when the client presents a valid reconnect token
        if (reconnectToken && typeof reconnectToken === 'string') {
          const tokenData = reconnectTokens.get(reconnectToken);
          if (
            tokenData &&
            tokenData.roomId === roomId &&
            tokenData.nickname === nickname
          ) {
            // Find the disconnected participant slot by the stored nickname
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
            // Consume the token (single-use); a fresh one will be issued below
            reconnectTokens.delete(reconnectToken);
            socketToToken.delete(socket.id);
          }
          // If token is invalid or mismatched, the user simply joins as a new participant
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

      // Issue a fresh reconnect token so the client can reclaim this slot on reconnect
      issueReconnectToken(socket, roomId, nickname, role);

      // Serialize participants map to array for client
      const roomStatePayload = {
        ...room,
        participants: Array.from(room.participants.values())
      };
      
      // Never transmit the password hash or salt to clients
      delete (roomStatePayload as any).password;
      delete (roomStatePayload as any).passwordSalt;
      // Do not send historical chat to new joiners; new messages are pushed via CHAT_BROADCAST
      delete (roomStatePayload as any).chatHistory;

      socket.emit(EVENTS.ROOM_STATE, roomStatePayload);
      socket.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
    });

    socket.on(EVENTS.FILE_VERIFIED, (payload: { hash: string, size: number, name: string }) => {
      // Validate payload fields before trusting them
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
      if (!canControl(room, socket.id)) return;

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
        return;
      }

      // Validate currentTime is a finite non-negative number
      if (typeof payload.currentTime !== 'number' || !Number.isFinite(payload.currentTime) || payload.currentTime < 0) {
        socket.emit('error', { message: 'Invalid playback time' });
        return;
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

    socket.on(EVENTS.SET_CONTROL_POLICY, (payload: { policy: ControlPolicy, controllerIds: string[] }) => {
      // Validate policy is one of the allowed values
      if (!payload || !VALID_CONTROL_POLICIES.includes(payload.policy)) {
        socket.emit('error', { message: 'Invalid control policy' });
        return;
      }
      // Validate controllerIds is an array of strings that exist in the room
      if (!Array.isArray(payload.controllerIds)) {
        socket.emit('error', { message: 'Invalid controllerIds' });
        return;
      }

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

      // Only allow IDs that actually belong to participants in this room
      const validControllerIds = payload.controllerIds.filter(
        id => typeof id === 'string' && room.participants.has(id)
      );

      room.controlPolicy = payload.policy;
      room.controllerIds = validControllerIds;

      io.to(roomId).emit(EVENTS.CONTROL_POLICY_UPDATE, {
        policy: room.controlPolicy,
        controllerIds: room.controllerIds
      });
    });

    socket.on(EVENTS.BUFFERING_STATE, (payload: { isBuffering: boolean }) => {
      // Validate boolean type
      if (!payload || typeof payload.isBuffering !== 'boolean') {
        socket.emit('error', { message: 'Invalid buffering state' });
        return;
      }

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
      if (!payload.text || typeof payload.text !== 'string') return;
      const trimmed = payload.text.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return;

      // Rate limit chat messages (5 per 3s per socket)
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
        id: crypto.randomUUID(),
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
      // Validate boolean type
      if (!payload || typeof payload.isMuted !== 'boolean') {
        socket.emit('error', { message: 'Invalid mute state' });
        return;
      }

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

    // Validate that WebRTC target is in the same room as the sender
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
      let roomId = '';
      let disconnectedParticipant: Participant | undefined;
      
      for (const [id, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          roomId = id;
          disconnectedParticipant = room.participants.get(socket.id);
          break;
        }
      }

      if (!roomId || !disconnectedParticipant) {
        // No room found — still clean up per-socket state
        revokeReconnectToken(socket.id);
        lastReactionTimes.delete(socket.id);
        lastChatTimes.delete(socket.id);
        return;
      }

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
          // Revoke the reconnect token when the participant slot is permanently removed
          revokeReconnectToken(socket.id);
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
      lastChatTimes.delete(socket.id);
      // Note: pinAttemptTimes is keyed by IP, not socket id — no cleanup needed here
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
