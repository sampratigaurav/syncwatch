import { forwardRef, useState, useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '../store/roomStore';
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX, Maximize, Minimize, Subtitles } from 'lucide-react';
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
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, onPlay, onPause, onSeeked, onWaiting, onCanPlay, onPlaying, onTimeUpdate }, externalRef) => {
    const { participants, canIControl, controlPolicy } = useRoomStore();
    const hasControl = canIControl();
    const hostName = participants.find(p => p.role === 'host')?.nickname || 'Host';
    
    // Internal refs
    const containerRef = useRef<HTMLDivElement>(null);
    const internalVideoRef = useRef<HTMLVideoElement | null>(null);
    
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
      }, 2000);
    }, [isPlaying]);

    useEffect(() => {
      resetControlsTimeout();
      return () => {
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      };
    }, [resetControlsTimeout]);

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
        className="relative w-full h-full bg-black group overflow-hidden"
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
        />

        {/* Following Badge Removed per request to move below controls */}

        {/* Controls Overlay */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-zinc-950/90 via-zinc-950/40 to-transparent transition-opacity duration-300 flex flex-col gap-4",
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {/* Progress Bar (scrubber) */}
          <div className="relative group/scrubber flex items-center w-full h-4 cursor-pointer">
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
            <div className="absolute w-full h-[3px] bg-white/20 rounded-full group-hover/scrubber:h-[5px] transition-all" />
            {/* Fill track */}
            <div 
              className="absolute h-[3px] bg-teal-500 rounded-full group-hover/scrubber:h-[5px] transition-all" 
              style={{ width: `${progressPercentage}%` }}
            />
            {/* Scrubber dot */}
            <div 
              className="absolute h-3 w-3 bg-white rounded-full scale-0 group-hover/scrubber:scale-100 transition-transform -ml-1.5 z-0" 
              style={{ left: `${progressPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Playback Toggle */}
              <button 
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                disabled={!hasControl}
                className={cn(
                  "text-white hover:text-teal-400 transition-colors focus:outline-none",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
              </button>

              {/* Skip Back */}
              <button 
                 onClick={skipBackward}
                 disabled={!hasControl}
                 className={cn(
                  "text-white hover:text-teal-400 transition-colors focus:outline-none",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                 <RotateCcw className="w-5 h-5" />
              </button>

              {/* Skip Forward */}
              <button 
                 onClick={skipForward}
                 disabled={!hasControl}
                 className={cn(
                  "text-white hover:text-teal-400 transition-colors focus:outline-none",
                  !hasControl && "opacity-50 hover:text-white cursor-not-allowed"
                )}
              >
                 <RotateCw className="w-5 h-5" />
              </button>

              {/* Volume Slider - Unlocked for Viewer */}
              <div className="flex items-center gap-2 group/volume relative">
                <button onClick={toggleMute} className="text-white hover:text-teal-400 transition-colors focus:outline-none">
                  {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                  className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all duration-300 origin-left accent-teal-500 cursor-pointer"
                />
              </div>

              {/* Time display */}
              <span className="text-white/80 text-sm font-medium tabular-nums shadow-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-4">
              {/* CC Button Placeholder */}
              <button className="text-white hover:text-teal-400 transition-colors focus:outline-none">
                <Subtitles className="w-5 h-5" />
              </button>

              {/* Fullscreen Toggle */}
              <button onClick={toggleFullscreen} className="text-white hover:text-teal-400 transition-colors focus:outline-none">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          {/* Subtle indicator below controls */}
          {!hasControl && controlPolicy === 'host_only' && (
            <div className="absolute -bottom-6 left-0 right-0 text-center pointer-events-none">
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mr-2 pulse-slow" />
                Following {hostName}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';
