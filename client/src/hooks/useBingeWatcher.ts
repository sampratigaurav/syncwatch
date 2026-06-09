import { useState, useEffect, useRef } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from './useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { useFileVerify } from './useFileVerify';

export const useBingeWatcher = () => {
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [nextEpisodeName, setNextEpisodeName] = useState<string | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const { verifyFile } = useFileVerify();

  // For the Host: Handle when the video ends natively
  const handleEnded = () => {
    const { role, directoryHandles, fileName } = useRoomStore.getState();
    if (role !== 'host') return;
    if (!directoryHandles || directoryHandles.length === 0) return;
    if (!fileName) return;

    // Find current file in handles
    const currentIndex = directoryHandles.findIndex((h) => h.name === fileName);
    if (currentIndex === -1 || currentIndex === directoryHandles.length - 1) return;

    const nextHandle = directoryHandles[currentIndex + 1];
    setNextEpisodeName(nextHandle.name);
    setCountdown(5);
    setIsCountingDown(true);

    let currentCount = 5;
    timerRef.current = setInterval(async () => {
      currentCount -= 1;
      setCountdown(currentCount);

      if (currentCount <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsCountingDown(false);
        try {
          const nextFile = await nextHandle.getFile();
          // Emit the event to the room
          socket.emit(EVENTS.LOAD_NEXT_EPISODE, { filename: nextHandle.name });
          verifyFile(nextFile);
        } catch (e) {
          console.error("Failed to read next file:", e);
        }
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsCountingDown(false);
    setCountdown(5);
  };

  // For Viewers: Handle receiving LOAD_NEXT_EPISODE
  useEffect(() => {
    const handleLoadNextEpisode = async (payload: { filename: string }) => {
      const { role, directoryHandles, setVerifyStatus, setMismatchError, setLocalFileUrl } = useRoomStore.getState();
      if (role === 'host') return; // host initiates, shouldn't receive this

      if (!directoryHandles || directoryHandles.length === 0) {
        // Viewer is not in a folder, transition to waiting room with mismatch error
        setLocalFileUrl(null);
        setVerifyStatus('mismatch');
        setMismatchError(`Missing File: Host loaded ${payload.filename}. Please select this file manually.`);
        return;
      }

      const match = directoryHandles.find(h => h.name === payload.filename);
      if (match) {
        try {
           const nextFile = await match.getFile();
           verifyFile(nextFile);
        } catch (err) {
           console.error("Failed to load file from viewer directory", err);
           setLocalFileUrl(null);
           setVerifyStatus('mismatch');
           setMismatchError(`Missing File: Host loaded ${payload.filename}. Please select this file manually.`);
        }
      } else {
        setLocalFileUrl(null);
        setVerifyStatus('mismatch');
        setMismatchError(`Missing File: Host loaded ${payload.filename}. Please select this file manually.`);
      }
    };

    socket.on(EVENTS.LOAD_NEXT_EPISODE, handleLoadNextEpisode);
    return () => {
      socket.off(EVENTS.LOAD_NEXT_EPISODE, handleLoadNextEpisode);
    };
  }, [verifyFile]);

  // Clean up
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return { isCountingDown, countdown, nextEpisodeName, handleEnded, cancelCountdown };
};
