import { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useSocket, socket } from '../hooks/useSocket';
import { useVideoSync } from '../hooks/useVideoSync';
import { useDriftCorrection } from '../hooks/useDriftCorrection';
import { useNavigate } from 'react-router-dom';
import ParticipantList from '../components/ParticipantList';
import { VideoPlayer } from '../components/VideoPlayer';
import Chat from '../components/Chat';
import SyncStatus from '../components/SyncStatus';
import ControlPolicySelector from '../components/ControlPolicySelector';
import { EVENTS } from '../../../shared/socketEvents';
import { Settings } from 'lucide-react';

export default function Room() {
  const { roomId, nickname, localFileUrl, role, participants } = useRoomStore();
  const navigate = useNavigate();
  useSocket(); 
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const wasPlayingBeforeBuffer = useRef<boolean>(false);
  
  const { handlePlay, handlePause, handleSeeked, handleWaiting, handleCanPlay, handlePlaying } = useVideoSync(videoRef);
  useDriftCorrection(videoRef);

  const [showSettings, setShowSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const hasControl = useRoomStore(state => state.canIControl());
  const prevHasControl = useRef(hasControl);
  
  useEffect(() => {
    if (role !== 'host') {
      if (!prevHasControl.current && hasControl) {
        setToastMessage("You can now control playback");
      } else if (prevHasControl.current && !hasControl) {
        setToastMessage("Playback control removed");
      }
      prevHasControl.current = hasControl;
    }
  }, [hasControl, role]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    if (!roomId || !nickname) {
      navigate('/');
    }
  }, [roomId, nickname, navigate]);

  useEffect(() => {
    const handleForcePause = () => {
      if (videoRef.current && !videoRef.current.paused) {
         wasPlayingBeforeBuffer.current = true;
         videoRef.current.pause();
      }
    };
    
    const handleResumeAllowed = () => {
       if (role === 'host' && videoRef.current && videoRef.current.paused) {
          if (wasPlayingBeforeBuffer.current) {
             videoRef.current.play().catch(console.error);
             wasPlayingBeforeBuffer.current = false;
          }
       }
    };

    socket.on(EVENTS.FORCE_PAUSE, handleForcePause);
    socket.on(EVENTS.RESUME_ALLOWED, handleResumeAllowed);
    return () => {
      socket.off(EVENTS.FORCE_PAUSE, handleForcePause);
      socket.off(EVENTS.RESUME_ALLOWED, handleResumeAllowed);
    };
  }, [role]);

  const bufferingParticipant = participants.find(p => p.status === 'buffering');
  const showBuffering = !!bufferingParticipant;

  return (
    <div className="h-screen w-full bg-black flex flex-col md:flex-row overflow-hidden relative">
      
      {showBuffering && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-black/80 backdrop-blur-md border border-amber-500/50 text-amber-500 px-6 py-3 rounded-full flex items-center shadow-2xl">
           <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mr-3"></div>
           {bufferingParticipant.id === socket.id ? "Catching up... everyone is waiting." : `Waiting for ${bufferingParticipant.nickname} to buffer...`}
        </div>
      )}

      <div className="flex-grow relative bg-black flex flex-col">
        {/* Toast Overlay */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] bg-teal-900/90 backdrop-blur-md border border-teal-500/50 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
             <span className="font-medium tracking-wide">{toastMessage}</span>
          </div>
        )}

        <div className="flex-grow flex items-center justify-center">
          {localFileUrl ? (
            <div className="w-full h-full relative">
              <VideoPlayer
                ref={videoRef}
                src={localFileUrl}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeeked={handleSeeked}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
                onPlaying={handlePlaying}
              />
            </div>
          ) : (
            <div className="text-zinc-500 flex flex-col items-center">
              <p className="mb-4">No video selected.</p>
              <button onClick={() => navigate(`/room/${roomId}/waiting`)} className="text-teal-500 hover:text-teal-400 underline">
                Go back to Waiting Room
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel */}
      <div className="w-full md:w-96 flex-shrink-0 bg-zinc-950 border-l border-zinc-900 flex flex-col h-[50vh] md:h-screen">
        <div className="p-4 border-b border-zinc-900 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-xl tracking-tight">Room: <span className="font-mono text-teal-500">{roomId}</span></h2>
            <div className="flex items-center gap-2">
               {role === 'host' && (
                 <button onClick={() => setShowSettings(!showSettings)} className="text-zinc-400 hover:text-white transition-colors p-1" title="Control Settings">
                   <Settings className="w-5 h-5" />
                 </button>
               )}
               {role && <span className="text-xs font-semibold px-2 py-1 bg-zinc-800 text-zinc-300 rounded uppercase tracking-wider">{role}</span>}
            </div>
          </div>
          <SyncStatus />
        </div>
        
        {showSettings && role === 'host' ? (
          <div className="p-4 flex-shrink-0 border-b border-zinc-900 bg-zinc-950 overflow-y-auto max-h-[50vh]">
            <ControlPolicySelector />
          </div>
        ) : null}

        <div className="p-4 flex-shrink-0">
          <ParticipantList />
        </div>

        <div className="flex-grow p-4 min-h-0">
          <Chat />
        </div>
      </div>
      
    </div>
  );
}
