import './cinema.css';
import './lobby.css';
import { useEffect, useState } from 'react';
import { SEO } from '../components/layout/SEO';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { useSocket } from '../hooks/useSocket';
import { useFileVerify } from '../hooks/useFileVerify';
import { useNavigate, useParams } from 'react-router-dom';
import ParticipantList from '../components/room/ParticipantList';
import ControlPolicySelector from '../components/room/ControlPolicySelector';
import { Copy, Check, AlertTriangle, Loader2, WifiOff, Lock, Link2, FileVideo, FolderOpen, ArrowLeft, Play, Ticket, Link as LinkIcon } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { useSoundEffects } from '../hooks/useSoundEffects';

export default function WaitingRoom() {
  const { roomId, participants, role, roomHasPassword, fileVerifyStatus, connectionStatus, reconnectAttempt, clearRoomState, errorToast, setErrorToast, magnetURI, setMagnetURI, setIsTorrent } = useRoomStore(useShallow(state => ({
    roomId: state.roomId,
    participants: state.participants,
    role: state.role,
    roomHasPassword: state.roomHasPassword,
    fileVerifyStatus: state.fileVerifyStatus,
    connectionStatus: state.connectionStatus,
    reconnectAttempt: state.reconnectAttempt,
    clearRoomState: state.clearRoomState,
    errorToast: state.errorToast,
    setErrorToast: state.setErrorToast,
    magnetURI: state.magnetURI,
    setMagnetURI: state.setMagnetURI,
    setIsTorrent: state.setIsTorrent
  })));
  const { roomId: urlId } = useParams();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  useSocket(navigate);
  const { verifyFile, mismatchError, forceAccept } = useFileVerify();
  const fileName = useRoomStore(state => state.fileName);
  const { initAudio } = useSoundEffects();

  const [copiedType, setCopiedType] = useState<'link' | 'code' | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'local' | 'magnet'>('local');
  const [magnetInput, setMagnetInput] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  // Show server-driven error messages as an in-app banner
  useEffect(() => {
    if (errorToast) {
      setErrorBanner(errorToast);
      setErrorToast(null);
    }
  }, [errorToast, setErrorToast]);

  useEffect(() => {
    if (!roomId) {
      if (urlId) {
        navigate(`/join/${encodeURIComponent(urlId)}`);
      } else {
        navigate('/');
      }
    }
  }, [roomId, urlId, navigate]);

  const handleCopy = (type: 'link' | 'code') => {
    const text = type === 'link' ? `${window.location.origin}/join/${encodeURIComponent(roomId || '')}` : (roomId || '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 2000);
      }).catch(err => console.error("Clipboard copy failed", err));
    } else {
      // Fallback for non-HTTPS local IPs
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopiedType(type);
        setTimeout(() => setCopiedType(null), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (role === 'host') {
        setIsSeeding(true);
        import('../lib/torrentManager').then(({ torrentManager }) => {
          // Verify host instantly so they can enter the room if they want
          const url = URL.createObjectURL(file);
          useRoomStore.getState().setLocalFileUrl(url);
          useRoomStore.getState().setFileDetails('0'.repeat(64), file.name);
          useRoomStore.getState().setVerifyStatus('verified');
          socket.emit(EVENTS.FILE_VERIFIED, { hash: '0'.repeat(64), size: 0, name: file.name });
          
          setIsSeeding(false);

          // Run fingerprint generation in the background so viewers can verify local files
          verifyFile(file, true);

          // Let the torrent generation happen completely in the background
          torrentManager.seed(file, (uri) => {
            useRoomStore.getState().setMagnetURI(uri);
            useRoomStore.getState().setIsTorrent(true);
            socket.emit(EVENTS.SET_MAGNET_LINK, { magnetURI: uri });
            torrentManager.onProgress((progress, speed, peers) => {
               useRoomStore.getState().setTorrentHealth({ progress, speed, peers });
            });
          }).catch(err => {
            console.error('Failed to seed', err);
          });
        });
      } else {
        verifyFile(file);
      }
    }
  };

  const handleMagnetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput.trim()) return;
    setMagnetURI(magnetInput);
    setIsTorrent(true);
    socket.emit(EVENTS.SET_MAGNET_LINK, { magnetURI: magnetInput });
  };

  const readyCount = participants.filter(participant => participant.status === 'ready').length;
  const allVerified = participants.length > 0 && readyCount === participants.length;
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
    <>
      <SEO title="Waiting Room | SyncWatch" />
      <motion.div 
        initial={reducedMotion ? false : { opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : -15 }}
      transition={{ duration: reducedMotion ? 0 : 0.4, ease: "easeOut" }}
      className="cinema-lobby lobby-page min-h-screen"
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

      {errorBanner && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[95] bg-red-900/90 backdrop-blur-md border border-red-500/50 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300">
          <span className="font-medium text-sm">{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} className="text-red-300 hover:text-white transition-colors text-xs ml-2">✕</button>
        </div>
      )}

      <header className="lobby-header">
        <button onClick={handleGoHome} className="lobby-back"><ArrowLeft size={16} aria-hidden="true" /> Back to home</button>
        <div className="lobby-title-row">
          <div><p className="cinema-kicker">BEFORE THE OPENING SCENE</p><h1>Take your seat.</h1><p>Invite your friends and get your video ready.</p></div>
          <span className="lobby-ready-count"><span aria-hidden="true">✦</span> {readyCount} of {participants.length} ready</span>
        </div>
      </header>
      <div className="lobby-grid">
        <div className="lobby-main">
          <div className="cinema-lobby-panel lobby-file-panel">
            <div className="lobby-panel-heading">
              <span className="lobby-step-label">01 / YOUR VIDEO</span>
              <h2>{fileVerifyStatus === 'verified' ? 'You’re ready for the show.' : 'Bring your own movie.'}</h2>
              <p>Everyone opens a copy on their own device.</p>
            </div>

            {fileVerifyStatus === 'computing' ? (
              <div className="lobby-file-state">
                <div className="w-16 h-16 bg-teal-900/30 rounded-full flex items-center justify-center mb-4 border border-teal-500/20">
                  <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
                </div>
                <span className="text-xl font-medium text-white mb-2">Verifying File...</span>
                <span className="text-sm text-zinc-400">Comparing your video’s audio with the room</span>
              </div>
            ) : fileVerifyStatus === 'mismatch' ? (
              <div className="lobby-file-state lobby-file-error">
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

                <div className="relative w-full tablet:w-auto flex flex-col gap-3">
                  <div className="relative w-full tablet:w-auto">
                    <input type="file" accept="video/*" onChange={onFileSelect} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Select Video" />
                    <button className="w-full tablet:w-auto bg-red-600 hover:bg-red-500 text-white font-semibold tablet:font-medium rounded-xl tablet:rounded-lg px-8 py-3.5 tablet:py-3 transition-all shadow-[0_4px_14px_rgba(220,38,38,0.4)] active:scale-95 tablet:shadow-lg uppercase tracking-wide tablet:normal-case tablet:tracking-normal text-[15px] tablet:text-base">
                      Select a different file
                    </button>
                  </div>
                  <button onClick={forceAccept} className="w-full tablet:w-auto bg-transparent border border-red-900/50 hover:bg-red-950/50 text-red-400 font-semibold tablet:font-medium rounded-xl tablet:rounded-lg px-8 py-3.5 tablet:py-2 transition-all active:scale-95 text-[13px] tablet:text-sm">
                    Force Join (I know this is the right file)
                  </button>
                </div>
              </div>
            ) : fileVerifyStatus === 'verified' ? (
               <div className="lobby-file-state">
                <div className="w-16 h-16 bg-teal-900/30 rounded-full flex items-center justify-center mb-4 border border-teal-500/20">
                  <Check className="w-8 h-8 text-teal-500" />
                </div>
                <span className="lobby-verified-title">Video ready <span aria-hidden="true">✓</span></span>
                {fileName && <p className="lobby-filename">{fileName}</p>}
                 <span className="text-sm text-zinc-400 mb-6">
                   {magnetURI ? 'Connected to peer swarm via WebTorrent.' : 'Your file matches the room.'}
                 </span>
                
                {role === 'host' && (
                  <div className="lobby-policy w-full text-left mb-6 pb-6 border-b border-t pt-6">
                     <ControlPolicySelector />
                  </div>
                )}

                <div className="lobby-start">
                  {role === 'host' && !canStart && <p>Waiting for everyone to get their video ready.</p>}
                  <button onClick={() => { initAudio(); navigate(`/room/${roomId}/watch`); }}
                    disabled={!canStart} className="lobby-start-button">
                    <Play size={17} fill="currentColor" aria-hidden="true" /> {role === 'host' ? 'Start watching' : 'Enter room'}
                  </button>
                </div>

              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {role === 'host' && (
                  <div className="lobby-source-tabs" role="group" aria-label="Video source">
                    <button
                      aria-pressed={activeTab === 'local'}
                      onClick={() => setActiveTab('local')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'local' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Local File
                    </button>
                    <button
                      aria-pressed={activeTab === 'magnet'}
                      onClick={() => setActiveTab('magnet')}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === 'magnet' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
                    >
                      Magnet Link
                    </button>
                  </div>
                )}

                {activeTab === 'local' ? (
                  <>
                    <label className="lobby-dropzone">
                      <input type="file" accept="video/*" onChange={onFileSelect} disabled={isSeeding} aria-label="Select your video file" />
                      <div className="lobby-file-art" aria-hidden="true">
                        <span><FileVideo size={28} /><b>4K</b></span>
                        <span><FileVideo size={28} /><b>MP4</b></span>
                      </div>
                      <strong>{isSeeding ? 'Getting your video ready…' : 'Pick tonight’s feature'}</strong>
                      <span className="lobby-dropzone-note">Choose a video from your device</span>
                      <span className="lobby-browse">{isSeeding ? <Loader2 size={16} className="animate-spin" /> : <FolderOpen size={16} />} Browse files</span>
                      <span className="lobby-format-note">MP4 & WebM work best · Files stay on your device</span>
                    </label>

                {'showDirectoryPicker' in window && (
                  <button 
                    onClick={async () => {
                      try {
                        // @ts-ignore
                        const dirHandle = await window.showDirectoryPicker();
                        const handles: any[] = [];
                        // @ts-ignore
                        for await (const entry of dirHandle.values()) {
                          if (entry.kind === 'file') {
                            const name = entry.name.toLowerCase();
                            if (name.endsWith('.mp4') || name.endsWith('.mkv') || name.endsWith('.webm')) {
                              handles.push(entry);
                            }
                          }
                        }
                        
                        if (handles.length === 0) {
                          setErrorToast("No video files found in the selected folder.");
                          return;
                        }
                        
                        // Sort alphabetically with natural sort (Episode 1 before Episode 2, not Episode 10)
                        handles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
                        
                        useRoomStore.getState().setDirectoryHandles(handles);
                        
                        // Auto-load the first episode
                        const firstFile = await handles[0].getFile();
                        verifyFile(firstFile);
                        
                      } catch (err: any) {
                        if (err.name !== 'AbortError') {
                           console.error('Folder selection failed:', err);
                           setErrorToast("Failed to read folder contents. Please try again.");
                        }
                      }
                    }}
                    className="lobby-folder"
                  >
                    <FolderOpen size={22} aria-hidden="true" /><span><strong>Planning a series night?</strong><small>Pick a folder to play episodes in order</small></span>
                  </button>
                )}
                </>
                ) : (
                  <form onSubmit={handleMagnetSubmit} className="lobby-magnet">
                    <LinkIcon className="w-10 h-10 text-teal-500 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">Paste Magnet Link</h3>
                    <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
                      SyncWatch runs entirely in your browser. <strong className="text-zinc-200">Public torrents will not load</strong> unless they have WebRTC-capable seeders. 
                      Ensure your torrent is actively seeded by a WebTorrent client (like WebTorrent Desktop).
                    </p>
                    <input
                      type="text"
                      aria-label="Magnet link"
                      placeholder="magnet:?xt=urn:btih:..."
                      value={magnetInput}
                      onChange={(e) => setMagnetInput(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all mb-4"
                    />
                    <button
                      type="submit"
                      disabled={!magnetInput.trim()}
                      className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-medium rounded-xl py-3.5 transition-all shadow-lg active:scale-[0.98]"
                    >
                      Connect Swarm
                    </button>
                  </form>
                )}
              </div>
            )}
            
          </div>
        </div>

        <aside className="lobby-sidebar" aria-label="Room invitation and participants">
          <div className="lobby-invite">
            <div className="lobby-invite-top"><span>02 / INVITE YOUR CREW</span><Ticket size={22} aria-hidden="true" /></div>
            <h2>Room ticket</h2>
            <p className="lobby-room-code">{roomId} {roomHasPassword && <Lock size={16} aria-label="PIN protected" />}</p>
            <p className="lobby-invite-note">Send the invite. Save them a seat.</p>
            <div className="lobby-invite-actions">
              <button onClick={() => handleCopy('code')} title="Copy code">{copiedType === 'code' ? <Check size={16} /> : <Copy size={16} />} {copiedType === 'code' ? 'Copied!' : 'Copy code'}</button>
              <button onClick={() => handleCopy('link')} title="Copy invite">{copiedType === 'link' ? <Check size={16} /> : <Link2 size={16} />} {copiedType === 'link' ? 'Copied!' : 'Copy invite'}</button>
            </div>
            <div className="lobby-invite-stub" aria-hidden="true"><span>ADMIT YOUR FRIENDS</span><span>✦ ✦ ✦</span></div>
          </div>
          <ParticipantList variant="waiting-room" />
        </aside>
      </div>
    </motion.div>
    </>
  );
}
