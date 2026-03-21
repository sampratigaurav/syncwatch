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
import SubtitleLoader from '../components/SubtitleLoader';
import ControlPolicySelector from '../components/ControlPolicySelector';
import { EVENTS } from '../../../shared/socketEvents';
import { Settings, Users, MessageSquare, Info, Loader2, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Room() {
  const { 
    roomId, nickname, localFileUrl, role, participants, 
    connectionStatus, reconnectAttempt, clearRoomState,
    subtitleBlobUrl, setSubtitleBlobUrl,
    subtitleEnabled, setSubtitleEnabled
  } = useRoomStore();
  const navigate = useNavigate();
  useSocket(); 
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const wasPlayingBeforeBuffer = useRef<boolean>(false);
  
  const { handlePlay, handlePause, handleSeeked, handleWaiting, handleCanPlay, handlePlaying } = useVideoSync(videoRef);
  useDriftCorrection(videoRef);

  const [showSettings, setShowSettings] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'participants' | 'chat' | 'info' | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  
  const hasControl = useRoomStore(state => state.canIControl());
  const prevHasControl = useRef(hasControl);

  useEffect(() => {
    const handleViewportResize = () => {
      if (window.visualViewport) {
        const diff = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(diff > 50 ? diff : 0);
      }
    };
    window.visualViewport?.addEventListener('resize', handleViewportResize);
    return () => window.visualViewport?.removeEventListener('resize', handleViewportResize);
  }, []);
  
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

  const handleGoHome = () => {
    clearRoomState();
    navigate('/');
  };

  if (connectionStatus === 'failed' || connectionStatus === 'room_not_found') {
    return (
      <div className="fixed inset-0 z-[100] bg-black [.light_&]:bg-[#fdfdfc] flex flex-col items-center justify-center p-6 text-center font-sans">
        <WifiOff className="w-16 h-16 text-zinc-600 [.light_&]:text-zinc-400 mb-6" />
        <h2 className="text-2xl tablet:text-3xl font-bold text-white [.light_&]:text-zinc-900 tracking-tight mb-3">
          {connectionStatus === 'room_not_found' ? 'Room no longer exists' : 'Connection lost'}
        </h2>
        <p className="text-zinc-400 [.light_&]:text-zinc-600 max-w-sm mb-8">
          {connectionStatus === 'room_not_found' 
            ? 'The room expired while you were disconnected. Server restarts clear all active rooms.'
            : 'The server restarted and your room no longer exists. This can happen after a period of inactivity.'}
        </p>
        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <button 
            onClick={handleGoHome}
            className="w-full py-3.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-xl transition-colors shadow-lg active:scale-[0.98]"
          >
            Create a new room
          </button>
          <button 
            onClick={handleGoHome}
            className="w-full py-3.5 bg-transparent border border-zinc-700 hover:border-zinc-500 [.light_&]:border-zinc-300 [.light_&]:hover:border-zinc-400 text-zinc-300 [.light_&]:text-zinc-700 font-medium rounded-xl transition-colors active:scale-[0.98]"
          >
            Go home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-[100dvh] w-full bg-black flex flex-col tablet:flex-row overflow-hidden relative font-sans"
      style={{ paddingBottom: keyboardHeight > 0 && !activeTab ? undefined : 0 }} 
    >
      
      {connectionStatus === 'reconnecting' && (
        <div className="absolute top-0 left-0 right-0 z-[90] bg-black/80 backdrop-blur-lg border-b border-white/10 flex flex-col items-center justify-center py-3 shadow-2xl animate-in slide-in-from-top-full duration-300">
          <div className="flex items-center gap-3">
             <Loader2 className="w-5 h-5 text-teal-500 animate-spin" />
             <span className="text-white font-medium">Reconnecting...</span>
             <span className="text-teal-500 font-mono text-xs ml-2 bg-teal-500/10 px-2 py-0.5 rounded-full">Attempt {reconnectAttempt} of 5</span>
          </div>
          <span className="text-zinc-400 text-[11px] tablet:text-xs mt-1">Lost connection to the server. Trying to reconnect automatically.</span>
        </div>
      )}

      <div className="flex-grow flex flex-col relative bg-black z-10 w-full tablet:w-auto">
        {/* Toast Overlay */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] bg-teal-900/90 backdrop-blur-md border border-teal-500/50 text-white px-6 py-3 rounded-full shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300">
             <span className="font-medium tracking-wide text-sm tablet:text-base">{toastMessage}</span>
          </div>
        )}

        <div className="w-full flex-none tablet:flex-grow tablet:flex tablet:items-center tablet:justify-center relative bg-black pt-[env(safe-area-inset-top)] tablet:pt-0 landscape:h-[100dvh] tablet:landscape:h-auto z-10">
          {localFileUrl ? (
            <div className="w-full h-auto tablet:h-full relative flex flex-col">
              <VideoPlayer
                ref={videoRef}
                src={localFileUrl}
                onPlay={handlePlay}
                onPause={handlePause}
                onSeeked={handleSeeked}
                onWaiting={handleWaiting}
                onCanPlay={handleCanPlay}
                onPlaying={handlePlaying}
                subtitleBlobUrl={subtitleBlobUrl}
                subtitleEnabled={subtitleEnabled}
                onSubtitleToggle={() => {
                  const newState = !subtitleEnabled;
                  setSubtitleEnabled(newState);
                  if (hasControl) {
                    socket.emit(EVENTS.PLAYBACK_EVENT, { 
                      action: 'subtitle_toggle', 
                      currentTime: videoRef.current?.currentTime || 0, 
                      timestamp: Date.now(),
                      subtitleState: { isEnabled: newState, trackIndex: 0 }
                    });
                  }
                }}
              />
              {/* Floating button for landscape mobile */}
              <button 
                onClick={() => setActiveTab(activeTab ? null : 'chat')}
                className="hidden mobile:landscape:block tablet:hidden absolute top-[calc(1rem+env(safe-area-inset-top))] right-[calc(1rem+env(safe-area-inset-right))] z-[60] bg-zinc-950/80 backdrop-blur-md p-3 rounded-full text-white/80 hover:text-white border border-white/10 shadow-xl"
              >
                <MessageSquare size={22} />
              </button>

              {/* Responsive subtle Buffering Banner BELOW video content */}
              {showBuffering && (
                <div className="absolute inset-x-0 bottom-[-3rem] z-40 mx-auto w-max max-w-[90%] bg-amber-950/80 backdrop-blur-md border border-amber-500/40 text-amber-500 px-4 py-2 rounded-xl flex items-center shadow-xl animate-in fade-in slide-in-from-top-2">
                  <div className="w-3.5 h-3.5 tablet:w-4 tablet:h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mr-2.5 tablet:mr-3 flex-shrink-0"></div>
                  <span className="text-xs tablet:text-sm font-medium tracking-wide">
                    {bufferingParticipant.id === socket.id ? "Catching up to host..." : `Waiting for ${bufferingParticipant.nickname}...`}
                  </span>
                </div>
              )}
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

        {/* Mobile Persistent Bottom Bar */}
        <div className="mt-auto tablet:hidden w-full h-[64px] bg-zinc-950/95 backdrop-blur border-t border-zinc-900 pb-[env(safe-area-inset-bottom)] flex items-center justify-around absolute bottom-0 z-30 landscape:hidden pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
          <button onClick={() => setActiveTab(activeTab === 'participants' ? null : 'participants')} className={cn("flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors", activeTab === 'participants' ? "text-teal-500" : "text-zinc-500 hover:text-zinc-300")}>
            <Users size={22} className="mb-0.5" />
            <span className="text-[10px] font-medium tracking-wider uppercase">People</span>
          </button>
          <button onClick={() => setActiveTab(activeTab === 'chat' ? null : 'chat')} className={cn("flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors", activeTab === 'chat' ? "text-teal-500" : "text-zinc-500 hover:text-zinc-300")}>
            <MessageSquare size={22} className="mb-0.5" />
            <span className="text-[10px] font-medium tracking-wider uppercase">Chat</span>
          </button>
          <button onClick={() => setActiveTab(activeTab === 'info' ? null : 'info')} className={cn("flex flex-col items-center justify-center flex-1 h-full py-1 transition-colors", activeTab === 'info' ? "text-teal-500" : "text-zinc-500 hover:text-zinc-300")}>
             <Info size={22} className="mb-0.5" />
             <span className="text-[10px] font-medium tracking-wider uppercase">Info</span>
          </button>
        </div>
      </div>

      {/* Sheet Modal Backdrop (Mobile only) */}
      <div 
        className={cn(
          "fixed inset-0 bg-black/50 z-10 transition-opacity duration-300 tablet:hidden landscape:hidden",
          activeTab ? "opacity-100" : "opacity-0 pointer-events-none"
        )} 
        onClick={() => setActiveTab(null)}
      />

      {/* Side Panel (Desktop) / Bottom Sheet (Mobile) */}
      <div 
        className={cn(
          "bg-zinc-950 flex flex-col transition-transform duration-300 z-20 overflow-hidden pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]",
          // Desktop specific overrides
          "tablet:relative tablet:w-80 desktop:w-96 tablet:flex-shrink-0 tablet:h-screen tablet:border-l tablet:border-zinc-900 tablet:translate-y-0",
          // Mobile specific overrides
          "fixed left-0 right-0 rounded-t-3xl shadow-[0_-15px_40px_rgba(0,0,0,0.8)] pb-[calc(1rem+env(safe-area-inset-bottom))] tablet:rounded-none tablet:shadow-none tablet:pb-0 landscape:hidden tablet:landscape:flex",
          "h-[65dvh] tablet:h-screen",
          activeTab ? "translate-y-0" : "translate-y-[120%] tablet:translate-y-0"
        )}
        style={{
           bottom: keyboardHeight > 0 ? keyboardHeight : 'calc(64px + env(safe-area-inset-bottom))',
           // Override structural inline CSS exclusively mapping Tablet states towards auto resolution.
           ...(window.innerWidth >= 481 ? { bottom: 0, height: '100vh', paddingBottom: 0 } : {})
        }}
      >
        {/* Drag Handle (Mobile only) */}
        <div className="w-full flex justify-center pt-3 pb-2 flex-shrink-0 tablet:hidden cursor-pointer" onClick={() => setActiveTab(null)}>
           <div className="w-12 h-1.5 bg-zinc-800 rounded-full"></div>
        </div>

        <div className={cn("p-4 border-b border-zinc-900 space-y-4 flex-shrink-0", activeTab === 'info' || !activeTab ? "block" : "hidden tablet:block")}>
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-xl tracking-tight">Room <span className="font-mono text-teal-500 ml-1">{roomId}</span></h2>
            <div className="flex items-center gap-2">
               {role === 'host' && (
                 <button onClick={() => setShowSettings(!showSettings)} className="text-zinc-400 hover:text-white transition-colors p-2 -mr-2 bg-zinc-900/50 rounded-full active:scale-95" title="Control Settings">
                   <Settings className="w-5 h-5" />
                 </button>
               )}
               {role && <span className="text-xs font-semibold px-2 py-1 bg-zinc-800 text-zinc-300 rounded uppercase tracking-wider">{role}</span>}
            </div>
          </div>
          <SyncStatus />
          <SubtitleLoader onSubtitleLoaded={setSubtitleBlobUrl} onSubtitleCleared={() => setSubtitleBlobUrl(null)} />
        </div>
        
        {showSettings && role === 'host' ? (
          <div className={cn("p-4 flex-shrink-0 border-b border-zinc-900 overflow-y-auto max-h-[50vh]", activeTab === 'info' || !activeTab ? "block" : "hidden tablet:block")}>
            <ControlPolicySelector />
          </div>
        ) : null}

        <div className={cn("p-4 flex-shrink-0", activeTab === 'participants' || !activeTab ? "block" : "hidden tablet:block")}>
          <ParticipantList />
        </div>

        <div className={cn("flex-grow p-4 min-h-0", activeTab === 'chat' || !activeTab ? "flex flex-col h-full" : "hidden tablet:flex tablet:flex-col")}>
          <Chat />
        </div>
      </div>
      
    </div>
  );
}
