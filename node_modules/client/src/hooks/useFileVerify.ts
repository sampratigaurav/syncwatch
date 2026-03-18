import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';

export const useFileVerify = () => {
  const { setVerifyStatus, setFileDetails, setLocalFileUrl } = useRoomStore();
  const [mismatchError, setMismatchError] = useState<string | null>(null);

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

  const verifyFile = (file: File) => {
    setVerifyStatus('computing');
    setMismatchError(null);
    
    const url = URL.createObjectURL(file);
    setLocalFileUrl(url);

    const worker = new Worker(new URL('../lib/hashFile.ts', import.meta.url), { type: 'module' });
    
    worker.onmessage = (e) => {
      if (e.data.error) {
        console.error('Worker error:', e.data.error);
        setVerifyStatus('idle');
        return;
      }
      
      const { hash, size, name } = e.data;
      setFileDetails(hash, name);
      
      socket.emit(EVENTS.FILE_VERIFIED, { hash, size, name });
      
      worker.terminate();
    };

    worker.postMessage(file);
  };

  return { verifyFile, mismatchError };
};
