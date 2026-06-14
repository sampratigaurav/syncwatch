import { create } from 'zustand';
import { createAuthSlice } from './slices/authSlice';
import type { AuthSlice } from './slices/authSlice';
import { createChatSlice } from './slices/chatSlice';
import type { ChatSlice } from './slices/chatSlice';
import { createPlaybackSlice } from './slices/playbackSlice';
import type { PlaybackSlice } from './slices/playbackSlice';
import { createParticipantSlice } from './slices/participantSlice';
import type { ParticipantSlice } from './slices/participantSlice';

export type ConnectionStatus = 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'failed' | 'room_not_found';

export type RoomStore = AuthSlice & ChatSlice & PlaybackSlice & ParticipantSlice & {
  clearRoomState: () => void;
};

export const useRoomStore = create<RoomStore>((set, get, api) => ({
  ...createAuthSlice(set, get, api),
  ...createChatSlice(set, get, api),
  ...createPlaybackSlice(set, get, api),
  ...createParticipantSlice(set, get, api),

  clearRoomState: () => {
    const state = get();
    if (state.subtitleBlobUrl) {
      URL.revokeObjectURL(state.subtitleBlobUrl);
    }
    set({
      roomId: null,
      role: null,
      participants: [],
      playback: null,
      fileHash: null,
      fileName: null,
      fileVerifyStatus: 'idle',
      chatMessages: [],
      latencyMs: 0,
      localFileUrl: null,
      controlPolicy: 'host_only',
      controllerIds: [],
      lastActionAt: 0,
      connectionStatus: 'connecting',
      reconnectAttempt: 0,
      subtitleBlobUrl: null,
      subtitleEnabled: false,
      roomPassword: null,
      roomHasPassword: false,
      errorToast: null,
      reconnectToken: null,
      directoryHandles: [],
    });
  },
}));
