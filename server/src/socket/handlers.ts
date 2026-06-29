import { Server, Socket } from 'socket.io';
import crypto from 'crypto';
import { promisify } from 'util';
import { getRoom, setRoom, deleteRoom, redisClient } from '../rooms/RoomManager';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { EVENTS } from '../../../shared/socketEvents';
import { Participant, RoomState, PlaybackEvent, ControlPolicy } from '../../../shared/types';
import { auth } from '../firebase';

const pbkdf2Async = promisify(crypto.pbkdf2);

const disconnectTimers = new Map<string, NodeJS.Timeout>();
const bufferingTimers = new Map<string, NodeJS.Timeout>();
const lastReactionTimes = new Map<string, number>();
// PIN attempts will be managed by RateLimiterRedis
const lastChatTimes = new Map<string, number[]>();

// Reconnect tokens: token → { roomId, nickname, role }
// Allows a participant to reclaim their previous role after a disconnect
const reconnectTokens = new Map<string, { roomId: string; nickname: string; role: 'host' | 'viewer' }>();
// Track the current reconnect token for each socket so we can clean up on removal
const socketToToken = new Map<string, string>();

const MAX_NICKNAME_LENGTH = 50;
const MAX_MESSAGE_LENGTH = 1000;
const MAX_PIN_ATTEMPTS = 5;
let pinRateLimiter: RateLimiterRedis | null = null;

const getPinRateLimiter = () => {
  if (!pinRateLimiter) {
    pinRateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit_pin',
      points: 5, // 5 attempts
      duration: 900, // block for 15 minutes (900 seconds)
    });
  }
  return pinRateLimiter;
};
const MAX_CHAT_PER_WINDOW = 5;
const CHAT_WINDOW_MS = 3_000;
const MAX_FILE_NAME_LENGTH = 255;
const VALID_HASH_RE = /^[0-9a-f]{64}$/i; // SHA-256 hex string
const VALID_CONTROL_POLICIES: ControlPolicy[] = ['host_only', 'everyone', 'selected'];

function getClientIp(socket: Socket): string {
  const req = socket.request as any;
  return req.ip || socket.handshake.address;
}

