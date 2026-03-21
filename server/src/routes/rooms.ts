import { Router } from 'express';
import crypto from 'crypto';
import { rooms, createRoom } from '../rooms/RoomManager';

export const roomRouter = Router();

roomRouter.post('/', (req, res) => {
  const { password } = req.body || {};
  let hash = null;
  
  if (password) {
    if (!/^\d{4}$/.test(password)) {
      return res.status(400).json({ error: 'Password must be exactly 4 digits' });
    }
    hash = crypto.createHash('sha256').update(password).digest('hex');
  }

  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  createRoom(roomId, hash);
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
