import { useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { PlaybackEvent } from '../../../shared/types';

export const useDriftCorrection = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const { role, latencyMs } = useRoomStore();

  useEffect(() => {
    if (role === 'host') {
      const interval = setInterval(() => {
        if (!videoRef.current || videoRef.current.paused) return;
        
        socket.emit(EVENTS.PLAYBACK_EVENT, {
          action: 'sync_check',
          currentTime: videoRef.current.currentTime,
          timestamp: Date.now()
        });
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [role, videoRef]);

  useEffect(() => {
    if (role !== 'viewer') return;

    const handleSyncCheck = (event: PlaybackEvent) => {
      if (event.action !== 'sync_check') return;
      
      const video = videoRef.current;
      if (!video) return;

      const diff = Math.abs(video.currentTime - event.currentTime);
      // Threshold 0.5 seconds
      if (diff > 0.5) {
        // compute offset with latency
        const targetTime = event.currentTime + (latencyMs / 2000);
        video.currentTime = targetTime;
      }
    };

    socket.on(EVENTS.PLAYBACK_BROADCAST, handleSyncCheck);

    return () => {
      socket.off(EVENTS.PLAYBACK_BROADCAST, handleSyncCheck);
    };
  }, [role, latencyMs, videoRef]);
};
