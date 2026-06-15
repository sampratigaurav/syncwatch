import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { EVENTS } from '../../../shared/socketEvents';
import type { Participant } from '../../../shared/types';
import toast from 'react-hot-toast';
import { SERVER_URL } from '../lib/config';
import { useSoundEffects } from './useSoundEffects';

export const socket: Socket = io(SERVER_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 20000,
});

export const useSocket = (navigate?: (to: string) => void) => {
  const { 
    setIsConnected, setLatency, addChatMessage, setParticipants, 
    setPlayback, setRole, setConnectionStatus, setReconnectAttempt 
  } = useRoomStore(useShallow(state => ({
    setIsConnected: state.setIsConnected,
    setLatency: state.setLatency,
    addChatMessage: state.addChatMessage,
    setParticipants: state.setParticipants,
    setPlayback: state.setPlayback,
    setRole: state.setRole,
    setConnectionStatus: state.setConnectionStatus,
    setReconnectAttempt: state.setReconnectAttempt
  })));

  const { playJoinSound, playLeaveSound, playMessageSound } = useSoundEffects();

  useEffect(() => {
    // Track the last time we emitted JOIN_ROOM to prevent double-emit
    // from the connect + reconnect events firing in rapid succession.
    let lastJoinEmittedAt = 0;

    const emitJoinRoom = () => {
      const now = Date.now();
      // Debounce: ignore if we already emitted within the last 1 second
      if (now - lastJoinEmittedAt < 1000) return;
      lastJoinEmittedAt = now;
      const state = useRoomStore.getState();
      if (state.roomId && state.nickname) {
        socket.emit(EVENTS.JOIN_ROOM, { 
          roomId: state.roomId, 
          nickname: state.nickname,
          password: state.roomPassword || undefined,
          reconnectToken: state.reconnectToken || undefined,
        });
      }
    };

    const onConnect = () => {
      setIsConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempt(0);
      emitJoinRoom();
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
        toast.loading('Connection lost, reconnecting...', { id: 'reconnect' });
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
      toast.dismiss('reconnect');
      toast.success('Reconnected successfully!');
      // NOTE: socket.io fires both 'reconnect' AND 'connect' on a successful reconnect.
      // emitJoinRoom() is debounced to prevent double-emitting JOIN_ROOM which would
      // consume the single-use reconnect token on the first call, then assign viewer
      // role on the second call (because the token is already gone).
      emitJoinRoom();
    });

    socket.on('reconnect_failed', () => {
      setConnectionStatus('failed');
    });

    socket.on(EVENTS.ROOM_NOT_FOUND, () => {
      setConnectionStatus('room_not_found');
    });

    socket.on(EVENTS.ROOM_REQUIRES_PASSWORD, () => {
      useRoomStore.getState().setErrorToast('Room requires a PIN.');
      if (navigate) navigate('/');
    });
    
    socket.on(EVENTS.WRONG_PASSWORD, () => {
      useRoomStore.getState().setErrorToast('Incorrect room PIN.');
      if (navigate) navigate('/');
    });

    socket.on(EVENTS.HOST_LEFT, () => {
      useRoomStore.getState().setErrorToast('The host has left the room.');
      if (navigate) navigate('/');
    });

    // Store the reconnect token issued by the server so we can present it on reconnection
    socket.on(EVENTS.RECONNECT_TOKEN, (data: { token: string }) => {
      if (data && typeof data.token === 'string') {
        useRoomStore.getState().setReconnectToken(data.token);
      }
    });

    socket.on(EVENTS.CHAT_BROADCAST, (msg) => {
      addChatMessage(msg);
      if (msg.senderId !== socket.id && msg.senderId !== 'system') {
        playMessageSound();
      }
    });

    socket.on(EVENTS.PARTICIPANT_UPDATE, (participant) => {
      setTimeout(() => {
        const state = useRoomStore.getState();
        const existing = state.participants.find(p => p.id === participant.id);
        
        if (participant.status === 'removed') {
          setParticipants(state.participants.filter(p => p.id !== participant.id));
          if (participant.id !== socket.id) {
            playLeaveSound();
            toast(`${participant.nickname} left`, { icon: '👋', id: `leave-${participant.id}` });
          }
        } else if (existing) {
          setParticipants(state.participants.map(p => p.id === participant.id ? participant : p));
        } else {
          setParticipants([...state.participants, participant]);
          if (participant.id !== socket.id) {
            playJoinSound();
            toast.success(`${participant.nickname} joined`, { id: `join-${participant.id}` });
          }
        }
      }, 0);
    });

    socket.on(EVENTS.ROOM_STATE, (roomState) => {
       setParticipants(roomState.participants);
       setPlayback(roomState.playback);
       useRoomStore.getState().setControlPolicy(roomState.controlPolicy, roomState.controllerIds);
       useRoomStore.getState().setRoomHasPassword(roomState.hasPassword);
       if (roomState.chatHistory) {
         useRoomStore.getState().setChatMessages(roomState.chatHistory);
       }
       // NOTE: Do NOT clear roomPassword here. It must survive reconnect cycles so it
       // can be re-sent with JOIN_ROOM if the socket drops and reconnects for a password room.
       // It is cleared in clearRoomState() when the user intentionally leaves.
       const me = roomState.participants.find((p: Participant) => p.id === socket.id);
       if (me) setRole(me.role);
    });

    socket.on(EVENTS.CONTROL_POLICY_UPDATE, (payload: { policy: any, controllerIds: string[] }) => {
       useRoomStore.getState().setControlPolicy(payload.policy, payload.controllerIds);
    });

    socket.on(EVENTS.RECONNECT_TOKEN, (payload: { token: string }) => {
       useRoomStore.getState().setReconnectToken(payload.token);
    });

    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit(EVENTS.PING, { sentAt: Date.now() });
      }
    }, 10000);

    const rttHistory: number[] = [];

    socket.on(EVENTS.PONG, (data: { sentAt: number }) => {
      const rtt = Date.now() - data.sentAt;
      rttHistory.push(rtt);
      if (rttHistory.length > 5) {
        rttHistory.shift();
      }
      const avgRtt = rttHistory.reduce((sum, val) => sum + val, 0) / rttHistory.length;
      setLatency(avgRtt);
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
      socket.off(EVENTS.ROOM_REQUIRES_PASSWORD);
      socket.off(EVENTS.WRONG_PASSWORD);
      socket.off(EVENTS.RECONNECT_TOKEN);
      socket.off(EVENTS.CHAT_BROADCAST);
      socket.off(EVENTS.PARTICIPANT_UPDATE);
      socket.off(EVENTS.ROOM_STATE);
      socket.off(EVENTS.CONTROL_POLICY_UPDATE);
      socket.off(EVENTS.PONG);
      socket.off(EVENTS.HOST_LEFT);
    };
  }, [setIsConnected, setLatency, addChatMessage, setParticipants, setPlayback, setRole, setConnectionStatus, setReconnectAttempt, navigate]);

  return socket;
};
