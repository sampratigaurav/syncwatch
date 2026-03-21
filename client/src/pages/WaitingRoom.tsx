import { useEffect, useState } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useSocket } from '../hooks/useSocket';
import { useFileVerify } from '../hooks/useFileVerify';
import { useNavigate, useParams } from 'react-router-dom';
import ParticipantList from '../components/ParticipantList';
import ControlPolicySelector from '../components/ControlPolicySelector';
import { Copy, Check, Play, AlertTriangle, Loader2, WifiOff, Lock } from 'lucide-react';

export default function WaitingRoom() {
  const { roomId, participants, role, fileVerifyStatus, connectionStatus, reconnectAttempt, clearRoomState } = useRoomStore();
  const { roomId: urlId } = useParams();
  const navigate = useNavigate();
  useSocket();
  const { verifyFile, mismatchError } = useFileVerify();
  const fileName = useRoomStore(state => state.fileName);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!roomId) {
      if (urlId) {
        navigate(`/room/${urlId}`);
      } else {
        navigate('/');
      }
    }
  }, [roomId, urlId, navigate]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/room/${roomId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => console.error("Clipboard copy failed", err));
    } else {
      // Fallback for non-HTTPS local IPs
      const textArea = document.createElement("textarea");
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      verifyFile(file);
    }
  };

  const allVerified = participants.length > 0 && participants.every(p => p.status === 'ready');
  const canStart = role === 'host' ? allVerified : fileVerifyStatus === 'verified';

  const handleGoHome = () => {
    clearRoomState();
    navigate('/');
  };

  if (connectionStatus === 'failed' || connectionStatus === 'room_not_found') {
    return (
      <div className="fixed inset-0 z-[100] bg-black [.light_&]:bg-[#fdfdfc] flex flex-col items-center justify-center p-6 text-center">
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

  if (!roomId) return null;

  return (
    <div className="min-h-screen p-4 tablet:p-8 flex flex-col items-center pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] overflow-x-hidden relative">
      
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

      <div className="w-full max-w-5xl grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-3 gap-6 tablet:gap-8 mt-4 font-sans">
        
        <div className="tablet:col-span-1 desktop:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 tablet:p-10 shadow-xl">
            <h1 className="text-2xl tablet:text-3xl font-bold text-white mb-1 tablet:mb-2 tracking-tight">Waiting Room</h1>
            <p className="text-sm tablet:text-base text-zinc-400 mb-6 tablet:mb-8">Select the video file you want to watch.</p>
            
            {fileVerifyStatus === 'computing' ? (
              <div className="bg-zinc-950/50 border border-teal-900/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-teal-900/30 rounded-full flex items-center justify-center mb-4 border border-teal-500/20">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                </div>
                <span className="text-xl font-medium text-white mb-2">Verifying File...</span>
                <span className="text-sm text-zinc-400">Computing checksum to ensure sync</span>
              </div>
            ) : fileVerifyStatus === 'mismatch' ? (
              <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-6 tablet:p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <span className="text-xl font-medium text-white mb-2">File Mismatch</span>
                <span className="text-sm text-red-400 mb-6 tablet:mb-8">{mismatchError}</span>
                
                {/* File Comparison Columns */}
                <div className="w-full flex flex-col tablet:flex-row items-center justify-center gap-3 tablet:gap-6 mb-8 tablet:mb-10 px-2">
                  <div className="bg-red-950/60 border border-red-900/50 rounded-xl p-4 w-full tablet:w-1/2 flex flex-col items-center text-center shadow-inner">
                     <span className="text-[10px] text-red-400/80 font-bold uppercase tracking-widest mb-1.5">Your File</span>
                     <span className="text-sm tablet:text-base text-red-200 truncate w-full px-2 font-medium">{fileName || 'Unknown File'}</span>
                  </div>
                  
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-950 border border-red-900/60 flex items-center justify-center text-[10px] font-bold text-red-500 shadow-md">
                    VS
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-4 w-full tablet:w-1/2 flex flex-col items-center text-center shadow-inner">
                     <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1.5">Room File</span>
                     <span className="text-sm tablet:text-base text-zinc-300 truncate w-full px-2 font-medium">Host's Original File</span>
                  </div>
                </div>

                <div className="relative w-full tablet:w-auto">
                  <input type="file" accept="video/*" onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Select Video" />
                  <button className="w-full tablet:w-auto bg-red-600 hover:bg-red-500 text-white font-semibold tablet:font-medium rounded-xl tablet:rounded-lg px-8 py-3.5 tablet:py-3 transition-all shadow-[0_4px_14px_rgba(220,38,38,0.4)] active:scale-95 tablet:shadow-lg uppercase tracking-wide tablet:normal-case tablet:tracking-normal text-[15px] tablet:text-base">
                    Select a different file
                  </button>
                </div>
              </div>
            ) : fileVerifyStatus === 'verified' ? (
               <div className="bg-zinc-950/50 border border-teal-900/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-teal-900/30 rounded-full flex items-center justify-center mb-4 border border-teal-500/20">
                  <Check className="w-8 h-8 text-teal-500" />
                </div>
                <span className="text-xl font-medium text-white mb-2">Verified ✓</span>
                <span className="text-sm text-zinc-400 mb-6">Your file matches the room.</span>
                
                {role === 'host' && (
                  <div className="w-full text-left mb-6 tablet:mb-8 pb-6 tablet:pb-8 border-b border-zinc-800/50 border-t pt-6 tablet:pt-8">
                     <ControlPolicySelector />
                  </div>
                )}

                <div className="fixed bottom-0 left-0 right-0 z-50 tablet:static tablet:mt-6 bg-zinc-950/90 tablet:bg-transparent backdrop-blur-lg tablet:backdrop-blur-none border-t border-white/5 tablet:border-none">
                  {role === 'host' && !canStart && (
                    <p className="text-xs text-amber-500 text-center mt-3 mb-2 tablet:mt-0 tablet:mb-4 animate-pulse font-medium">Waiting for all participants to verify files...</p>
                  )}
                  <button
                    onClick={() => navigate(`/room/${roomId}/watch`)}
                    disabled={!canStart}
                    className="w-full h-[56px] tablet:h-auto tablet:w-auto bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-900 tablet:disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-semibold tablet:font-medium tablet:rounded-lg tablet:px-8 tablet:py-3 transition-colors shadow-[0_-4px_20px_rgba(0,0,0,0.4)] tablet:shadow-lg flex items-center justify-center text-[17px] tablet:text-base uppercase tracking-wider tablet:normal-case tablet:tracking-normal active:bg-teal-700 disabled:opacity-90"
                  >
                    {role === 'host' ? 'Start Watching' : 'Enter Room'}
                  </button>
                  <div className="h-[env(safe-area-inset-bottom)] bg-zinc-900 tablet:hidden w-full"></div>
                </div>
                {/* mobile spacer */}
                <div className="h-[90px] tablet:hidden w-full"></div>

              </div>
            ) : (
              <div className="relative border-2 border-dashed border-zinc-700 hover:border-teal-500/50 rounded-2xl h-40 tablet:h-auto tablet:p-16 flex flex-col items-center justify-center text-center bg-zinc-950/50 hover:bg-zinc-800/30 transition-all cursor-pointer group">
                <input type="file" accept="video/*" onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Select Video" />
                <div className="w-12 h-12 tablet:w-20 tablet:h-20 bg-zinc-800 group-hover:bg-zinc-700/80 rounded-full flex items-center justify-center mb-3 tablet:mb-6 transition-colors shadow-lg">
                  <Play className="w-6 h-6 tablet:w-10 tablet:h-10 text-teal-500 ml-1 tablet:ml-1.5" />
                </div>
                <span className="block tablet:hidden text-lg font-medium text-white px-4">Tap to select your movie file</span>
                <span className="hidden tablet:block text-xl font-medium text-white mb-2">Click to browse</span>
                <span className="hidden tablet:block text-sm text-zinc-500">or drag and drop your local video file here</span>
              </div>
            )}
            
          </div>
        </div>

        <div className="tablet:col-span-1 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 tablet:p-5 shadow-xl flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold leading-none">Room Code</p>
                {useRoomStore.getState().roomHasPassword && (
                  <div className="flex items-center gap-1 text-zinc-500 bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px] font-medium tracking-wide">
                    <Lock size={10} className="mb-[1px]" />
                    <span>Private</span>
                  </div>
                )}
              </div>
              <p className="text-2xl font-mono font-bold text-white tracking-widest leading-none">{roomId}</p>
            </div>
            <button 
              onClick={handleCopyLink} 
              className="p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 transition-all active:scale-95 flex items-center justify-center"
            >
              {copied ? <Check className="w-5 h-5 text-teal-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          
          <ParticipantList variant="waiting-room" />
        </div>
      </div>
    </div>
  );
}
