import React, { useEffect, useRef, useState } from 'react';

interface ProgressBarProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  hasControl: boolean;
  duration: number;
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const ProgressBar: React.FC<ProgressBarProps> = ({ videoRef, hasControl, duration }) => {
  const [time, setTime] = useState(0);
  const fillRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const timeMobileRef = useRef<HTMLDivElement>(null);
  const timeDesktopRef = useRef<HTMLSpanElement>(null);

  // Directly hook into native timeupdate to avoid re-rendering parent components
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      setTime(currentTime);

      const progressPercentage = (currentTime / (duration || 1)) * 100;
      
      // Update DOM nodes directly for maximum performance without React state overhead
      if (fillRef.current) {
        fillRef.current.style.width = `${progressPercentage}%`;
      }
      if (dotRef.current) {
        dotRef.current.style.left = `${progressPercentage}%`;
      }
      
      const formattedCurrent = formatTime(currentTime);
      const formattedDuration = formatTime(duration);
      
      if (timeMobileRef.current) {
        timeMobileRef.current.textContent = formattedCurrent;
      }
      if (timeDesktopRef.current) {
        timeDesktopRef.current.textContent = `${formattedCurrent} / ${formattedDuration}`;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef, duration]);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!hasControl || !videoRef.current) return;
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setTime(newTime);
  };

  return (
    <>
      {/* Time display (Mobile Only: Above Progress Bar) */}
      <div className="flex tablet:hidden items-center justify-between text-xs font-medium text-white/90 px-2 mb-1 drop-shadow-md">
        <span ref={timeMobileRef}>0:00</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Progress Bar (scrubber) */}
      <div className="relative group/scrubber flex items-center w-full h-10 tablet:h-4 cursor-pointer">
        <input 
          type="range"
          min={0}
          max={duration || 100}
          step="any"
          value={time}
          onChange={handleSeek}
          disabled={!hasControl}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        {/* Base track */}
        <div className="absolute w-full h-[6px] tablet:h-[4px] bg-white/20 rounded-full group-hover/scrubber:h-[12px] tablet:group-hover/scrubber:h-[8px] transition-all duration-200" />
        {/* Fill track */}
        <div 
          ref={fillRef}
          className="absolute h-[6px] tablet:h-[4px] bg-teal-500 rounded-full group-hover/scrubber:h-[12px] tablet:group-hover/scrubber:h-[8px] transition-all duration-200 shadow-[0_0_15px_rgba(20,184,166,0.8)]" 
          style={{ width: '0%' }}
        />
        {/* Scrubber dot */}
        <div 
          ref={dotRef}
          className="absolute h-5 w-5 tablet:h-4 tablet:w-4 bg-white rounded-full tablet:scale-0 group-hover/scrubber:scale-100 transition-transform -ml-2.5 tablet:-ml-2 z-0 shadow-lg" 
          style={{ left: '0%' }}
        />
      </div>

      {/* Desktop Time Display container (we use a portal or place it in the DOM structure) */}
      {/* Wait, the desktop time display is typically inline with the volume controls. We'll render it here, but position it absolute or just let the parent handle layout. Actually, returning multiple nodes is messy for layout. Let's make ProgressBar strictly the bar and mobile time, and let VideoPlayer handle the desktop time. Wait, if VideoPlayer handles desktop time, it needs to re-render. We can export a `TimeDisplay` component instead. */}
    </>
  );
};
