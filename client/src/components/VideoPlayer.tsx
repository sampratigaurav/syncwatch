import { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, Subtitles, Activity } from 'lucide-react';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { ReactionButton } from './ReactionButton';
import { StatsForNerds } from './StatsForNerds';
import SubtitleLoader from './SubtitleLoader';
import { ProgressBar } from './ProgressBar';
import { TimeDisplay } from './TimeDisplay';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  src: string;
  isTorrent?: boolean;
  magnetURI?: string | null;
  onPlay: () => void;
  onPause: () => void;
  onSeeked: () => void;
  onWaiting: () => void;
  onCanPlay: () => void;
  onPlaying?: () => void;
  onTimeUpdate?: () => void;
  onEnded?: () => void;
  subtitleBlobUrl: string | null;
  subtitleEnabled: boolean;
  onSubtitleToggle: () => void;
  onSubtitleLoaded: (url: string) => void;
  onSubtitleCleared: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, isTorrent, magnetURI, onPlay, onPause, onSeeked, onWaiting, onCanPlay, onPlaying, onTimeUpdate, onEnded, subtitleBlobUrl, subtitleEnabled, onSubtitleToggle, onSubtitleLoaded, onSubtitleCleared }, externalRef) => {
    const { participants, controlPolicy } = useRoomStore(useShallow(state => ({
      participants: state.participants,
      controlPolicy: state.controlPolicy,
    })));
    const hasControl = useRoomStore(state => state.canIControl());
    const hostName = participants.find(p => p.role === 'host')?.nickname || 'Host';
    
    const containerRef = useRef<HTMLDivElement>(null);
    const internalVideoRef = useRef<HTMLVideoElement | null>(null);
    const trackRef = useRef<HTMLTrackElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number | null>(null);

    // Theater Mode Loop
    useEffect(() => {
      if (!internalVideoRef.current || !canvasRef.current) return;
      const video = internalVideoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) return;

      let lastDrawTime = 0;
      const fps = 15;
      const frameInterval = 1000 / fps;

      const drawFrame = (time: number) => {
        if (document.visibilityState === 'hidden' || video.paused || video.ended) {
          rafRef.current = null;
          return;
        }

        if (time - lastDrawTime >= frameInterval) {
          try {
            ctx.drawImage(video, 0, 0, 64, 36);
            lastDrawTime = time;
          } catch {
            // Ignore cross-origin canvas taint errors
          }
        }
        rafRef.current = requestAnimationFrame(drawFrame);
      };

      // Only start if playing initially
      if (!video.paused) {
        rafRef.current = requestAnimationFrame(drawFrame);
      }

      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }, []);
    
    // Sync external ref
    const setRefs = useCallback(
      (element: HTMLVideoElement) => {
        internalVideoRef.current = element;
        if (typeof externalRef === 'function') {
          externalRef(element);
        } else if (externalRef) {
          externalRef.current = element;
        }
      },
      [externalRef]
    );

    // Torrent rendering
    useEffect(() => {
      if (isTorrent && magnetURI && internalVideoRef.current) {
        if (src) {
           console.log('Using local file src instead of WebTorrent renderTo');
           return;
        }

        // Clear src and load torrent
        internalVideoRef.current.src = '';
        internalVideoRef.current.load();
        
        import('../lib/torrentManager').then(({ torrentManager }) => {
          if (torrentManager.activeTorrent) {
            console.log('Torrent already active (seeding). Rendering directly.');
            torrentManager.renderTo(internalVideoRef.current!);
            onCanPlay();
          } else {
            torrentManager.download(magnetURI, () => {
              console.log('Torrent stream ready');
              torrentManager.renderTo(internalVideoRef.current!);
              onCanPlay();
            }).catch(console.error);
          }

          torrentManager.onProgress((progress, speed, peers) => {
             useRoomStore.getState().setTorrentHealth({ progress, speed, peers });
          });
        });
      }
    }, [isTorrent, magnetURI, onCanPlay]);

    // States
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
    
    // Controls visibility
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetControlsTimeout = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    }, [isPlaying]);

    useEffect(() => {
      resetControlsTimeout();
      return () => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
    }, [resetControlsTimeout]);

    // Track mode controller
    useEffect(() => {
      if (trackRef.current) {
        trackRef.current.track.mode = subtitleEnabled ? 'showing' : 'hidden';
      }
    }, [subtitleEnabled, subtitleBlobUrl]);

    // Handle native video events to update UI
    const handleNativeTimeUpdate = () => {
      onTimeUpdate?.();
    };

    const handleNativePlay = () => {
      setIsPlaying(true);
      onPlay();
      resetControlsTimeout();

      // Restart theater mode canvas loop
      if (rafRef.current === null && internalVideoRef.current && canvasRef.current) {
        const video = internalVideoRef.current;
        const ctx = canvasRef.current.getContext('2d', { alpha: false });
        if (ctx) {
           let lastDrawTime = 0;
           const frameInterval = 1000 / 15;
           const drawFrame = (time: number) => {
              if (document.visibilityState === 'hidden' || video.paused || video.ended) {
                rafRef.current = null;
                return;
              }
              if (time - lastDrawTime >= frameInterval) {
                try {
                  ctx.drawImage(video, 0, 0, 64, 36);
                  lastDrawTime = time;
                } catch {
                  // Ignore cross-origin canvas taint errors
                }
              }
              rafRef.current = requestAnimationFrame(drawFrame);
           };
           rafRef.current = requestAnimationFrame(drawFrame);
        }
      }
    };

    const handleNativePause = () => {
      setIsPlaying(false);
      onPause();
      setShowControls(true);
    };

    const handleLoadedMetadata = () => {
      if (internalVideoRef.current) {
        setDuration(internalVideoRef.current.duration);
      }
    };

    const handleRateChange = () => {
      if (hasControl && internalVideoRef.current) {
        // Prevent broadcasting automated drift correction adjustments
        // We assume manual changes are significant (e.g. 1.0 -> 1.25)
        // or we check if the user physically changed it... wait, it's safer to just emit if hasControl
        // Actually, only hosts/controllers emit sync events. If a host changes rate, they broadcast it.
        // Wait, if host is correcting their own drift? Hosts don't do drift correction. 
        // Only viewers do drift correction. So if a viewer has control (policy = everyone) and changes rate, they emit.
        // But if they are currently having their rate changed by drift correction... that's tricky.
        // Let's just emit if we have control.
        socket.emit(EVENTS.PLAYBACK_EVENT, {
          action: 'playback_rate_change',
          currentTime: internalVideoRef.current.currentTime,
          timestamp: Date.now(),
          playbackRate: internalVideoRef.current.playbackRate
        });
      }
    };

    // UI Actions
    const togglePlay = () => {
      if (!hasControl) return;
      if (internalVideoRef.current) {
        if (internalVideoRef.current.paused) {
          internalVideoRef.current.play();
        } else {
          internalVideoRef.current.pause();
        }
      }
    };

    const skipForward = () => {
      if (!hasControl || !internalVideoRef.current) return;
      internalVideoRef.current.currentTime = Math.min(internalVideoRef.current.duration, internalVideoRef.current.currentTime + 10);
      // Trigger seeked manually for broadcast or wait for native seeked event
    };

    const skipBackward = () => {
      if (!hasControl || !internalVideoRef.current) return;
      internalVideoRef.current.currentTime = Math.max(0, internalVideoRef.current.currentTime - 10);
    };

    const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      if (internalVideoRef.current) {
        internalVideoRef.current.volume = val;
        internalVideoRef.current.muted = val === 0;
      }
      setIsMuted(val === 0);
    };

    const toggleMute = () => {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      if (internalVideoRef.current) {
        internalVideoRef.current.muted = newMuted;
        if (!newMuted && volume === 0) {
          setVolume(1);
          internalVideoRef.current.volume = 1;
        }
      }
    };

    const toggleFullscreen = async () => {
      if (!containerRef.current) return;
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen().catch(console.error);
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen().catch(console.error);
        setIsFullscreen(false);
      }
    };

    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        switch (e.key.toLowerCase()) {
          case ' ':
            e.preventDefault();
            togglePlay();
            break;
          case 'f':
            e.preventDefault();
            toggleFullscreen();
            break;
          case 'm':
            e.preventDefault();
            toggleMute();
            break;
          case 'arrowleft':
            e.preventDefault();
            skipBackward();
            break;
          case 'arrowright':
            e.preventDefault();
            skipForward();
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasControl, isMuted, volume]);

    return (
      <div 
        ref={containerRef} 
        className={cn("relative w-full aspect-video tablet:aspect-auto tablet:h-full bg-black group overflow-hidden", !showControls && "cursor-none")}
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => isPlaying ? setShowControls(false) : null}
        onClick={() => {
          if (showSubtitleMenu) {
             setShowSubtitleMenu(false);
             return;
          }
          if (!showControls) {
             setShowControls(true);
             resetControlsTimeout();
          } else {
             togglePlay();
          }
        }}
      >
        <style>
          {`
            video::cue {
              transform: translateY(${showControls || showSubtitleMenu ? '-100px' : '-20px'});
              background: rgba(0, 0, 0, 0.75);
              border-radius: 4px;
              padding: 4px 12px;
            }
          `}
        </style>
        
        <canvas
          ref={canvasRef}
          width={64}
          height={36}
          className="absolute z-0 inset-0 w-full h-full object-cover blur-[100px] opacity-70 pointer-events-none scale-110"
        />

        <video
          ref={setRefs}
          src={src || undefined}
          className="relative z-10 w-full h-full object-contain cursor-pointer"
          onPlay={handleNativePlay}
          onPause={handleNativePause}
          onSeeked={onSeeked}
          onWaiting={onWaiting}
          onCanPlay={onCanPlay}
          onPlaying={onPlaying}
          onRateChange={handleRateChange}
          onTimeUpdate={handleNativeTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={onEnded}
        >
          {subtitleBlobUrl && (
            <track
              key={subtitleBlobUrl}
              ref={trackRef}
              kind="subtitles"
              src={subtitleBlobUrl}
              srcLang="en"
              label="English"
              default={subtitleEnabled}
              onLoad={(e) => {
                 const trackElement = e.currentTarget as HTMLTrackElement;
                 trackElement.track.mode = subtitleEnabled ? 'showing' : 'hidden';
              }}
            />
          )}
        </video>
        
        <StatsForNerds isVisible={showStats} videoRef={internalVideoRef} />

        {/* Following Badge */}
        {!hasControl && controlPolicy === 'host_only' && (
          <div className="absolute top-4 left-4 z-40 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 shadow-xl rounded-full px-3 py-1.5 flex items-center pointer-events-none">
            <div className="w-2 h-2 rounded-full bg-teal-500 mr-2 animate-pulse" />
            <span className="text-[11px] tablet:text-xs text-zinc-300 uppercase tracking-widest font-semibold flex items-center justify-center">
              Following {hostName}
            </span>
          </div>
        )}

        {/* Controls Overlay */}
        <div 
          className={cn(
            "absolute z-50 bottom-4 left-4 right-4 tablet:bottom-8 tablet:left-1/2 tablet:-translate-x-1/2 tablet:w-[90%] tablet:max-w-4xl px-4 py-3 tablet:px-6 tablet:py-4 bg-zinc-950/70 backdrop-blur-2xl border border-white/10 rounded-2xl tablet:rounded-3xl transition-all duration-500 flex flex-col gap-2 tablet:gap-3 shadow-[0_20px_50px_rgba(0,0,0,0.6)]",
            showControls || showSubtitleMenu ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          )}
        >
          
          {/* Progress Bar (scrubber) and Mobile Time Display */}
          <ProgressBar 
            videoRef={internalVideoRef} 
            hasControl={hasControl} 
            duration={duration} 
          />

          <div className="flex items-center justify-between mt-1 tablet:mt-0 px-1 tablet:px-0">
            <div className="flex items-center gap-1 tablet:gap-4">
              {/* Skip Back */}
              <motion.button 
                 whileTap={hasControl ? { scale: 0.85 } : {}}
                 onClick={(e: React.MouseEvent) => { e.stopPropagation(); skipBackward(); }}
                 disabled={!hasControl}
                 aria-label={hasControl ? "Skip back 10 seconds" : "Skip back disabled (no permission)"}
                 title={hasControl ? "Skip back 10 seconds" : "Controllers only"}
                 className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                 <RotateCcw className="w-6 h-6 tablet:w-5 tablet:h-5" aria-hidden="true" />
              </motion.button>

              {/* Playback Toggle */}
              <motion.button 
                whileTap={hasControl ? { scale: 0.85 } : {}}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); togglePlay(); }}
                disabled={!hasControl}
                aria-label={hasControl ? (isPlaying ? 'Pause' : 'Play') : "Playback control disabled (no permission)"}
                title={hasControl ? (isPlaying ? 'Pause' : 'Play') : "Controllers only"}
                className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                {isPlaying ? <Pause className="w-8 h-8 tablet:w-6 tablet:h-6 fill-current" aria-hidden="true" /> : <Play className="w-8 h-8 tablet:w-6 tablet:h-6 fill-current pl-1 tablet:pl-0" aria-hidden="true" />}
              </motion.button>

              {/* Skip Forward */}
              <motion.button 
                 whileTap={hasControl ? { scale: 0.85 } : {}}
                 onClick={(e: React.MouseEvent) => { e.stopPropagation(); skipForward(); }}
                 disabled={!hasControl}
                 aria-label={hasControl ? "Skip forward 10 seconds" : "Skip forward disabled (no permission)"}
                 title={hasControl ? "Skip forward 10 seconds" : "Controllers only"}
                 className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                 <RotateCw className="w-6 h-6 tablet:w-5 tablet:h-5" aria-hidden="true" />
              </motion.button>

              {/* Volume Slider - Unlocked for Viewer */}
              <div className="flex items-center gap-2 group/volume relative ml-1 tablet:ml-0">
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                  aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  title={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  className="w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-6 h-6 tablet:w-5 tablet:h-5" aria-hidden="true" /> : <Volume2 className="w-6 h-6 tablet:w-5 tablet:h-5" aria-hidden="true" />}
                </motion.button>
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                  onClick={(e) => e.stopPropagation()}
                  className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 origin-left accent-teal-500 cursor-pointer hidden tablet:block"
                />
              </div>

              {/* Time display (Tablet/Desktop) */}
              <TimeDisplay videoRef={internalVideoRef} duration={duration} />
            </div>

            <div className="flex items-center gap-1 tablet:gap-4">
              {/* Subtitles Menu Wrapper */}
              <div className="relative">
                {/* The Popover */}
                <AnimatePresence>
                {showSubtitleMenu && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute bottom-full right-0 mb-4 w-[280px] tablet:w-72 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden p-4 origin-bottom-right"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-white font-medium text-sm">Subtitles</h4>
                      {subtitleBlobUrl && (
                        <button 
                          onClick={() => onSubtitleToggle()}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors",
                            subtitleEnabled ? "bg-teal-500" : "bg-zinc-700"
                          )}
                        >
                          <div className={cn(
                            "w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-transform",
                            subtitleEnabled ? "left-6 -ml-0.5" : "left-1"
                          )} />
                        </button>
                      )}
                    </div>
                    <SubtitleLoader 
                      onSubtitleLoaded={(url) => {
                        onSubtitleLoaded(url);
                        setShowSubtitleMenu(false);
                      }}
                      onSubtitleCleared={() => {
                        onSubtitleCleared();
                        setShowSubtitleMenu(false);
                      }}
                    />
                  </motion.div>
                )}
                </AnimatePresence>
                <button 
                  onClick={(e) => { 
                     e.stopPropagation(); 
                     setShowSubtitleMenu(!showSubtitleMenu);
                  }}
                  aria-label="Subtitles menu"
                  title="Subtitles"
                  className={cn(
                    "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded group relative",
                    subtitleEnabled ? "text-teal-400" : "text-white/80 hover:text-white"
                  )}
                >
                  <Subtitles className="w-6 h-6 tablet:w-6 tablet:h-6 drop-shadow" aria-hidden="true" />
                  {subtitleEnabled && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-400 rounded-full" aria-hidden="true" />
                  )}
                </button>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); setShowStats(!showStats); }}
                aria-label="Toggle Stats for Nerds"
                title="Toggle Stats for Nerds"
                className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded",
                  showStats ? "text-teal-400" : "text-white [.light_&]:text-zinc-600 hover:text-teal-400 [.light_&]:hover:text-teal-500"
                )}
              >
                <Activity className="w-6 h-6 tablet:w-5 tablet:h-5" aria-hidden="true" />
              </button>

              <ReactionButton 
                 onSend={(emoji) => socket.emit(EVENTS.SEND_REACTION, { emoji })}
              />

              {/* Fullscreen Toggle */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                className="w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded pr-2 tablet:pr-0"
              >
                {isFullscreen ? <Minimize className="w-6 h-6 tablet:w-5 tablet:h-5" aria-hidden="true" /> : <Maximize className="w-6 h-6 tablet:w-5 tablet:h-5" aria-hidden="true" />}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
