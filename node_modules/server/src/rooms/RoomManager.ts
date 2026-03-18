import { RoomState, Participant } from '../../../shared/types';

export const rooms = new Map<string, RoomState>();

export const createRoom = (id: string): RoomState => {
  const newRoom: RoomState = {
    id,
    createdAt: Date.now(),
    playback: {
      isPlaying: false,
      currentTime: 0,
      lastUpdatedAt: Date.now(),
      hostId: ''
    },
    participants: new Map<string, Participant>(),
    chatHistory: [],
    fileHash: null,
    fileName: null,
    fileSize: null
  };
  rooms.set(id, newRoom);
  return newRoom;
};

export const deleteRoom = (id: string) => {
  rooms.delete(id);
};
