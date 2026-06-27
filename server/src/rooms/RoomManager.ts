import { createClient } from 'redis';
import { RoomState, Participant } from '../../../shared/types';
import { logger } from '../utils/logger';
import { db } from '../firebase';

// Serialized form stored in Redis — participants as array instead of Map
interface SerializedRoomState extends Omit<RoomState, 'participants'> {
  participants: Participant[];
}

export const redisClient = createClient({ url: process.env.REDIS_URL });

redisClient.on('error', (err) => logger.error('Redis client error:', err));

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
    magnetURI: null,
    controlPolicy: 'host_only',
    controllerIds: [],
    voiceParticipants: []
  };
  await redisClient.set(ROOM_KEY(id), serialize(newRoom), { EX: TTL });
  return newRoom;
};

export const getRoom = async (id: string): Promise<RoomState | null> => {
  let json = await redisClient.get(ROOM_KEY(id));
  
  if (!json && db) {
    // Attempt hydration from Firestore using NX lock to prevent race conditions
    const lockKey = `lock:room:${id}`;
    const acquired = await redisClient.set(lockKey, 'true', { NX: true, PX: 5000 });
    
    if (acquired) {
      try {
        const docRef = db.collection('roomTemplates').doc(id);
        const docSnap = await docRef.get();
        
        if (docSnap.exists) {
          const template = docSnap.data();
          const newRoom: RoomState = {
            id,
            createdAt: Date.now(),
            hasPassword: !!template?.password,
            password: template?.password || null,
            passwordSalt: template?.passwordSalt || null,
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
            magnetURI: null,
            controlPolicy: template?.controlPolicy || 'host_only',
            controllerIds: [],
            voiceParticipants: []
          };
          await redisClient.set(ROOM_KEY(id), serialize(newRoom), { EX: TTL });
          json = await redisClient.get(ROOM_KEY(id));
        }
      } catch (err) {
        logger.error(`Error hydrating room ${id}:`, err);
      } finally {
        await redisClient.del(lockKey);
      }
    } else {
      // Wait for the lock to be released by the other worker, then try to get the room again
      await new Promise((resolve) => setTimeout(resolve, 500));
      json = await redisClient.get(ROOM_KEY(id));
    }
  }

  if (!json) return null;
  return deserialize(json);
};

export const setRoom = async (room: RoomState): Promise<void> => {
  await redisClient.set(ROOM_KEY(room.id), serialize(room), { EX: TTL });
};

export const deleteRoom = async (id: string): Promise<void> => {
  await redisClient.del(ROOM_KEY(id));
};