// Node-local reverse index: socketId → roomId.
// Socket connections are always owned by one node, so this per-process Map is correct.
const socketToRoom = new Map<string, string>();

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
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      if (!auth) {
        console.error('Firebase Auth not initialized, cannot verify token');
        return next(); // Let them connect as anonymous if server misconfigured
      }
      try {
        const decodedToken = await auth.verifyIdToken(token);
        socket.data.userId = decodedToken.uid;
      } catch (err) {
        console.error('Socket authentication failed:', err);
        return next(new Error('Authentication error'));
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    // Allows the client to rotate the token without reconnecting
    socket.on('rotate_auth_token', async ({ token }) => {
      if (!token) return;
      if (!auth) return;
      try {
        const decodedToken = await auth.verifyIdToken(token);
        socket.data.userId = decodedToken.uid;
      } catch (err) {
        console.error('Token rotation failed:', err);
      }
    });

    socket.on(EVENTS.JOIN_ROOM, async (payload: { roomId: string, nickname: string, password?: string, reconnectToken?: string, avatarUrl?: string }) => {
      if (!payload) return;
      const { roomId, nickname, password, reconnectToken } = payload;

      if (typeof roomId !== 'string') {
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }

      // Server-side nickname validation
      if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 1 || nickname.length > MAX_NICKNAME_LENGTH) {
        socket.emit('error', { message: 'Nickname must be 1-50 characters' });
        return;
      }

      const room = await getRoom(roomId);
      if (!room) {
        socket.emit(EVENTS.ROOM_NOT_FOUND, { roomId });
        return;
      }

      if (room.hasPassword) {
        if (!password) {
          socket.emit(EVENTS.ROOM_REQUIRES_PASSWORD, { roomId });
          return;
        }

        if (typeof password !== 'string') {
          socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Incorrect PIN format' });
          return;
        }

        // Rate limit PIN attempts per IP globally
        const ip = getClientIp(socket);
        
        try {
          await getPinRateLimiter().consume(ip);
        } catch (rejRes) {
          if (rejRes instanceof Error) {
            console.error('RateLimiter error (PIN):', rejRes);
            // On internal error, don't block
          } else {
            socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Too many attempts. Please wait 15 minutes before trying again.' });
            return;
          }
        }

        let hash: string;
        if (room.passwordSalt) {
          const hashBuffer = await pbkdf2Async(password, room.passwordSalt, 100_000, 32, 'sha256');
          hash = hashBuffer.toString('hex');
        } else {
          hash = password; // Fallback for custom rooms created via client with raw PIN
        }
        
        if (hash !== room.password) {
          socket.emit(EVENTS.WRONG_PASSWORD, { message: 'Incorrect PIN' });
          return;
        }
        // Successful auth: reset attempts for this IP
        if (pinRateLimiter) {
          await pinRateLimiter.delete(ip);
        }
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

      // Check if socket is already in a different room
      const currentRoomId = socketToRoom.get(socket.id);
      if (currentRoomId && currentRoomId !== roomId) {
        socket.leave(currentRoomId);
        const oldRoom = await getRoom(currentRoomId);
        if (oldRoom) {
          const p = oldRoom.participants.get(socket.id);
          if (p) {
            oldRoom.participants.delete(socket.id);
            if (oldRoom.voiceParticipants) {
              oldRoom.voiceParticipants = oldRoom.voiceParticipants.filter(vp => vp.id !== socket.id);
              socket.to(currentRoomId).emit(EVENTS.VOICE_STATE_UPDATE, oldRoom.voiceParticipants);
            }
            socket.to(currentRoomId).emit(EVENTS.PARTICIPANT_UPDATE, { ...p, status: 'removed' });
            if (p.role === 'host') {
              socket.to(currentRoomId).emit(EVENTS.HOST_LEFT);
            }
            if (oldRoom.participants.size === 0) {
              await deleteRoom(currentRoomId);
            } else {
              await setRoom(oldRoom);
            }
          }
        }
      }

      socket.join(roomId);
      socketToRoom.set(socket.id, roomId);

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
            // Find the disconnected participant slot by the stored nickname.
            // IMPORTANT: Also match 'ready'/'buffering' status because on fast reconnects
            // the socket can re-emit JOIN_ROOM before the server has processed the
            // disconnect event and updated the status to 'disconnected'. The token itself
            // is the cryptographic proof of identity, so status check is relaxed here.
            const disconnectedMatch = Array.from(room.participants.values()).find(
              p => p.nickname === nickname && 
                   (p.status === 'disconnected' || p.status === 'ready' || p.status === 'buffering')
            );
            if (disconnectedMatch) {
              room.participants.delete(disconnectedMatch.id);
              existing = disconnectedMatch;
              if (disconnectTimers.has(disconnectedMatch.id)) {
                clearTimeout(disconnectTimers.get(disconnectedMatch.id));
                disconnectTimers.delete(disconnectedMatch.id);
              }
              // Tell other clients to remove the ghost clone
              socket.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, { ...disconnectedMatch, status: 'removed' });
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
        status: existing ? existing.status : 'disconnected',
        fileHash: existing ? existing.fileHash : null,
        latencyMs: existing ? existing.latencyMs : 0,
        joinedAt: existing ? existing.joinedAt : Date.now(),
        avatarUrl: payload.avatarUrl || (existing ? existing.avatarUrl : undefined)
      };

      room.participants.set(socket.id, participant);
      await setRoom(room);

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
      // But DO send it if they are an existing participant reclaiming their slot (reconnection)
      if (!existing) {
        delete (roomStatePayload as any).chatHistory;
      }

      socket.emit(EVENTS.ROOM_STATE, roomStatePayload);
      socket.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);
    });

    socket.on(EVENTS.FILE_VERIFIED, async (payload: { hash: string, size: number, name: string }) => {
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

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

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

      await setRoom(room);
    });

    socket.on(EVENTS.PLAYBACK_EVENT, async (payload: PlaybackEvent) => {
      if (!payload || typeof payload !== 'object') return;
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      if (!canControl(room, socket.id)) return;

      const validActions = ['play', 'pause', 'seek', 'sync_check', 'subtitle_toggle', 'subtitle_track_change'];
      if (typeof payload.action !== 'string' || !validActions.includes(payload.action)) {
        socket.emit('error', { message: 'Invalid playback action' });
        return;
      }

      if (payload.action === 'play') room.playback.isPlaying = true;
      if (payload.action === 'pause') room.playback.isPlaying = false;

      if (payload.action === 'subtitle_toggle' || payload.action === 'subtitle_track_change') {
        if (payload.subtitleState && typeof payload.subtitleState === 'object') {
          if (typeof payload.subtitleState.isEnabled === 'boolean' && typeof payload.subtitleState.trackIndex === 'number') {
            room.subtitleState = {
              isEnabled: payload.subtitleState.isEnabled,
              trackIndex: payload.subtitleState.trackIndex
            };
          }
        }
        await setRoom(room);
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

      // Validate timestamp is a finite number
      if (typeof payload.timestamp !== 'number' || !Number.isFinite(payload.timestamp)) {
        socket.emit('error', { message: 'Invalid playback timestamp' });
        return;
      }

      room.playback.currentTime = payload.currentTime;
      room.playback.lastUpdatedAt = Date.now();
      room.playback.lastActionBy = socket.id;
      room.playback.lastActionNickname = participant.nickname;

      await setRoom(room);

      socket.to(roomId).emit(EVENTS.PLAYBACK_BROADCAST, {
        action: payload.action,
        currentTime: payload.currentTime,
        timestamp: payload.timestamp,
        lastActionBy: socket.id,
        lastActionNickname: participant.nickname
      });
    });

    socket.on(EVENTS.SET_CONTROL_POLICY, async (payload: { policy: ControlPolicy, controllerIds: string[] }) => {
      // Validate policy is one of the allowed values
      if (!payload || !VALID_CONTROL_POLICIES.includes(payload.policy)) {
        socket.emit('error', { message: 'Invalid control policy' });
        return;
      }
      // Validate controllerIds is an array of strings
      if (!Array.isArray(payload.controllerIds)) {
        socket.emit('error', { message: 'Invalid controllerIds' });
        return;
      }

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;
      if (participant.role !== 'host') return;

      // Only allow IDs that actually belong to participants in this room
      const validControllerIds = payload.controllerIds.filter(
        id => typeof id === 'string' && room.participants.has(id)
      );

      room.controlPolicy = payload.policy;
      room.controllerIds = validControllerIds;

      await setRoom(room);

      io.to(roomId).emit(EVENTS.CONTROL_POLICY_UPDATE, {
        policy: room.controlPolicy,
        controllerIds: room.controllerIds
      });
    });

    socket.on(EVENTS.SET_MAGNET_LINK, async (payload: { magnetURI: string }) => {
      if (!payload || typeof payload.magnetURI !== 'string') return;
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant || participant.role !== 'host') return;

      room.magnetURI = payload.magnetURI;
      participant.status = 'ready';
      
      await setRoom(room);
      
      const roomStatePayload = {
        ...room,
        participants: Array.from(room.participants.values())
      };

      delete (roomStatePayload as any).password;
      delete (roomStatePayload as any).passwordSalt;

      io.to(roomId).emit(EVENTS.ROOM_STATE, roomStatePayload);
    });

    socket.on(EVENTS.BUFFERING_STATE, async (payload: { isBuffering: boolean }) => {
      // Validate boolean type
      if (!payload || typeof payload.isBuffering !== 'boolean') {
        socket.emit('error', { message: 'Invalid buffering state' });
        return;
      }

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      participant.status = payload.isBuffering ? 'buffering' : 'ready';
      io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, participant);

      const anyBuffering = Array.from(room.participants.values()).some(p => p.status === 'buffering');

      if (anyBuffering) {
        if (!bufferingTimers.has(roomId)) {
          const timer = setTimeout(async () => {
            const latestRoom = await getRoom(roomId);
            if (latestRoom) {
              const stillBuffering = Array.from(latestRoom.participants.values()).some(p => p.status === 'buffering');
              if (stillBuffering) {
                io.to(roomId).emit(EVENTS.FORCE_PAUSE);
              }
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

      await setRoom(room);
    });

    socket.on(EVENTS.PING, (payload: { sentAt: number }) => {
      if (!payload || typeof payload.sentAt !== 'number') return;
      socket.emit(EVENTS.PONG, { sentAt: payload.sentAt });
    });

    socket.on(EVENTS.CHAT_MESSAGE, async (payload: { text: string }) => {
      if (!payload || !payload.text || typeof payload.text !== 'string') return;
      const trimmed = payload.text.trim();
      if (trimmed.length === 0 || trimmed.length > MAX_MESSAGE_LENGTH) return;

      // Rate limit chat messages (5 per 3s per socket)
      const now = Date.now();
      const recentChats = (lastChatTimes.get(socket.id) || []).filter(t => now - t < CHAT_WINDOW_MS);
      if (recentChats.length >= MAX_CHAT_PER_WINDOW) return;
      recentChats.push(now);
      lastChatTimes.set(socket.id, recentChats);

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      const message = {
        id: crypto.randomUUID(),
        senderId: participant.id,
        senderNickname: participant.nickname,
        text: trimmed,
        timestamp: Date.now(),
        avatarUrl: participant.avatarUrl
      };

      room.chatHistory.push(message);
      if (room.chatHistory.length > 100) {
        room.chatHistory.shift();
      }

      await setRoom(room);
      io.to(roomId).emit(EVENTS.CHAT_BROADCAST, message);
    });

    socket.on(EVENTS.TYPING_START, () => {
      const roomId = socketToRoom.get(socket.id);
      if (roomId) socket.to(roomId).emit(EVENTS.TYPING_START, { userId: socket.id });
    });

    socket.on(EVENTS.TYPING_STOP, () => {
      const roomId = socketToRoom.get(socket.id);
      if (roomId) socket.to(roomId).emit(EVENTS.TYPING_STOP, { userId: socket.id });
    });

    socket.on(EVENTS.LOAD_NEXT_EPISODE, async (payload: { filename: string }) => {
      if (!payload || typeof payload.filename !== 'string') return;
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      
      const participant = room.participants.get(socket.id);
      if (!participant || participant.role !== 'host') return;
      
      socket.to(roomId).emit(EVENTS.LOAD_NEXT_EPISODE, { filename: payload.filename });
    });

    socket.on(EVENTS.VOICE_JOIN, async () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      if (!room.voiceParticipants) room.voiceParticipants = [];
      if (room.voiceParticipants.some(p => p.id === socket.id)) return;

      const vp = {
        id: socket.id,
        nickname: participant.nickname,
        isMuted: false,
        isSpeaking: false
      };

      room.voiceParticipants.push(vp);
      await setRoom(room);

      io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
      socket.to(roomId).emit(EVENTS.VOICE_JOIN, vp);
    });

    socket.on(EVENTS.VOICE_LEAVE, async () => {
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room || !room.voiceParticipants) return;

      const prevLen = room.voiceParticipants.length;
      room.voiceParticipants = room.voiceParticipants.filter(p => p.id !== socket.id);

      if (room.voiceParticipants.length !== prevLen) {
        await setRoom(room);
        io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
      }
    });

    socket.on(EVENTS.VOICE_MUTE_TOGGLE, async (payload: { isMuted: boolean }) => {
      // Validate boolean type
      if (!payload || typeof payload.isMuted !== 'boolean') {
        socket.emit('error', { message: 'Invalid mute state' });
        return;
      }

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room || !room.voiceParticipants) return;

      const vp = room.voiceParticipants.find(p => p.id === socket.id);
      if (vp) {
        vp.isMuted = payload.isMuted;
        await setRoom(room);
        io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
      }
    });

    socket.on(EVENTS.VOICE_SPEAKING, async (payload: { isSpeaking: boolean }) => {
      if (!payload || typeof payload.isSpeaking !== 'boolean') return;
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room || !room.voiceParticipants) return;

      const vp = room.voiceParticipants.find(p => p.id === socket.id);
      if (vp && vp.isSpeaking !== payload.isSpeaking) {
        vp.isSpeaking = payload.isSpeaking;
        socket.to(roomId).emit(EVENTS.VOICE_SPEAKING, { isSpeaking: payload.isSpeaking, fromId: socket.id });
      }
    });

    // Validate that WebRTC target is in the same room as the sender
    const getSharedRoom = async (senderSocketId: string, targetSocketId: string): Promise<string | null> => {
      const roomId = socketToRoom.get(senderSocketId);
      if (!roomId) return null;
      const room = await getRoom(roomId);
      if (!room || !room.participants.has(targetSocketId)) return null;
      return roomId;
    };

    socket.on(EVENTS.WEBRTC_OFFER, async (payload: { offer: any, targetId: string }) => {
      if (!payload || typeof payload.targetId !== 'string') return;
      if (!await getSharedRoom(socket.id, payload.targetId)) return;
      io.to(payload.targetId).emit(EVENTS.WEBRTC_OFFER, {
        offer: payload.offer,
        fromId: socket.id
      });
    });

    socket.on(EVENTS.WEBRTC_ANSWER, async (payload: { answer: any, targetId: string }) => {
      if (!payload || typeof payload.targetId !== 'string') return;
      if (!await getSharedRoom(socket.id, payload.targetId)) return;
      io.to(payload.targetId).emit(EVENTS.WEBRTC_ANSWER, {
        answer: payload.answer,
        fromId: socket.id
      });
    });

    socket.on(EVENTS.WEBRTC_ICE_CANDIDATE, async (payload: { candidate: any, targetId: string }) => {
      if (!payload || typeof payload.targetId !== 'string') return;
      if (!await getSharedRoom(socket.id, payload.targetId)) return;
      io.to(payload.targetId).emit(EVENTS.WEBRTC_ICE_CANDIDATE, {
        candidate: payload.candidate,
        fromId: socket.id
      });
    });

    socket.on('disconnect', async () => {
      const roomId = socketToRoom.get(socket.id);
      socketToRoom.delete(socket.id);
      lastReactionTimes.delete(socket.id);
      lastChatTimes.delete(socket.id);
      // Note: pinAttemptTimes is keyed by IP, not socket id — no cleanup needed here

      if (!roomId) {
        revokeReconnectToken(socket.id);
        return;
      }

      const room = await getRoom(roomId);
      if (!room) return;

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

      await setRoom(room);
      io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, disconnectedParticipant);

      const disconnectedSocketId = socket.id;
      const timer = setTimeout(async () => {
        const latestRoom = await getRoom(roomId);
        if (latestRoom) {
          const p = latestRoom.participants.get(disconnectedSocketId);
          if (p && p.status === 'disconnected') {
            latestRoom.participants.delete(disconnectedSocketId);
            // Revoke the reconnect token when the participant slot is permanently removed
            revokeReconnectToken(disconnectedSocketId);
            io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, { ...p, status: 'removed' });
            if (p.role === 'host') {
              io.to(roomId).emit(EVENTS.HOST_LEFT);
            }
            if (latestRoom.participants.size === 0) {
              await deleteRoom(roomId);
            } else {
              await setRoom(latestRoom);
            }
          }
        }
        disconnectTimers.delete(disconnectedSocketId);
      }, 30000);

      disconnectTimers.set(socket.id, timer);
    });

    socket.on(EVENTS.SEND_REACTION, async (payload: { emoji: string }) => {
      if (!payload || !payload.emoji) return;
      const ALLOWED_EMOJIS = ['😂', '❤️', '😮', '😭', '🔥', '👏', '😍', '💀', '🤯', '👀'];
      if (!ALLOWED_EMOJIS.includes(payload.emoji)) return;

      const now = Date.now();
      const lastTime = lastReactionTimes.get(socket.id) || 0;
      if (now - lastTime < 2000) return;

      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
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

    socket.on('profile_updated', async (payload: { displayName?: string, avatarUrl?: string }) => {
      if (!payload) return;
      const roomId = socketToRoom.get(socket.id);
      if (!roomId) return;
      const room = await getRoom(roomId);
      if (!room) return;
      const participant = room.participants.get(socket.id);
      if (!participant) return;

      if (payload.displayName) participant.nickname = payload.displayName;
      if (payload.avatarUrl) participant.avatarUrl = payload.avatarUrl;

      // Also update voice participant if they exist
      if (room.voiceParticipants) {
        const vp = room.voiceParticipants.find(v => v.id === socket.id);
        if (vp) {
          if (payload.displayName) vp.nickname = payload.displayName;
          if (payload.avatarUrl) vp.avatarUrl = payload.avatarUrl;
          io.to(roomId).emit(EVENTS.VOICE_STATE_UPDATE, room.voiceParticipants);
        }
      }

      await setRoom(room);
      io.to(roomId).emit(EVENTS.PARTICIPANT_UPDATE, { ...participant, status: participant.status });
    });
  });
};
