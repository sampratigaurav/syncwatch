import React, { useEffect, useRef } from 'react';

interface TimeDisplayProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  duration: number;
}

const formatTime = (time: number) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ videoRef, duration }) => {
  const timeDesktopRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      if (timeDesktopRef.current) {
        timeDesktopRef.current.textContent = `${formatTime(video.currentTime)} / ${formatTime(duration)}`;
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [videoRef, duration]);

  // Initial render with 0:00
  return (
    <span 
      ref={timeDesktopRef}
      className="hidden tablet:block text-white/80 text-sm font-medium tabular-nums shadow-sm ml-2"
    >
      0:00 / {formatTime(duration)}
    </span>
  );
};
