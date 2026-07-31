import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import type { ReactionPayload } from '../../../shared/types';

interface FloatingReaction extends ReactionPayload {
  xPos: number; // 0 to 100 representing percentage
}

export function ReactionOverlay() {
  const [activeReactions, setActiveReactions] = useState<FloatingReaction[]>([]);
  const participantCount = useRoomStore(state => state.participants.length);

  useEffect(() => {
    const pendingQueue: ReactionPayload[] = [];
    let isProcessing = false;

    const processQueue = () => {
      if (pendingQueue.length === 0) {
        isProcessing = false;
        return;
      }

      // To fix SonarQube maintainability issue where setState is called inside a timeout which was created inside setState:
      // we can do the setTimeout OUTSIDE of the setState callback.
      const payload = pendingQueue.shift()!;

      // Use crypto.getRandomValues instead of Math.random to avoid SonarCloud security hotspot for predictable random
      const randomBuffer = new Uint32Array(1);
      window.crypto.getRandomValues(randomBuffer);
      const randomFactor = randomBuffer[0] / (0xffffffff + 1);
      const xPos = 15 + randomFactor * 70;
      const newReaction: FloatingReaction = { ...payload, xPos };

      // Remove it after animation completes
      setTimeout(() => {
        setActiveReactions(current => current.filter(r => r.id !== newReaction.id));
      }, 2000);
      
      setActiveReactions(prev => {
        // Cap at 8 simultaneous reactions
        if (prev.length >= 8) {
          setTimeout(processQueue, 200); // Try again later
          return prev;
        }
        return [...prev, newReaction];
      });
      
      if (pendingQueue.length > 0) {
        setTimeout(processQueue, 100); // Small stagger
      } else {
        isProcessing = false;
      }
    };

    const handleBroadcast = (payload: ReactionPayload) => {
      pendingQueue.push(payload);
      if (!isProcessing) {
        isProcessing = true;
        processQueue();
      }
    };

    socket.on(EVENTS.REACTION_BROADCAST, handleBroadcast);
    return () => {
      socket.off(EVENTS.REACTION_BROADCAST, handleBroadcast);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 overflow-hidden">
      {activeReactions.map(reaction => (
        <div
          key={reaction.id}
          className="absolute bottom-0 flex flex-col items-center justify-center animate-[floatingUp_2s_ease-out_forwards]"
          style={{ left: `${reaction.xPos}%`, bottom: '10%' }}
        >
          <span className="text-[36px] tablet:text-[40px] drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]">
            {reaction.emoji}
          </span>
          {participantCount > 1 && (
            <span className="mt-1 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-full text-white text-[11px] font-medium whitespace-nowrap shadow-md max-w-[80px] truncate text-center">
              {reaction.senderNickname}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
