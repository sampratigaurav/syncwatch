import { useState, useEffect, useRef } from 'react';

export const SyncSimulator = () => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [signalFlash, setSignalFlash] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setProgress((prev) => (prev >= 100 ? 0 : prev + 0.2));
      }, 30);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleToggle = () => {
    setSignalFlash(true);
    setTimeout(() => setSignalFlash(false), 300);
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-16 flex flex-col items-center">
      <div className="mb-8 flex items-center gap-2 px-3 py-1.5 bg-zinc-900/80 border border-zinc-800 rounded-full shadow-sm">
        <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-500'}`} />
        <span className="text-xs font-mono text-zinc-300">
          State: Synced <span className="text-emerald-500/70">(0ms drift)</span>
        </span>
      </div>

      <div className="relative w-full flex flex-col md:flex-row items-center justify-center gap-4 md:gap-12">
        <MockBrowser progress={progress} isPlaying={isPlaying} />

        <div className="flex flex-col items-center justify-center z-10">
          <button
            onClick={handleToggle}
            className="w-14 h-14 flex items-center justify-center bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-full shadow-lg transition-transform active:scale-95"
            aria-label="Simulate Pause/Play"
          >
            {isPlaying ? (
              <svg className="w-6 h-6 text-zinc-200" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
            ) : (
              <svg className="w-6 h-6 text-zinc-200 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            )}
          </button>

          <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-[2px] bg-zinc-800 -z-10">
            <div className={`h-full bg-emerald-500 transition-opacity duration-300 ${signalFlash ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        </div>

        <MockBrowser progress={progress} isPlaying={isPlaying} />
      </div>
    </div>
  );
};

const MockBrowser = ({ progress, isPlaying }: { progress: number; isPlaying: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying]);

  return (
    <div className="w-full md:w-2/5 aspect-video bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col relative group">
      <div className="h-8 bg-zinc-900/50 border-b border-zinc-800 flex items-center px-4 gap-2 z-10 absolute top-0 w-full backdrop-blur-sm">
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
      </div>
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        <video 
          ref={videoRef}
          src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" 
          className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
          muted 
          loop 
          playsInline
        />
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-[2px] transition-all z-20">
            <span className="text-white font-medium text-sm tracking-widest bg-black/40 px-3 py-1 rounded-md border border-white/10">PAUSED</span>
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-zinc-800/80 z-20">
          <div className="h-full bg-emerald-500 transition-all duration-75 ease-linear" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
};
