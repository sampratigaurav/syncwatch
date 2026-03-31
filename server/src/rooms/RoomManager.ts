import { RoomState, Participant } from '../../../shared/types';

export const rooms = new Map<string, RoomState>();

const ROOM_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Periodically remove rooms that have been alive for more than 24 hours
export const startRoomCleanup = () => {
  setInterval(() => {
    const now = Date.now();
    for (const [id, room] of rooms.entries()) {
      if (now - room.createdAt > ROOM_TTL_MS) {
        rooms.delete(id);
      }
    }
  }, 60 * 60 * 1000); // run hourly
};

export const createRoom = (id: string, passwordHash: string | null = null, passwordSalt: string | null = null): RoomState => {
  const newRoom: RoomState = {
    id,
    createdAt: Date.now(),
    hasPassword: passwordHash !== null,
    password: passwordHash,
    passwordSalt,
    playback: {
      isPlaying: false,
      currentTime: 0,
      lastUpdatedAt: Date.now(),
      hostId: ''
    },
    subtitleState: {
      isEnabled: false,
      trackIndex: 0
    },
    participants: new Map<string, Participant>(),
    chatHistory: [],
    fileHash: null,
    fileName: null,
    fileSize: null,
    controlPolicy: 'host_only',
    controllerIds: [],
    voiceParticipants: []
  };
  rooms.set(id, newRoom);
  return newRoom;
};

export const deleteRoom = (id: string) => {
  rooms.delete(id);
};
