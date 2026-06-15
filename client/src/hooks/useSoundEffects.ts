import { useCallback, useRef } from 'react';

export function useSoundEffects() {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const initAudio = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  const playTone = useCallback((frequency: number, type: OscillatorType, duration: number, vol: number = 0.1) => {
    try {
      const ctx = initAudio();
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
  }, []);

  const playJoinSound = useCallback(() => {
    // A rising, pleasant chime
    playTone(440, 'sine', 0.2, 0.05); // A4
    setTimeout(() => playTone(659.25, 'sine', 0.4, 0.05), 100); // E5
  }, [playTone]);

  const playLeaveSound = useCallback(() => {
    // A falling, soft tone
    playTone(440, 'sine', 0.2, 0.05); // A4
    setTimeout(() => playTone(329.63, 'sine', 0.4, 0.05), 100); // E4
  }, [playTone]);

  const playMessageSound = useCallback(() => {
    // A quick, subtle pop
    playTone(800, 'sine', 0.1, 0.02);
  }, [playTone]);

  return { playJoinSound, playLeaveSound, playMessageSound };
}
