"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRoom = exports.createRoom = exports.rooms = void 0;
exports.rooms = new Map();
const createRoom = (id) => {
    const newRoom = {
        id,
        createdAt: Date.now(),
        playback: {
            isPlaying: false,
            currentTime: 0,
            lastUpdatedAt: Date.now(),
            hostId: ''
        },
        participants: new Map(),
        chatHistory: [],
        fileHash: null,
        fileName: null,
        fileSize: null
    };
    exports.rooms.set(id, newRoom);
    return newRoom;
};
exports.createRoom = createRoom;
const deleteRoom = (id) => {
    exports.rooms.delete(id);
};
exports.deleteRoom = deleteRoom;
