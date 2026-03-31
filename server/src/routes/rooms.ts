import { Router } from 'express';
import crypto from 'crypto';
import { rooms, createRoom } from '../rooms/RoomManager';

export const roomRouter = Router();

roomRouter.post('/', (req, res) => {
  const { password } = req.body || {};
  let hash: string | null = null;
  let salt: string | null = null;

  if (password) {
    if (!/^\d{4}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be exactly 4 digits' });
    }
    salt = crypto.randomBytes(16).toString('hex');
    hash = crypto.pbkdf2Sync(password, salt, 100_000, 32, 'sha256').toString('hex');
  }

  const roomId = crypto.randomBytes(3).toString('hex').toUpperCase();
  createRoom(roomId, hash, salt);
  res.json({ roomId });
});

roomRouter.get('/:id/exists', (req, res) => {
  const { id } = req.params;
  const room = rooms.get(id);
  if (room) {
    res.json({ exists: true, hasPassword: room.hasPassword });
  } else {
    res.json({ exists: false, hasPassword: false });
  }
});
