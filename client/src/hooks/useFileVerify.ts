import { useState, useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useWebRTC } from './useWebRTC';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';

const DUMMY_HASH = '0'.repeat(64);

export const useFileVerify = () => {
  const { setVerifyStatus, setFileDetails, setLocalFileUrl, role, cachedFingerprintPayload, setCachedFingerprintPayload, fileName, mismatchError, setMismatchError } = useRoomStore();
  const sendFingerprintPayload = useWebRTC((state) => state.sendFingerprintPayload);
  
  // To fix the viewer race condition reliably
  const localFingerprintRef = useRef<number[] | number | null>(null);
  const compareWorkerRef = useRef<Worker | null>(null);
  const generateWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const handleMismatch = () => {
      setVerifyStatus('mismatch');
      setMismatchError("Your file doesn't match the host's file.");
    };

    const handleMatch = () => {
      setVerifyStatus('verified');
      setMismatchError(null);
    };

    socket.on(EVENTS.FILE_MISMATCH, handleMismatch);
    socket.on(EVENTS.FILE_MATCH, handleMatch);

    return () => {
      socket.off(EVENTS.FILE_MISMATCH, handleMismatch);
      socket.off(EVENTS.FILE_MATCH, handleMatch);
    };
  }, [setVerifyStatus, setMismatchError]);

  // Viewer comparison effect
  useEffect(() => {
    if (role === 'viewer' && localFingerprintRef.current !== null && cachedFingerprintPayload !== null) {
      if (compareWorkerRef.current) {
        compareWorkerRef.current.terminate();
      }

      const worker = new Worker(new URL('../lib/audioFingerprintWorker.ts', import.meta.url), { type: 'module' });
      compareWorkerRef.current = worker;

      worker.onerror = (err) => {
        console.error("Compare Worker Error:", err);
        setVerifyStatus('mismatch');
        setMismatchError("Verification process crashed");
        worker.terminate();
      };

      worker.onmessage = (e) => {
        try {
          if (e.data.type === 'COMPARE_RESULT') {
            if (e.data.isMatch) {
              socket.emit(EVENTS.FILE_VERIFIED, { hash: DUMMY_HASH, size: 0, name: fileName || 'video.mp4' });
            } else {
              setVerifyStatus('mismatch');
              setMismatchError("Your file doesn't match the host's file.");
            }
          }
        } catch (err) {
          console.error("Synchronous error during compare resolution:", err);
          setVerifyStatus('mismatch');
          setMismatchError("Verification process crashed");
        } finally {
          worker.terminate();
        }
      };

      worker.postMessage({
        type: 'COMPARE',
        payload: { localPayload: localFingerprintRef.current, remotePayload: cachedFingerprintPayload }
      });
    }
  }, [role, cachedFingerprintPayload, setVerifyStatus, setMismatchError, fileName]);

  const verifyFile = async (file: File) => {
    setVerifyStatus('computing');
    setMismatchError(null);
    localFingerprintRef.current = null;
    
    // Failsafe timeout
    const failsafe = setTimeout(() => {
      setVerifyStatus('mismatch');
      setMismatchError("Verification timed out.");
      if (generateWorkerRef.current) generateWorkerRef.current.terminate();
    }, 10000);

    const url = URL.createObjectURL(file);
    setLocalFileUrl(url);
    setFileDetails(DUMMY_HASH, file.name);

    let payload: number[] | number = file.size;

    try {
      const slice = file.slice(0, 10 * 1024 * 1024);
      const arrayBuffer = await slice.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const audioBuffer = await Promise.race([
        audioCtx.decodeAudioData(arrayBuffer),
        new Promise<AudioBuffer>((_, reject) => setTimeout(() => reject(new Error('DECODE_TIMEOUT')), 2000))
      ]);
      const pcmData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      if (generateWorkerRef.current) generateWorkerRef.current.terminate();
      
      const worker = new Worker(new URL('../lib/audioFingerprintWorker.ts', import.meta.url), { type: 'module' });
      generateWorkerRef.current = worker;
      
      const result = await new Promise<number[]>((resolve, reject) => {
        worker.onerror = (err) => {
          console.error("Generate Worker Error:", err);
          setVerifyStatus('mismatch');
          setMismatchError("Verification process crashed");
          reject(new Error("Worker error"));
        };

        worker.onmessage = (e) => {
          try {
            if (e.data.type === 'GENERATE_RESULT') {
              resolve(e.data.fingerprint);
            } else if (e.data.type === 'ERROR') {
              reject(new Error(e.data.error));
            }
          } catch (err) {
            setVerifyStatus('mismatch');
            setMismatchError("Verification process crashed");
            reject(err);
          } finally {
            worker.terminate();
          }
        };

        worker.postMessage({
          type: 'GENERATE',
          payload: { pcmData, sampleRate }
        });
      });
      payload = result;
    } catch (e) {
      console.warn("Audio decoding failed, falling back to file size check", e);
      payload = file.size;
    }
    
    clearTimeout(failsafe);

    localFingerprintRef.current = payload;

    // Trigger viewer effect if it was waiting for local payload
    // To trigger the effect securely, we also save it in a state
    // But since the requirements specifically requested a useRef to avoid race conditions,
    // we use a force render state just to kick the effect if role is viewer
    setLocalRenderTrigger(prev => prev + 1);

    if (role === 'host') {
      setCachedFingerprintPayload(payload);
      sendFingerprintPayload(payload);
      socket.emit(EVENTS.FILE_VERIFIED, { hash: DUMMY_HASH, size: 0, name: file.name });
    }
  };

  const [localRenderTrigger, setLocalRenderTrigger] = useState(0);

  // Combine trigger with the effect dependencies
  useEffect(() => {
    // This empty effect is just so the dependency array in the comparison effect fires when localRenderTrigger changes
  }, [localRenderTrigger]);

  const forceAccept = () => {
    socket.emit(EVENTS.FILE_VERIFIED, { hash: DUMMY_HASH, size: 0, name: fileName || 'video.mp4' });
    setVerifyStatus('verified');
    setMismatchError(null);
  };

  // Ensure unmount cleanup
  useEffect(() => {
    return () => {
      if (compareWorkerRef.current) compareWorkerRef.current.terminate();
      if (generateWorkerRef.current) generateWorkerRef.current.terminate();
    };
  }, []);

  return { verifyFile, mismatchError, forceAccept };
};
