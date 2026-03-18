import { create } from 'zustand';
import type { ParticipantRole, Participant, PlaybackState, ChatMessage } from '../../../shared/types';

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
}

export const useRoomStore = create<RoomStore>((set) => ({
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
  setLocalFileUrl: (url) => set({ localFileUrl: url })
}));
