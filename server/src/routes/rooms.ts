import { Router } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { createRoom, getRoom } from '../rooms/RoomManager';

export const roomRouter = Router();

// Max 10 room creations per IP per minute
const createRoomLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many rooms created. Please try again later.' }
});

roomRouter.post('/', createRoomLimiter, async (req, res) => {
  const { password } = req.body || {};
  let hash: string | null = null;
  let salt: string | null = null;

  if (password) {
    if (typeof password !== 'string' || !/^[a-zA-Z0-9]{4,8}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be 4-8 alphanumeric characters' });
    }
    salt = crypto.randomBytes(16).toString('hex');
    hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex');
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
