import { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { PlaybackEvent } from '../../../shared/types';

export const useDriftCorrection = (videoRef: React.RefObject<HTMLVideoElement | null>) => {
  const lastSyncRef = useRef<{ hostTime: number; localSystemTime: number } | null>(null);
  
  const pidState = useRef<{ integral: number; prevError: number | null }>({
    integral: 0,
    prevError: null,
  });

  // Host emission loop
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useRoomStore.getState();
      if (state.role !== 'host') return;
      
      const lastActionAt = state.lastActionAt;
      if (Date.now() - lastActionAt < 8000) return;

      if (!videoRef.current || videoRef.current.paused) return;
      
      socket.emit(EVENTS.PLAYBACK_EVENT, {
        action: 'sync_check',
        currentTime: videoRef.current.currentTime,
        timestamp: Date.now()
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Viewer receive sync_check
  useEffect(() => {
    const handleSyncCheck = (event: PlaybackEvent) => {
      const state = useRoomStore.getState();
      if (state.role !== 'viewer') return;
      if (event.action !== 'sync_check') return;
      
      const lastActionAt = useRoomStore.getState().lastActionAt;
      if (Date.now() - lastActionAt < 8000) return;
      
      // Store the latest known host state
      lastSyncRef.current = {
        hostTime: event.currentTime + (state.latencyMs / 2000), // add one-way latency
        localSystemTime: Date.now()
      };
    };

    socket.on(EVENTS.PLAYBACK_BROADCAST, handleSyncCheck);

    return () => {
      socket.off(EVENTS.PLAYBACK_BROADCAST, handleSyncCheck);
    };
  }, []);

  // PID Controller loop (requestAnimationFrame)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      animationFrameId = requestAnimationFrame(loop);
      
      const dt = (time - lastTime) / 1000; // delta time in seconds
      lastTime = time;

      const state = useRoomStore.getState();
      if (state.role !== 'viewer') return;

      const video = videoRef.current;
      
      // If paused or missing sync data, reset state and normalize playback rate
      if (!video || video.paused || !lastSyncRef.current) {
         pidState.current.integral = 0;
         pidState.current.prevError = null;
         if (video && video.playbackRate !== 1.0) {
           video.playbackRate = 1.0;
         }
         return;
      }
      
      if (dt <= 0) return;

      const now = Date.now();
      const timeSinceSync = (now - lastSyncRef.current.localSystemTime) / 1000;
      
      // Stop extrapolating if sync data is stale
      if (timeSinceSync > 10) return;

      // Estimate the host's current time
      const extrapolatedHostTime = lastSyncRef.current.hostTime + timeSinceSync;
      const localTime = video.currentTime;
      
      // Positive error means we are behind the host
      const error = extrapolatedHostTime - localTime; 
      const absError = Math.abs(error);

      // Massive drift: fallback to hard seek
      if (absError > 2.0) {
        video.currentTime = extrapolatedHostTime;
        pidState.current.integral = 0;
        pidState.current.prevError = null;
        if (video.playbackRate !== 1.0) video.playbackRate = 1.0;
        return;
      }

      // Small to medium drift: apply PID formula to calculate new playbackRate
      if (absError >= 0.05) { // Between 50ms and 2000ms
        const Kp = 0.2;
        const Ki = 0.05;
        const Kd = 0.01;

        pidState.current.integral += error * dt;
        
        let derivative = 0;
        if (pidState.current.prevError !== null) {
          derivative = (error - pidState.current.prevError) / dt;
        }
        pidState.current.prevError = error;

        const adjustment = (Kp * error) + (Ki * pidState.current.integral) + (Kd * derivative);
        
        let newRate = 1.0 + adjustment;
        // Clamp the playbackRate between 0.90 and 1.10
        newRate = Math.max(0.90, Math.min(1.10, newRate));

        // Apply safely to avoid DOM spam
        if (Math.abs(video.playbackRate - newRate) > 0.005) {
          video.playbackRate = newRate;
        }
      } else {
        // Within 50ms tolerance window: smoothly ease playbackRate back to exactly 1.0
        if (video.playbackRate !== 1.0) {
          if (Math.abs(video.playbackRate - 1.0) < 0.01) {
            video.playbackRate = 1.0;
          } else {
            // Lerp towards 1.0
            video.playbackRate += (1.0 - video.playbackRate) * (dt * 5);
          }
        }
        
        // Decay integral slowly and reset previous error
        pidState.current.integral *= 0.9;
        pidState.current.prevError = null;
      }
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
};
