import { Router } from 'express';
import { rooms, createRoom } from '../rooms/RoomManager';

export const roomRouter = Router();

roomRouter.post('/', (req, res) => {
  const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  createRoom(roomId);
  res.json({ roomId });
});

roomRouter.get('/:id/exists', (req, res) => {
  const { id } = req.params;
  const exists = rooms.has(id);
  res.json({ exists });
});
