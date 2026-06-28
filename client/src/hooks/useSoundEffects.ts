import { useCallback } from 'react';

// Global singleton to share across components and survive re-renders
let audioCtx: AudioContext | null = null;

export function useSoundEffects() {
  const initAudio = useCallback(() => {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(console.warn);
    }
    return audioCtx;
  }, []);

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    try {
      const ctx = initAudio();
      // If we couldn't resume, don't try to play
      if (ctx.state === 'suspended') return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn("Audio feedback failed", e);
    }
  }, [initAudio]);

  const playJoinSound = useCallback(() => {
    playTone(440, 'sine', 0.2, 0.05); // A4
    setTimeout(() => playTone(659.25, 'sine', 0.4, 0.05), 100); // E5
  }, [playTone]);

  const playLeaveSound = useCallback(() => {
    playTone(440, 'sine', 0.2, 0.05); // A4
    setTimeout(() => playTone(329.63, 'sine', 0.4, 0.05), 100); // E4
  }, [playTone]);

  const playMessageSound = useCallback(() => {
    playTone(800, 'sine', 0.1, 0.02);
  }, [playTone]);

  return { initAudio, playJoinSound, playLeaveSound, playMessageSound };
}
