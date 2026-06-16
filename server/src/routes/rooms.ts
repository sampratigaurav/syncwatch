import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { promisify } from 'util';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { createRoom, getRoom, redisClient } from '../rooms/RoomManager';

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
