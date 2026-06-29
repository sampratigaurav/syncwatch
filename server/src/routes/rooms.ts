import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { promisify } from 'util';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createRoom, getRoom, deleteRoom, setRoom, redisClient } from '../rooms/RoomManager';
import { auth, db } from '../firebase';
import { Server } from 'socket.io';
import { EVENTS } from '../../../shared/socketEvents';

export const roomRouter = Router();

const pbkdf2Async = promisify(crypto.pbkdf2);

let rateLimiter: RateLimiterRedis | null = null;

const getRateLimiter = () => {
  if (!rateLimiter) {
    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rate_limit_rooms',
      points: 10, // 10 requests
      duration: 60, // per 60 seconds
    });
  }
  return rateLimiter;
};

const createRoomLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ipStr = req.ip || 'unknown';
  
  try {
    await getRateLimiter().consume(ipStr);
    next();
  } catch (rejRes) {
    if (rejRes instanceof Error) {
      // Redis connection error or RateLimiter error. Let it pass to not break app.
      console.error('RateLimiter error:', rejRes);
      next();
    } else {
      res.status(429).json({ error: 'Too many rooms created. Please try again later.' });
    }
  }
};

roomRouter.post('/', createRoomLimiter, async (req, res) => {
  const { password } = req.body || {};
  let hash: string | null = null;
  let salt: string | null = null;

  if (password) {
    if (typeof password !== 'string' || !/^[a-zA-Z0-9]{4,8}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be 4-8 alphanumeric characters' });
    }
    salt = crypto.randomBytes(16).toString('hex');
    const hashBuffer = await pbkdf2Async(password, salt, 100_000, 32, 'sha256');
    hash = hashBuffer.toString('hex');
  }

  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  await createRoom(roomId, hash, salt);
  res.json({ roomId });
});

roomRouter.get('/:id/exists', async (req, res) => {
  const { id } = req.params;
  const room = await getRoom(id);
  if (room) {
    res.json({ exists: true, hasPassword: room.hasPassword });
  } else {
    res.json({ exists: false, hasPassword: false });
  }
});

const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth!.verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

roomRouter.delete('/:id', requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const user = (req as any).user;
  
  try {
    const docRef = db!.collection('roomTemplates').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (docSnap.data()?.hostId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this room' });
    }
    
    // 1. Delete from Firestore
    await docRef.delete();
    
    // 2. Evict from Redis
    await deleteRoom(id);
    
    // 3. Kick active users
    const io: Server = req.app.get('io');
    if (io) {
      io.to(id).emit(EVENTS.ROOM_CLOSED, { message: 'The host has deleted this room.' });
      io.in(id).socketsLeave(id);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete room error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

roomRouter.patch('/:id/pin', requireAuth, async (req, res) => {
  const id = req.params.id as string;
  const user = (req as any).user;
  const { password } = req.body;
  
  try {
    const docRef = db!.collection('roomTemplates').doc(id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (docSnap.data()?.hostId !== user.uid) {
      return res.status(403).json({ error: 'Forbidden: You do not own this room' });
    }
    
    let hash: string | null = null;
    let salt: string | null = null;
    
    if (password) {
      if (typeof password !== 'string' || !/^[a-zA-Z0-9]{4,8}$/.test(password)) {
        return res.status(400).json({ error: 'Password must be 4-8 alphanumeric characters' });
      }
      salt = crypto.randomBytes(16).toString('hex');
      const hashBuffer = await pbkdf2Async(password, salt, 100_000, 32, 'sha256');
      hash = hashBuffer.toString('hex');
    }
    
    // Update Firestore with the safe hash and salt
    await docRef.update({
      password: hash, // either string or null
      passwordSalt: salt // either string or null
    });
    
    // Fix: Also update the active room in Redis so the PIN change takes effect immediately
    const activeRoom = await getRoom(id);
    if (activeRoom) {
      activeRoom.hasPassword = !!hash;
      activeRoom.password = hash;
      activeRoom.passwordSalt = salt;
      await setRoom(activeRoom);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update room PIN error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
