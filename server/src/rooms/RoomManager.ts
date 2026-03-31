import { createClient } from 'redis';
import { RoomState, Participant } from '../../../shared/types';

// Serialized form stored in Redis — participants as array instead of Map
interface SerializedRoomState extends Omit<RoomState, 'participants'> {
  participants: Participant[];
}

export const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => console.error('Redis client error:', err));

redisClient.connect();

const ROOM_KEY = (id: string) => `room:${id}`;
const TTL = 86400; // 24 hours

function serialize(room: RoomState): string {
  const serializable: SerializedRoomState = {
    ...room,
    participants: Array.from(room.participants.values())
  };
  return JSON.stringify(serializable);
}

function deserialize(json: string): RoomState {
  const data: SerializedRoomState = JSON.parse(json);
  return {
    ...data,
    participants: new Map(data.participants.map((p) => [p.id, p]))
  };
}

// No-op: Redis TTL handles room expiry automatically
export const startRoomCleanup = () => {};

export const createRoom = async (id: string, passwordHash: string | null = null, passwordSalt: string | null = null): Promise<RoomState> => {
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
  await redisClient.set(ROOM_KEY(id), serialize(newRoom), { EX: TTL });
  return newRoom;
};

export const getRoom = async (id: string): Promise<RoomState | null> => {
  const json = await redisClient.get(ROOM_KEY(id));
  if (!json) return null;
  return deserialize(json);
};

export const setRoom = async (room: RoomState): Promise<void> => {
  await redisClient.set(ROOM_KEY(room.id), serialize(room), { EX: TTL });
};

export const deleteRoom = async (id: string): Promise<void> => {
  await redisClient.del(ROOM_KEY(id));
};
