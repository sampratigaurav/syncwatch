import type { StateCreator } from 'zustand';
import type { RoomStore } from '../roomStore';
import type { Participant, ParticipantRole } from '../../../../shared/types';

export interface ParticipantSlice {
  role: ParticipantRole | null;
  participants: Participant[];
  cachedFingerprintPayload: number[] | { size: number, duration: number } | null;

  setRole: (role: ParticipantRole | null) => void;
  setParticipants: (p: Participant[]) => void;
  setCachedFingerprintPayload: (payload: number[] | { size: number, duration: number } | null) => void;
}

export const createParticipantSlice: StateCreator<RoomStore, [], [], ParticipantSlice> = (set) => ({
  role: null,
  participants: [],
  cachedFingerprintPayload: null,

  setRole: (role) => set({ role }),
  setParticipants: (p) => set({ participants: p }),
  setCachedFingerprintPayload: (payload) => set({ cachedFingerprintPayload: payload }),
});
