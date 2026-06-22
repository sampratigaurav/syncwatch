import { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { PlaybackEvent } from '../../../shared/types';

import toast from 'react-hot-toast';

export const useVideoSync = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const { setLastActionAt } = useRoomStore(useShallow(state => ({
    setLastActionAt: state.setLastActionAt
  })));
  const hasControl = useRoomStore(state => state.canIControl());
  const isApplyingRemoteEvent = useRef(false);

  useEffect(() => {
    const handleRemoteBroadcast = (event: PlaybackEvent) => {
      const video = videoRef.current;
      if (!video) return;

      if (event.action !== 'sync_check') {
        isApplyingRemoteEvent.current = true;
        
        useRoomStore.getState().setLastActionAt();
        const state = useRoomStore.getState();
        const existingPlayback = state.playback || { isPlaying: false, currentTime: 0, lastUpdatedAt: Date.now(), hostId: '' };
        state.setPlayback({
          ...existingPlayback,
          currentTime: event.currentTime,
          isPlaying: event.action === 'play' ? true : event.action === 'pause' ? false : existingPlayback.isPlaying,
          lastActionBy: event.lastActionBy,
          lastActionNickname: event.lastActionNickname
        });
      }

      if (event.action === 'play') {
        if (event.lastActionNickname) toast(`${event.lastActionNickname} played the video`, { icon: '▶️', id: 'play' });
        
        // Hybrid Buffering: Detach slow viewers if host overrides and forces play
        if (video.readyState < 3 && !hasControl) {
           useRoomStore.getState().setIsDetached(true);
           socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: false });
           toast("You're buffering slowly. Detached from strict sync to let others watch.", { icon: '🐌' });
        }

        if (Math.abs(video.currentTime - event.currentTime) > 2.0) {
          video.currentTime = event.currentTime;
        }
        if (video.paused) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch(error => {
              console.warn("Auto-play blocked by browser. User interaction needed:", error);
            });
          }
        }
      } else if (event.action === 'pause') {
        if (event.lastActionNickname) toast(`${event.lastActionNickname} paused the video`, { icon: '⏸️', id: 'pause' });
        useRoomStore.getState().setIsDetached(false);
        video.currentTime = event.currentTime;
        if (!video.paused) {
          video.pause();
        }
      } else if (event.action === 'seek') {
        useRoomStore.getState().setIsDetached(false);
        video.currentTime = event.currentTime;
      }

      // Reset the flag shortly after
      setTimeout(() => {
        isApplyingRemoteEvent.current = false;
      }, 250);
    };

    // --- Media Session API Integration ---
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        const video = videoRef.current;
        if (video && hasControl) {
          video.play();
          socket.emit(EVENTS.PLAYBACK_EVENT, {
            action: 'play',
            currentTime: video.currentTime,
            timestamp: Date.now()
          });
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        const video = videoRef.current;
        if (video && hasControl) {
          video.pause();
          socket.emit(EVENTS.PLAYBACK_EVENT, {
            action: 'pause',
            currentTime: video.currentTime,
            timestamp: Date.now()
          });
        }
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        const video = videoRef.current;
        if (video && hasControl && details.seekTime !== undefined) {
          video.currentTime = details.seekTime;
          socket.emit(EVENTS.PLAYBACK_EVENT, {
            action: 'seek',
            currentTime: video.currentTime,
            timestamp: Date.now()
          });
        }
      });
    }
    // -------------------------------------

    const handleSubtitleBroadcast = (event: { isEnabled: boolean, trackIndex: number }) => {
      useRoomStore.getState().setSubtitleEnabled(event.isEnabled);
    };

    const handleRoomState = (roomState: any) => {
      const video = videoRef.current;
      if (!video || !roomState.playback) return;
      
      isApplyingRemoteEvent.current = true;
      
      if (Math.abs(video.currentTime - roomState.playback.currentTime) > 2.0) {
        video.currentTime = roomState.playback.currentTime;
      }

      if (roomState.playback.isPlaying) {
        if (video.paused) {
          video.play().catch(e => console.warn("Auto-play blocked:", e));
        }
      } else {
        if (!video.paused) {
          video.pause();
        }
      }

      setTimeout(() => {
        isApplyingRemoteEvent.current = false;
      }, 250);
    };

    socket.on(EVENTS.PLAYBACK_BROADCAST, handleRemoteBroadcast);
    socket.on(EVENTS.SUBTITLE_STATE_BROADCAST, handleSubtitleBroadcast);
    socket.on(EVENTS.ROOM_STATE, handleRoomState);

    return () => {
      socket.off(EVENTS.PLAYBACK_BROADCAST, handleRemoteBroadcast);
      socket.off(EVENTS.SUBTITLE_STATE_BROADCAST, handleSubtitleBroadcast);
      socket.off(EVENTS.ROOM_STATE, handleRoomState);
    };
  }, []); // Empty deps to register exactly once

  const isDelayingPlay = useRef(false);

  // Expose these handlers to the native video element
  const handlePlay = () => {
    if (!hasControl) return;
    if (isApplyingRemoteEvent.current) return;
    if (isDelayingPlay.current) return;
    
    setLastActionAt();
    
    const state = useRoomStore.getState();
    const video = videoRef.current;
    if (!video) return;

    const targetTime = video.currentTime + (state.latencyMs / 2000);
    const delayMs = state.latencyMs / 2;

    // Pause immediately to wait for the network delay (half RTT)
    isDelayingPlay.current = true;
    video.pause();

    socket.emit(EVENTS.PLAYBACK_EVENT, { 
      action: 'play', 
      currentTime: targetTime, 
      timestamp: Date.now() 
    });

    setTimeout(() => {
      if (videoRef.current) {
        isApplyingRemoteEvent.current = true;
        videoRef.current.currentTime = targetTime;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(e => console.warn("Auto-play blocked:", e)).finally(() => {
            isApplyingRemoteEvent.current = false;
            isDelayingPlay.current = false;
          });
        } else {
          isApplyingRemoteEvent.current = false;
          isDelayingPlay.current = false;
        }
      } else {
        isDelayingPlay.current = false;
      }
    }, delayMs);
  };

  const handlePause = () => {
    if (!hasControl) return;
    if (isApplyingRemoteEvent.current) return;
    if (isDelayingPlay.current) return;

    setLastActionAt();

    socket.emit(EVENTS.PLAYBACK_EVENT, { action: 'pause', currentTime: videoRef.current?.currentTime || 0, timestamp: Date.now() });
  };

  const handleSeeked = () => {
    if (!hasControl) return;
    if (isApplyingRemoteEvent.current) return;
    if (isDelayingPlay.current) return;

    setLastActionAt();
    
    // Proactive store sync
    const state = useRoomStore.getState();
    const existingPlayback = state.playback || { isPlaying: false, currentTime: 0, lastUpdatedAt: Date.now(), hostId: '' };
    state.setPlayback({
      ...existingPlayback,
      currentTime: videoRef.current?.currentTime || 0
    });

    socket.emit(EVENTS.PLAYBACK_EVENT, { action: 'seek', currentTime: videoRef.current?.currentTime || 0, timestamp: Date.now() });
  };

  const handleWaiting = () => {
    if (useRoomStore.getState().isDetached) return;
    socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: true });
  };

  const handleCanPlay = () => {
    if (useRoomStore.getState().isDetached && videoRef.current) {
      const state = useRoomStore.getState();
      const hostTime = state.playback?.currentTime || 0;
      if (Math.abs(videoRef.current.currentTime - hostTime) < 3.0) {
        state.setIsDetached(false);
        toast("Caught up to the host. Re-attached to strict sync.", { icon: '🚀' });
      }
    }
    socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: false });
  };

  const handlePlaying = () => {
    socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: false });
  };

  return { handlePlay, handlePause, handleSeeked, handleWaiting, handleCanPlay, handlePlaying };
};
