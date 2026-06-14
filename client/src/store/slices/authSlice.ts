import type { StateCreator } from 'zustand';
import type { RoomStore } from '../roomStore';

export interface AuthSlice {
  roomId: string | null;
  nickname: string;
  isConnected: boolean;
  connectionStatus: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'failed' | 'room_not_found';
  reconnectAttempt: number;
  roomPassword: string | null;
  roomHasPassword: boolean;
  errorToast: string | null;
  reconnectToken: string | null;
  theme: 'dark' | 'light';

  setRoomId: (id: string | null) => void;
  setNickname: (name: string) => void;
  setIsConnected: (connected: boolean) => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'failed' | 'room_not_found') => void;
  setReconnectAttempt: (attempt: number) => void;
  setRoomPassword: (pass: string | null) => void;
  setRoomHasPassword: (has: boolean) => void;
  setErrorToast: (msg: string | null) => void;
  setReconnectToken: (token: string | null) => void;
  toggleTheme: () => void;
}

export const createAuthSlice: StateCreator<RoomStore, [], [], AuthSlice> = (set) => ({
  roomId: null,
  nickname: localStorage.getItem('nickname') || '',
  isConnected: false,
  connectionStatus: 'connecting',
  reconnectAttempt: 0,
  roomPassword: null,
  roomHasPassword: false,
  errorToast: null,
  reconnectToken: sessionStorage.getItem('reconnectToken') || null,
  theme: (localStorage.getItem('theme') as 'dark'|'light') || 'dark',

  setRoomId: (id) => set({ roomId: id }),
  setNickname: (name) => {
    localStorage.setItem('nickname', name);
    set({ nickname: name });
  },
  setIsConnected: (C) => set({ isConnected: C }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setReconnectAttempt: (attempt) => set({ reconnectAttempt: attempt }),
  setRoomPassword: (pass) => set({ roomPassword: pass }),
  setRoomHasPassword: (has) => set({ roomHasPassword: has }),
  setErrorToast: (msg) => set({ errorToast: msg }),
  setReconnectToken: (token) => {
    if (token) sessionStorage.setItem('reconnectToken', token);
    else sessionStorage.removeItem('reconnectToken');
    set({ reconnectToken: token });
  },
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    return { theme: next };
  }),
});
