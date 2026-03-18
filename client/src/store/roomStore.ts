import { create } from 'zustand';
import type { ParticipantRole, Participant, PlaybackState, ChatMessage } from '../../../shared/types';
import { socket } from '../hooks/useSocket';

interface RoomStore {
  roomId: string | null;
  nickname: string;
  role: ParticipantRole | null;
  participants: Participant[];
  playback: PlaybackState | null;
  fileHash: string | null;
  fileName: string | null;
  fileVerifyStatus: 'idle' | 'computing' | 'verified' | 'mismatch';
  chatMessages: ChatMessage[];
  latencyMs: number;
  isConnected: boolean;
  theme: 'dark' | 'light';
  localFileUrl: string | null;
  controlPolicy: 'host_only' | 'everyone' | 'selected';
  controllerIds: string[];
  lastActionAt: number;
  
  setLastActionAt: () => void;
  setRoomId: (id: string | null) => void;
  setNickname: (name: string) => void;
  setRole: (role: ParticipantRole | null) => void;
  setParticipants: (p: Participant[]) => void;
  setPlayback: (p: PlaybackState | null) => void;
  setFileDetails: (hash: string | null, name: string | null) => void;
  setVerifyStatus: (s: 'idle' | 'computing' | 'verified' | 'mismatch') => void;
  addChatMessage: (msg: ChatMessage) => void;
  setLatency: (ms: number) => void;
  setIsConnected: (connected: boolean) => void;
  toggleTheme: () => void;
  setLocalFileUrl: (url: string | null) => void;
  setControlPolicy: (policy: 'host_only' | 'everyone' | 'selected', ids: string[]) => void;
  canIControl: () => boolean;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  roomId: null,
  nickname: localStorage.getItem('nickname') || '',
  role: null,
  participants: [],
  playback: null,
  fileHash: null,
  fileName: null,
  fileVerifyStatus: 'idle',
  chatMessages: [],
  latencyMs: 0,
  isConnected: false,
  theme: (localStorage.getItem('theme') as 'dark'|'light') || 'dark',
  localFileUrl: null,
  controlPolicy: 'host_only',
  controllerIds: [],
  lastActionAt: 0,

  setLastActionAt: () => set({ lastActionAt: Date.now() }),
  setRoomId: (id) => set({ roomId: id }),
  setNickname: (name) => {
    localStorage.setItem('nickname', name);
    set({ nickname: name });
  },
  setRole: (role) => set({ role: role }),
  setParticipants: (p) => set({ participants: p }),
  setPlayback: (p) => set({ playback: p }),
  setFileDetails: (hash, name) => set({ fileHash: hash, fileName: name }),
  setVerifyStatus: (s) => set({ fileVerifyStatus: s }),
  addChatMessage: (msg) => set((state) => {
    const next = [...state.chatMessages, msg];
    return { chatMessages: next.slice(-100) };
  }),
  setLatency: (ms) => set({ latencyMs: ms }),
  setIsConnected: (C) => set({ isConnected: C }),
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', next);
    return { theme: next };
  }),
  setLocalFileUrl: (url) => set({ localFileUrl: url }),
  setControlPolicy: (policy, ids) => set({ controlPolicy: policy, controllerIds: ids }),
  canIControl: () => {
    const state = get();
    if (state.controlPolicy === 'everyone') return true;
    if (state.controlPolicy === 'host_only') {
      return state.role === 'host';
    }
    if (state.controlPolicy === 'selected') {
      return state.role === 'host' || state.controllerIds.includes(socket.id!);
    }
    return false;
  }
}));
