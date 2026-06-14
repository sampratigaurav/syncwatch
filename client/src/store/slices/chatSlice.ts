import type { StateCreator } from 'zustand';
import type { RoomStore } from '../roomStore';
import type { ChatMessage } from '../../../../shared/types';

export interface ChatSlice {
  chatMessages: ChatMessage[];

  addChatMessage: (msg: ChatMessage) => void;
  setChatMessages: (msgs: ChatMessage[]) => void;
}

export const createChatSlice: StateCreator<RoomStore, [], [], ChatSlice> = (set) => ({
  chatMessages: [],

  addChatMessage: (msg) => set((state) => {
    const next = [...state.chatMessages, msg];
    return { chatMessages: next.slice(-100) };
  }),
  setChatMessages: (msgs) => set({ chatMessages: msgs.slice(-100) }),
});
