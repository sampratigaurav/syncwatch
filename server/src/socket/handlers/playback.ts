import { Server, Socket } from 'socket.io';
import { rooms } from '../../rooms/RoomManager';
import { EVENTS } from '../../../../shared/socketEvents';
import { PlaybackEvent, ControlPolicy, RoomState } from '../../../../shared/types';

const VALID_CONTROL_POLICIES: ControlPolicy[] = ['host_only', 'everyone', 'selected'];

function canControl(room: RoomState, socketId: string): boolean {
  if (room.controlPolicy === 'everyone') return true;
  if (room.controlPolicy === 'host_only') return room.playback.hostId === socketId;
  if (room.controlPolicy === 'selected') {
    return room.playback.hostId === socketId || room.controllerIds.includes(socketId);
  }
  return false;
}

export function registerPlayback(io: Server, socket: Socket) {
  socket.on(EVENTS.PLAYBACK_EVENT, (payload: PlaybackEvent) => {
    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    const participant = room.participants.get(socket.id);
    if (!participant || !canControl(room, socket.id)) return;

    if (payload.action === 'play') room.playback.isPlaying = true;
    if (payload.action === 'pause') room.playback.isPlaying = false;

    if (payload.action === 'subtitle_toggle' || payload.action === 'subtitle_track_change') {
      if (payload.subtitleState) room.subtitleState = payload.subtitleState;
      socket.to(roomId).emit(EVENTS.SUBTITLE_STATE_BROADCAST, {
        isEnabled: room.subtitleState.isEnabled,
        trackIndex: room.subtitleState.trackIndex
      });
      return;
    }

    if (typeof payload.currentTime !== 'number' || !Number.isFinite(payload.currentTime) || payload.currentTime < 0) {
      socket.emit('error', { message: 'Invalid playback time' });
      return;
    }

    room.playback.currentTime = payload.currentTime;
    room.playback.lastUpdatedAt = Date.now();
    room.playback.lastActionBy = socket.id;
    room.playback.lastActionNickname = participant.nickname;

    socket.to(roomId).emit(EVENTS.PLAYBACK_BROADCAST, {
      ...payload,
      lastActionBy: socket.id,
      lastActionNickname: participant.nickname
    });
  });

  socket.on(EVENTS.SET_CONTROL_POLICY, (payload: { policy: ControlPolicy; controllerIds: string[] }) => {
    if (!payload || !VALID_CONTROL_POLICIES.includes(payload.policy)) {
      socket.emit('error', { message: 'Invalid control policy' });
      return;
    }
    if (!Array.isArray(payload.controllerIds)) {
      socket.emit('error', { message: 'Invalid controllerIds' });
      return;
    }

    let roomId = '';
    for (const [id, room] of rooms.entries()) {
      if (room.participants.has(socket.id)) { roomId = id; break; }
    }
    if (!roomId) return;

    const room = rooms.get(roomId)!;
    const participant = room.participants.get(socket.id);
    if (!participant || participant.role !== 'host') return;

    const validControllerIds = payload.controllerIds.filter(
      id => typeof id === 'string' && room.participants.has(id)
    );

    room.controlPolicy = payload.policy;
    room.controllerIds = validControllerIds;

    io.to(roomId).emit(EVENTS.CONTROL_POLICY_UPDATE, {
      policy: room.controlPolicy,
      controllerIds: room.controllerIds
    });
  });
}
