import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRoomStore } from '../store/roomStore';
import { EVENTS } from '../../../shared/socketEvents';
import type { Participant } from '../../../shared/types';
import { SERVER_URL } from '../lib/config';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
});

export const useSocket = () => {
  const { 
    setIsConnected, setLatency, addChatMessage, setParticipants, 
    setPlayback, setRole, setConnectionStatus, setReconnectAttempt 
  } = useRoomStore();

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempt(0);
      if (useRoomStore.getState().roomId && useRoomStore.getState().nickname) {
        socket.emit(EVENTS.JOIN_ROOM, { roomId: useRoomStore.getState().roomId, nickname: useRoomStore.getState().nickname });
      }
    };

    if (socket.connected) {
      onConnect();
    }

    socket.connect();

    socket.on('connect', onConnect);

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('reconnecting');
      }
    });

    socket.on('connect_error', () => {
      const state = useRoomStore.getState();
      if (state.connectionStatus !== 'reconnecting') {
        setConnectionStatus('failed');
      }
    });

    socket.on('reconnect_attempt', (attempt) => {
      setConnectionStatus('reconnecting');
      setReconnectAttempt(attempt);
    });

    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      setReconnectAttempt(0);
      const state = useRoomStore.getState();
      if (state.roomId && state.nickname) {
        socket.emit(EVENTS.JOIN_ROOM, { roomId: state.roomId, nickname: state.nickname });
      }
    });

    socket.on('reconnect_failed', () => {
      setConnectionStatus('failed');
    });

    socket.on(EVENTS.ROOM_NOT_FOUND, () => {
      setConnectionStatus('room_not_found');
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
       useRoomStore.getState().setControlPolicy(roomState.controlPolicy, roomState.controllerIds);
       const me = roomState.participants.find((p: Participant) => p.id === socket.id);
       if (me) setRole(me.role);
    });

    socket.on(EVENTS.CONTROL_POLICY_UPDATE, (payload: { policy: any, controllerIds: string[] }) => {
       useRoomStore.getState().setControlPolicy(payload.policy, payload.controllerIds);
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
      socket.off('connect_error');
      socket.off('reconnect_attempt');
      socket.off('reconnect');
      socket.off('reconnect_failed');
      socket.off(EVENTS.ROOM_NOT_FOUND);
      socket.off(EVENTS.CHAT_BROADCAST);
      socket.off(EVENTS.PARTICIPANT_UPDATE);
      socket.off(EVENTS.ROOM_STATE);
      socket.off(EVENTS.CONTROL_POLICY_UPDATE);
      socket.off(EVENTS.PONG);
      socket.off(EVENTS.HOST_LEFT);
    };
  }, [setIsConnected, setLatency, addChatMessage, setParticipants, setPlayback, setRole, setConnectionStatus, setReconnectAttempt]);

  return socket;
};
