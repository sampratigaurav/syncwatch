import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRoomStore } from '../store/roomStore';
import { EVENTS } from '../../../shared/socketEvents';
import type { Participant } from '../../../shared/types';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
});

export const useSocket = () => {
  const { setIsConnected, setLatency, addChatMessage, setParticipants, setPlayback, setRole } = useRoomStore();

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      if (useRoomStore.getState().roomId && useRoomStore.getState().nickname) {
        socket.emit(EVENTS.JOIN_ROOM, { roomId: useRoomStore.getState().roomId, nickname: useRoomStore.getState().nickname });
      }
    };

    if (socket.connected) {
      onConnect();
    }

    socket.connect();

    socket.on('connect', onConnect);

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on(EVENTS.HOST_LEFT, () => {
      alert('Host has left');
      window.location.href = '/';
    });

    socket.on(EVENTS.CHAT_BROADCAST, (msg) => {
      addChatMessage(msg);
    });

    socket.on(EVENTS.PARTICIPANT_UPDATE, (participant) => {
      setTimeout(() => {
        const state = useRoomStore.getState();
        const existing = state.participants.find(p => p.id === participant.id);
        
        if (participant.status === 'removed') {
          setParticipants(state.participants.filter(p => p.id !== participant.id));
        } else if (existing) {
          setParticipants(state.participants.map(p => p.id === participant.id ? participant : p));
        } else {
          setParticipants([...state.participants, participant]);
        }
      }, 0);
    });

    socket.on(EVENTS.ROOM_STATE, (roomState) => {
       setParticipants(roomState.participants);
       setPlayback(roomState.playback);
       const me = roomState.participants.find((p: Participant) => p.id === socket.id);
       if (me) setRole(me.role);
    });

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit(EVENTS.PING, { sentAt: Date.now() });
      }
    }, 10000);

    socket.on(EVENTS.PONG, (data: { sentAt: number }) => {
      const latency = (Date.now() - data.sentAt) / 2;
      setLatency(latency);
    });

    return () => {
      clearInterval(pingInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off(EVENTS.CHAT_BROADCAST);
      socket.off(EVENTS.PARTICIPANT_UPDATE);
      socket.off(EVENTS.ROOM_STATE);
      socket.off(EVENTS.PONG);
      socket.off(EVENTS.HOST_LEFT);
    };
  }, [setIsConnected, setLatency, addChatMessage, setParticipants, setPlayback, setRole]);

  return socket;
};
