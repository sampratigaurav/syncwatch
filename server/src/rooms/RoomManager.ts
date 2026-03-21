import { RoomState, Participant } from '../../../shared/types';

export const rooms = new Map<string, RoomState>();

export const createRoom = (id: string, passwordHash: string | null = null): RoomState => {
  const newRoom: RoomState = {
    id,
    createdAt: Date.now(),
    hasPassword: passwordHash !== null,
    password: passwordHash,
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
    controllerIds: []
  };
  rooms.set(id, newRoom);
  return newRoom;
};

export const deleteRoom = (id: string) => {
  rooms.delete(id);
};
