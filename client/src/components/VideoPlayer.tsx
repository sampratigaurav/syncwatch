import { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '../store/roomStore';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, Subtitles } from 'lucide-react';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { ReactionButton } from './ReactionButton';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface VideoPlayerProps {
  src: string;
  onPlay: () => void;
  onPause: () => void;
  onSeeked: () => void;
  onWaiting: () => void;
  onCanPlay: () => void;
  onPlaying?: () => void;
  onTimeUpdate?: () => void;
  subtitleBlobUrl: string | null;
  subtitleEnabled: boolean;
  onSubtitleToggle: () => void;
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, onPlay, onPause, onSeeked, onWaiting, onCanPlay, onPlaying, onTimeUpdate, subtitleBlobUrl, subtitleEnabled, onSubtitleToggle }, externalRef) => {
    const { participants, canIControl, controlPolicy } = useRoomStore();
    const hasControl = canIControl();
    const hostName = participants.find(p => p.role === 'host')?.nickname || 'Host';
    
    // Internal refs
    const containerRef = useRef<HTMLDivElement>(null);
    const internalVideoRef = useRef<HTMLVideoElement | null>(null);
    const trackRef = useRef<HTMLTrackElement>(null);
    
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

    // States
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(1);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Controls visibility
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<number | undefined>(undefined);

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
      if (internalVideoRef.current) {
        setCurrentTime(internalVideoRef.current.currentTime);
      }
      onTimeUpdate?.();
    };

    const handleNativePlay = () => {
      setIsPlaying(true);
      onPlay();
      resetControlsTimeout();
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

    // Format time (mm:ss)
    const formatTime = (time: number) => {
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
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

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!hasControl || !internalVideoRef.current) return;
      const time = parseFloat(e.target.value);
      internalVideoRef.current.currentTime = time;
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

    const progressPercentage = (currentTime / duration) * 100;

    return (
      <div 
        ref={containerRef} 
        className="relative w-full aspect-video tablet:aspect-auto tablet:h-full bg-black group overflow-hidden"
        onMouseMove={resetControlsTimeout}
        onMouseLeave={() => isPlaying ? setShowControls(false) : null}
        onClick={() => {
          if (!showControls) {
             setShowControls(true);
             resetControlsTimeout();
          } else {
             togglePlay();
          }
        }}
      >
        <style>{`
          video::cue {
            font-size: 1.1rem;
            font-family: var(--font);
            background: rgba(0, 0, 0, 0.75);
            color: white;
            border-radius: 4px;
            padding: 2px 6px;
            line-height: 1.5;
          }
        `}</style>
        <video
          ref={setRefs}
          src={src}
          className="w-full h-full object-contain cursor-pointer"
          onPlay={handleNativePlay}
          onPause={handleNativePause}
          onSeeked={onSeeked}
          onWaiting={onWaiting}
          onCanPlay={onCanPlay}
          onPlaying={onPlaying}
          onTimeUpdate={handleNativeTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
        >
          {subtitleBlobUrl && (
            <track
              ref={trackRef}
              kind="subtitles"
              src={subtitleBlobUrl}
              default
            />
          )}
        </video>

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
            "absolute bottom-0 left-0 right-0 p-2 tablet:p-6 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent transition-opacity duration-300 flex flex-col tablet:gap-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          
          {/* Time display (Mobile Only: Above Progress Bar) */}
          <div className="flex tablet:hidden items-center justify-between text-xs font-medium text-white/90 px-2 mb-1 drop-shadow-md">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Progress Bar (scrubber) */}
          <div className="relative group/scrubber flex items-center w-full h-10 tablet:h-4 cursor-pointer">
            <input 
              type="range"
              min={0}
              max={duration || 100}
              step="any"
              value={currentTime}
              onChange={handleSeek}
              disabled={!hasControl}
              className="absolute inset-0 w-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            />
            {/* Base track */}
            <div className="absolute w-full h-[6px] tablet:h-[3px] bg-white/30 tablet:bg-white/20 rounded-full group-hover/scrubber:h-[12px] tablet:group-hover/scrubber:h-[5px] transition-all" />
            {/* Fill track */}
            <div 
              className="absolute h-[6px] tablet:h-[3px] bg-teal-500 rounded-full group-hover/scrubber:h-[12px] tablet:group-hover/scrubber:h-[5px] transition-all" 
              style={{ width: `${progressPercentage}%` }}
            />
            {/* Scrubber dot */}
            <div 
              className="absolute h-5 w-5 tablet:h-3 tablet:w-3 bg-white rounded-full tablet:scale-0 group-hover/scrubber:scale-100 transition-transform -ml-2.5 tablet:-ml-1.5 z-0 shadow-lg" 
              style={{ left: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1 tablet:mt-0 px-1 tablet:px-0">
            <div className="flex items-center gap-1 tablet:gap-4">
              {/* Skip Back */}
              <button 
                 onClick={(e) => { e.stopPropagation(); skipBackward(); }}
                 disabled={!hasControl}
                 className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus:outline-none",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                 <RotateCcw className="w-6 h-6 tablet:w-5 tablet:h-5" />
              </button>

              {/* Playback Toggle */}
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                disabled={!hasControl}
                className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus:outline-none",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                {isPlaying ? <Pause className="w-8 h-8 tablet:w-6 tablet:h-6 fill-current" /> : <Play className="w-8 h-8 tablet:w-6 tablet:h-6 fill-current pl-1 tablet:pl-0" />}
              </button>

              {/* Skip Forward */}
              <button 
                 onClick={(e) => { e.stopPropagation(); skipForward(); }}
                 disabled={!hasControl}
                 className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus:outline-none",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                 <RotateCw className="w-6 h-6 tablet:w-5 tablet:h-5" />
              </button>

              {/* Volume Slider - Unlocked for Viewer */}
              <div className="flex items-center gap-2 group/volume relative ml-1 tablet:ml-0">
                <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus:outline-none">
                  {isMuted || volume === 0 ? <VolumeX className="w-6 h-6 tablet:w-5 tablet:h-5" /> : <Volume2 className="w-6 h-6 tablet:w-5 tablet:h-5" />}
                </button>
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
              <span className="hidden tablet:block text-white/80 text-sm font-medium tabular-nums shadow-sm ml-2">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-1 tablet:gap-4">
              <button 
                onClick={(e) => { 
                   e.stopPropagation(); 
                   if (subtitleBlobUrl) onSubtitleToggle(); 
                }}
                disabled={!subtitleBlobUrl}
                title={!subtitleBlobUrl ? "Load a subtitle file in the sidebar to enable captions" : "Toggle Captions"}
                className={cn(
                  "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center transition-colors focus:outline-none max-[360px]:hidden group relative",
                  !subtitleBlobUrl ? "text-white/30 [.light_&]:text-zinc-400 cursor-not-allowed" :
                  subtitleEnabled ? "text-teal-400" : "text-white [.light_&]:text-zinc-600 hover:text-teal-400 [.light_&]:hover:text-teal-500"
                )}
              >
                <Subtitles className="w-6 h-6 tablet:w-5 tablet:h-5" />
                {subtitleEnabled && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-teal-400 rounded-full tablet:hidden" />
                )}
              </button>

              <ReactionButton 
                 onSend={(emoji) => socket.emit(EVENTS.SEND_REACTION, { emoji })}
              />

              {/* Fullscreen Toggle */}
              <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center text-white hover:text-teal-400 transition-colors focus:outline-none pr-2 tablet:pr-0">
                {isFullscreen ? <Minimize className="w-6 h-6 tablet:w-5 tablet:h-5" /> : <Maximize className="w-6 h-6 tablet:w-5 tablet:h-5" />}
              </button>
            </div>
          </div>
          
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
