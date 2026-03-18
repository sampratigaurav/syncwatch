import { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { PlaybackEvent } from '../../../shared/types';

export const useVideoSync = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const { canIControl, setLastActionAt } = useRoomStore();
  const hasControl = canIControl();
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
        if (Math.abs(video.currentTime - event.currentTime) > 0.5) {
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
        video.currentTime = event.currentTime;
        if (!video.paused) {
          video.pause();
        }
      } else if (event.action === 'seek') {
        video.currentTime = event.currentTime;
      }

      // Reset the flag shortly after
      setTimeout(() => {
        isApplyingRemoteEvent.current = false;
      }, 50);
    };

    socket.on(EVENTS.PLAYBACK_BROADCAST, handleRemoteBroadcast);

    return () => {
      socket.off(EVENTS.PLAYBACK_BROADCAST, handleRemoteBroadcast);
    };
  }, [videoRef]);

  // Expose these handlers to the native video element
  const handlePlay = () => {
    if (!hasControl) return;
    if (isApplyingRemoteEvent.current) return;
    
    setLastActionAt();
    
    // Slight delay to prevent firing multiple rapid PLAY events on mount
    setTimeout(() => {
      socket.emit(EVENTS.PLAYBACK_EVENT, { action: 'play', currentTime: videoRef.current?.currentTime || 0, timestamp: Date.now() });
    }, 50);
  };

  const handlePause = () => {
    if (!hasControl) return;
    if (isApplyingRemoteEvent.current) return;

    setLastActionAt();

    socket.emit(EVENTS.PLAYBACK_EVENT, { action: 'pause', currentTime: videoRef.current?.currentTime || 0, timestamp: Date.now() });
  };

  const handleSeeked = () => {
    if (!hasControl) return;
    if (isApplyingRemoteEvent.current) return;

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
    // Disabled at user request to ensure instantaneous seeking
    // socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: true });
  };

  const handleCanPlay = () => {
    socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: false });
  };

  const handlePlaying = () => {
    socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: false });
  };

  return { handlePlay, handlePause, handleSeeked, handleWaiting, handleCanPlay, handlePlaying };
};
