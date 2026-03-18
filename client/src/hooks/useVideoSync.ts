import { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { PlaybackEvent } from '../../../shared/types';

export const useVideoSync = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const { role, setCountdown } = useRoomStore();
  const isApplyingRemoteEvent = useRef(false);
  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handleRemoteBroadcast = (event: PlaybackEvent) => {
      const video = videoRef.current;
      if (!video) return;

      if (event.action !== 'sync_check') {
        isApplyingRemoteEvent.current = true;
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

    const handleCountdownBroadcast = (event: { action: 'play' | 'pause' }) => {
      let count = 3;
      setCountdown(count, event.action);
      
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      
      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count > 0) {
          setCountdown(count, event.action);
        } else {
          // Timer finished
          clearInterval(countdownTimerRef.current!);
          countdownTimerRef.current = null;
          setCountdown(null, null);
          
          // Actually execute the action locally, as if we received PLAYBACK_BROADCAST
          // Everyone executes at the same time locally when the countdown hits 0
          const video = videoRef.current;
          if (video) {
             isApplyingRemoteEvent.current = true;
             if (event.action === 'play') {
               video.play().catch(e => console.error("Play blocked", e));
             } else if (event.action === 'pause') {
               video.pause();
             }
             setTimeout(() => { isApplyingRemoteEvent.current = false; }, 50);
          }
        }
      }, 1000);
    };

    const handleCountdownCancelled = () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
      setCountdown(null, null);
    };

    socket.on(EVENTS.PLAYBACK_BROADCAST, handleRemoteBroadcast);
    socket.on(EVENTS.COUNTDOWN_BROADCAST, handleCountdownBroadcast);
    socket.on(EVENTS.COUNTDOWN_CANCELLED, handleCountdownCancelled);

    return () => {
      socket.off(EVENTS.PLAYBACK_BROADCAST, handleRemoteBroadcast);
      socket.off(EVENTS.COUNTDOWN_BROADCAST, handleCountdownBroadcast);
      socket.off(EVENTS.COUNTDOWN_CANCELLED, handleCountdownCancelled);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [videoRef, setCountdown]);

  const handlePlay = () => {
    if (role !== 'host') return;
    if (isApplyingRemoteEvent.current) return;
    
    // Instead of playing immediately, trigger a countdown. 
    // If a countdown is already running, this serves as a cancel.
    const state = useRoomStore.getState();
    if (state.countdownValue !== null) {
      socket.emit(EVENTS.COUNTDOWN_CANCEL);
    } else {
      socket.emit(EVENTS.COUNTDOWN_START, { action: 'play' });
    }
  };

  const handlePause = () => {
    if (role !== 'host') return;
    if (isApplyingRemoteEvent.current) return;

    const state = useRoomStore.getState();
    if (state.countdownValue !== null) {
      socket.emit(EVENTS.COUNTDOWN_CANCEL);
    } else {
      socket.emit(EVENTS.COUNTDOWN_START, { action: 'pause' });
    }
  };

  const handleSeeked = () => {
    if (role !== 'host') return;
    if (isApplyingRemoteEvent.current) return;
    socket.emit(EVENTS.PLAYBACK_EVENT, { action: 'seek', currentTime: videoRef.current?.currentTime || 0, timestamp: Date.now() });
  };

  const handleWaiting = () => {
    socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: true });
  };

  const handleCanPlay = () => {
    socket.emit(EVENTS.BUFFERING_STATE, { isBuffering: false });
  };

  return { handlePlay, handlePause, handleSeeked, handleWaiting, handleCanPlay };
};
