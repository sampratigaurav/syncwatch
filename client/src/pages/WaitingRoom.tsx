import { useEffect, useState } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useSocket } from '../hooks/useSocket';
import { useFileVerify } from '../hooks/useFileVerify';
import { useNavigate, useParams } from 'react-router-dom';
import ParticipantList from '../components/ParticipantList';
import ControlPolicySelector from '../components/ControlPolicySelector';
import { Copy, Check, Play, AlertTriangle, Loader2 } from 'lucide-react';

export default function WaitingRoom() {
  const { roomId, participants, isConnected, role, fileVerifyStatus } = useRoomStore();
  const { roomId: urlId } = useParams();
  const navigate = useNavigate();
  useSocket();
  const { verifyFile, mismatchError } = useFileVerify();

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

  if (!roomId) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <div className="md:col-span-2 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-10 shadow-xl">
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Waiting Room</h1>
            <p className="text-zinc-400 mb-8">Select the video file you want to watch.</p>
            
            {fileVerifyStatus === 'computing' ? (
              <div className="bg-zinc-950/50 border border-teal-900/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-teal-900/30 rounded-full flex items-center justify-center mb-4 border border-teal-500/20">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                </div>
                <span className="text-xl font-medium text-white mb-2">Verifying File...</span>
                <span className="text-sm text-zinc-400">Computing checksum to ensure sync</span>
              </div>
            ) : fileVerifyStatus === 'mismatch' ? (
              <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <span className="text-xl font-medium text-white mb-2">File Mismatch</span>
                <span className="text-sm text-red-400 mb-6">{mismatchError}</span>
                <div className="relative">
                  <input type="file" accept="video/*" onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Select Video" />
                  <button className="bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg px-8 py-3 transition-colors shadow-lg">
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
                  <div className="w-full text-left mb-8 pb-8 border-b border-zinc-800/50 border-t pt-8">
                     <ControlPolicySelector />
                  </div>
                )}

                <button
                  onClick={() => navigate(`/room/${roomId}/watch`)}
                  disabled={!canStart}
                  className="bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-lg px-8 py-3 transition-colors shadow-lg"
                >
                  {role === 'host' ? 'Start watching' : 'Enter Room'}
                </button>
                {role === 'host' && !canStart && (
                  <p className="text-xs text-amber-500 mt-4 animate-pulse">Waiting for all participants to verify files...</p>
                )}
              </div>
            ) : (
              <div className="relative border-2 border-dashed border-zinc-700 hover:border-teal-500/50 rounded-2xl p-16 flex flex-col items-center justify-center text-center bg-zinc-950/50 hover:bg-zinc-800/30 transition-all cursor-pointer group">
                <input type="file" accept="video/*" onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Select Video" />
                <div className="w-20 h-20 bg-zinc-800 group-hover:bg-zinc-700/80 rounded-full flex items-center justify-center mb-6 transition-colors shadow-lg">
                  <Play className="w-10 h-10 text-teal-500 ml-1.5" />
                </div>
                <span className="text-xl font-medium text-white mb-2">Click to browse</span>
                <span className="text-sm text-zinc-500">or drag and drop your local video file here</span>
              </div>
            )}
            
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-xl flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-500 uppercase tracking-widest font-semibold mb-1">Room Code</p>
              <p className="text-2xl font-mono font-bold text-white tracking-widest leading-none">{roomId}</p>
            </div>
            <button 
              onClick={handleCopyLink} 
              className="p-3 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-lg text-zinc-300 transition-all active:scale-95 flex items-center justify-center"
            >
              {copied ? <Check className="w-5 h-5 text-teal-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          
          <ParticipantList />
          
          {!isConnected && (
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-4 text-amber-400 text-sm animate-pulse flex items-center">
              <div className="w-2 h-2 rounded-full bg-amber-500 mr-3"></div>
              Connecting to server...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
