"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketHandlers = void 0;
const RoomManager_1 = require("../rooms/RoomManager");
const socketEvents_1 = require("../../../shared/socketEvents");
const disconnectTimers = new Map();
const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        socket.on(socketEvents_1.EVENTS.JOIN_ROOM, (payload) => {
            const { roomId, nickname } = payload;
            const room = RoomManager_1.rooms.get(roomId);
            if (!room) {
                return; // handle error or emit not found
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
            let role;
            if (existing) {
                role = existing.role;
                if (role === 'host') {
                    room.playback.hostId = socket.id;
                }
            }
            else {
                const hasHost = Array.from(room.participants.values()).some(p => p.role === 'host');
                role = hasHost ? 'viewer' : 'host';
                if (role === 'host') {
                    room.playback.hostId = socket.id;
                }
            }
            const participant = {
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
            socket.emit(socketEvents_1.EVENTS.ROOM_STATE, roomStatePayload);
            socket.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, participant);
        });
        socket.on(socketEvents_1.EVENTS.FILE_VERIFIED, (payload) => {
            let roomId = '';
            let participant;
            for (const [id, room] of RoomManager_1.rooms.entries()) {
                if (room.participants.has(socket.id)) {
                    roomId = id;
                    participant = room.participants.get(socket.id);
                    break;
                }
            }
            if (!roomId || !participant)
                return;
            const room = RoomManager_1.rooms.get(roomId);
            if (participant.role === 'host') {
                room.fileHash = payload.hash;
                room.fileName = payload.name;
                room.fileSize = payload.size;
                participant.status = 'ready';
                participant.fileHash = payload.hash;
                socket.emit(socketEvents_1.EVENTS.FILE_MATCH);
                io.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, participant);
                // Let any waiting viewers know if they match now
                for (const [vId, viewer] of room.participants.entries()) {
                    if (vId !== socket.id && viewer.fileHash) {
                        if (viewer.fileHash === payload.hash) {
                            viewer.status = 'ready';
                            io.to(vId).emit(socketEvents_1.EVENTS.FILE_MATCH);
                            io.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, viewer);
                        }
                        else {
                            viewer.status = 'disconnected';
                            io.to(vId).emit(socketEvents_1.EVENTS.FILE_MISMATCH);
                        }
                    }
                }
            }
            else {
                if (room.fileHash) {
                    if (room.fileHash === payload.hash && room.fileSize === payload.size) {
                        participant.fileHash = payload.hash;
                        participant.status = 'ready';
                        socket.emit(socketEvents_1.EVENTS.FILE_MATCH);
                        io.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, participant);
                    }
                    else {
                        participant.status = 'disconnected';
                        socket.emit(socketEvents_1.EVENTS.FILE_MISMATCH);
                        io.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, participant);
                    }
                }
                else {
                    // Tentatively set hash, but wait for host
                    participant.fileHash = payload.hash;
                }
            }
        });
        socket.on(socketEvents_1.EVENTS.PLAYBACK_EVENT, (payload) => {
            let roomId = '';
            let participant;
            for (const [id, room] of RoomManager_1.rooms.entries()) {
                if (room.participants.has(socket.id)) {
                    roomId = id;
                    participant = room.participants.get(socket.id);
                    break;
                }
            }
            if (!roomId || !participant)
                return;
            if (participant.role !== 'host')
                return; // Server-side host validation
            const room = RoomManager_1.rooms.get(roomId);
            if (payload.action === 'play')
                room.playback.isPlaying = true;
            if (payload.action === 'pause')
                room.playback.isPlaying = false;
            room.playback.currentTime = payload.currentTime;
            room.playback.lastUpdatedAt = Date.now();
            socket.to(roomId).emit(socketEvents_1.EVENTS.PLAYBACK_BROADCAST, payload);
        });
        socket.on(socketEvents_1.EVENTS.BUFFERING_STATE, (payload) => {
            let roomId = '';
            let participant;
            for (const [id, room] of RoomManager_1.rooms.entries()) {
                if (room.participants.has(socket.id)) {
                    roomId = id;
                    participant = room.participants.get(socket.id);
                    break;
                }
            }
            if (!roomId || !participant)
                return;
            const room = RoomManager_1.rooms.get(roomId);
            participant.status = payload.isBuffering ? 'buffering' : 'ready';
            io.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, participant);
            const anyBuffering = Array.from(room.participants.values()).some(p => p.status === 'buffering');
            if (anyBuffering) {
                io.to(roomId).emit(socketEvents_1.EVENTS.FORCE_PAUSE);
            }
            else {
                // Send RESUME_ALLOWED to host only
                const host = Array.from(room.participants.values()).find(p => p.role === 'host');
                if (host) {
                    io.to(host.id).emit(socketEvents_1.EVENTS.RESUME_ALLOWED);
                }
            }
        });
        socket.on(socketEvents_1.EVENTS.PING, (payload) => {
            socket.emit(socketEvents_1.EVENTS.PONG, payload);
        });
        socket.on(socketEvents_1.EVENTS.CHAT_MESSAGE, (payload) => {
            let roomId = '';
            let participant;
            for (const [id, room] of RoomManager_1.rooms.entries()) {
                if (room.participants.has(socket.id)) {
                    roomId = id;
                    participant = room.participants.get(socket.id);
                    break;
                }
            }
            if (!roomId || !participant)
                return;
            const room = RoomManager_1.rooms.get(roomId);
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
            io.to(roomId).emit(socketEvents_1.EVENTS.CHAT_BROADCAST, message);
        });
        socket.on('disconnect', () => {
            // Find which room this socket belongs to
            let roomId = '';
            let disconnectedParticipant;
            for (const [id, room] of RoomManager_1.rooms.entries()) {
                if (room.participants.has(socket.id)) {
                    roomId = id;
                    disconnectedParticipant = room.participants.get(socket.id);
                    break;
                }
            }
            if (!roomId || !disconnectedParticipant)
                return;
            const room = RoomManager_1.rooms.get(roomId);
            disconnectedParticipant.status = 'disconnected';
            io.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, disconnectedParticipant);
            const timer = setTimeout(() => {
                const p = room.participants.get(socket.id);
                if (p && p.status === 'disconnected') {
                    room.participants.delete(socket.id);
                    io.to(roomId).emit(socketEvents_1.EVENTS.PARTICIPANT_UPDATE, { ...p, status: 'removed' });
                    if (p.role === 'host') {
                        io.to(roomId).emit(socketEvents_1.EVENTS.HOST_LEFT);
                    }
                    if (room.participants.size === 0) {
                        RoomManager_1.rooms.delete(roomId);
                    }
                }
                disconnectTimers.delete(socket.id);
            }, 30000);
            disconnectTimers.set(socket.id, timer);
        });
    });
};
exports.setupSocketHandlers = setupSocketHandlers;
