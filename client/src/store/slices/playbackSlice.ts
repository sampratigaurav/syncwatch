import type { StateCreator } from 'zustand';
import type { RoomStore } from '../roomStore';
import type { PlaybackState } from '../../../../shared/types';
import { socket } from '../../hooks/useSocket';

export interface PlaybackSlice {
  playback: PlaybackState | null;
  fileHash: string | null;
  fileName: string | null;
  fileVerifyStatus: 'idle' | 'computing' | 'verified' | 'mismatch';
  mismatchError: string | null;
  latencyMs: number;
  localFileUrl: string | null;
  magnetURI: string | null;
  isTorrent: boolean;
  torrentHealth: { peers: number; speed: number; progress: number } | null;
  isDetached: boolean;
  isJumpingToLive: boolean;
  controlPolicy: 'host_only' | 'everyone' | 'selected';
  controllerIds: string[];
  lastActionAt: number;
  subtitleBlobUrl: string | null;
  subtitleEnabled: boolean;
  directoryHandles: any[];

  setPlayback: (p: PlaybackState | null) => void;
  setFileDetails: (hash: string | null, name: string | null) => void;
  setVerifyStatus: (s: 'idle' | 'computing' | 'verified' | 'mismatch') => void;
  setMismatchError: (err: string | null) => void;
  setLatency: (ms: number) => void;
  setLocalFileUrl: (url: string | null) => void;
  setSubtitleBlobUrl: (url: string | null) => void;
  setSubtitleEnabled: (enabled: boolean) => void;
  setMagnetURI: (uri: string | null) => void;
  setIsTorrent: (is: boolean) => void;
  setTorrentHealth: (health: { peers: number; speed: number; progress: number } | null) => void;
  setIsDetached: (detached: boolean) => void;
  setIsJumpingToLive: (jumping: boolean) => void;
  setControlPolicy: (policy: 'host_only' | 'everyone' | 'selected', ids: string[]) => void;
  setDirectoryHandles: (handles: any[]) => void;
  setLastActionAt: () => void;
  canIControl: () => boolean;
}

export const createPlaybackSlice: StateCreator<RoomStore, [], [], PlaybackSlice> = (set, get) => ({
  playback: null,
  fileHash: null,
  fileName: null,
  fileVerifyStatus: 'idle',
  mismatchError: null,
  latencyMs: 0,
  localFileUrl: null,
  magnetURI: null,
  isTorrent: false,
  torrentHealth: null,
  isDetached: false,
  isJumpingToLive: false,
  controlPolicy: 'host_only',
  controllerIds: [],
  lastActionAt: 0,
  subtitleBlobUrl: null,
  subtitleEnabled: false,
  directoryHandles: [],

  setPlayback: (p) => set({ playback: p }),
  setFileDetails: (hash, name) => set({ fileHash: hash, fileName: name }),
  setVerifyStatus: (s) => set({ fileVerifyStatus: s }),
  setMismatchError: (err) => set({ mismatchError: err }),
  setLatency: (ms) => set({ latencyMs: ms }),
  setLocalFileUrl: (url) => set({ localFileUrl: url }),
  setMagnetURI: (uri) => set({ magnetURI: uri }),
  setIsTorrent: (is) => set({ isTorrent: is }),
  setTorrentHealth: (health) => set({ torrentHealth: health }),
  setIsDetached: (detached) => set({ isDetached: detached }),
  setIsJumpingToLive: (jumping) => set({ isJumpingToLive: jumping }),
  setSubtitleBlobUrl: (url) => set({ subtitleBlobUrl: url }),
  setSubtitleEnabled: (enabled) => set({ subtitleEnabled: enabled }),
  setControlPolicy: (policy, ids) => set({ controlPolicy: policy, controllerIds: ids }),
  setDirectoryHandles: (handles) => set({ directoryHandles: handles }),
  setLastActionAt: () => set({ lastActionAt: Date.now() }),

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
  },
});
