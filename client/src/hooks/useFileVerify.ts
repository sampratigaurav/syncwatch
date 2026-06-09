import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useWebRTC } from './useWebRTC';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';

const DUMMY_HASH = '0'.repeat(64);

export const useFileVerify = () => {
  const { setVerifyStatus, setFileDetails, setLocalFileUrl, role, cachedFingerprintPayload, setCachedFingerprintPayload, fileName } = useRoomStore();
  const sendFingerprintPayload = useWebRTC((state) => state.sendFingerprintPayload);
  const [mismatchError, setMismatchError] = useState<string | null>(null);
  const [localFingerprintPayload, setLocalFingerprintPayload] = useState<number[] | number | null>(null);

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
  }, [setVerifyStatus]);

  // Viewer comparison effect
  useEffect(() => {
    if (role === 'viewer' && localFingerprintPayload !== null && cachedFingerprintPayload !== null) {
      const worker = new Worker(new URL('../lib/audioFingerprintWorker.ts', import.meta.url), { type: 'module' });
      worker.onmessage = (e) => {
        if (e.data.type === 'COMPARE_RESULT') {
          if (e.data.isMatch) {
            // Trick the server into thinking we matched perfectly using the DUMMY_HASH and size 0
            socket.emit(EVENTS.FILE_VERIFIED, { hash: DUMMY_HASH, size: 0, name: fileName || 'video.mp4' });
          } else {
            setVerifyStatus('mismatch');
            setMismatchError("Your file doesn't match the host's file.");
          }
        }
        worker.terminate();
      };
      worker.postMessage({
        type: 'COMPARE',
        payload: { localPayload: localFingerprintPayload, remotePayload: cachedFingerprintPayload }
      });
    }
  }, [role, localFingerprintPayload, cachedFingerprintPayload, setVerifyStatus, fileName]);

  const verifyFile = async (file: File) => {
    setVerifyStatus('computing');
    setMismatchError(null);
    
    const url = URL.createObjectURL(file);
    setLocalFileUrl(url);
    setFileDetails(DUMMY_HASH, file.name);

    let payload: number[] | number = file.size;

    try {
      const slice = file.slice(0, 10 * 1024 * 1024);
      const arrayBuffer = await slice.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const pcmData = audioBuffer.getChannelData(0);
      const sampleRate = audioBuffer.sampleRate;

      const worker = new Worker(new URL('../lib/audioFingerprintWorker.ts', import.meta.url), { type: 'module' });
      
      const result = await new Promise<number[]>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.type === 'GENERATE_RESULT') {
            resolve(e.data.fingerprint);
          } else if (e.data.type === 'ERROR') {
            reject(new Error(e.data.error));
          }
          worker.terminate();
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

    setLocalFingerprintPayload(payload);

    if (role === 'host') {
      setCachedFingerprintPayload(payload);
      sendFingerprintPayload(payload);
      // Mark the host as verified on the server using the DUMMY_HASH and size 0
      socket.emit(EVENTS.FILE_VERIFIED, { hash: DUMMY_HASH, size: 0, name: file.name });
    }
  };

  const forceAccept = () => {
    socket.emit(EVENTS.FILE_VERIFIED, { hash: DUMMY_HASH, size: 0, name: fileName || 'video.mp4' });
    setVerifyStatus('verified');
    setMismatchError(null);
  };

  return { verifyFile, mismatchError, forceAccept };
};
