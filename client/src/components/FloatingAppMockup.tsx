import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Play, Volume2, Maximize, MousePointer2 } from 'lucide-react';

export default function FloatingAppMockup() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Motion values for mouse tracking
  const mouseX = useMotionValue(0.5); // 0 to 1
  const mouseY = useMotionValue(0.5); // 0 to 1

  // Smooth springs to make the parallax feel weighty and premium
  const springConfig = { damping: 25, stiffness: 100, mass: 1 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  // Map mouse position to rotation (-15deg to 15deg)
  const rotateX = useTransform(springY, [0, 1], [10, -10]);
  const rotateY = useTransform(springX, [0, 1], [-15, 15]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      
      // Calculate normalized mouse position (0 to 1)
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      
      mouseX.set(x);
      mouseY.set(y);
    };

    const handleMouseLeave = () => {
      mouseX.set(0.5);
      mouseY.set(0.5);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }
    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [mouseX, mouseY]);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full min-h-[400px] tablet:min-h-[500px] flex items-center justify-center cursor-crosshair overflow-visible z-20"
      style={{ perspective: 1200 }}
    >
      {/* 3D Wrapper */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative w-[320px] tablet:w-[540px] aspect-video will-change-transform"
      >
        {/* Deep Ambient Shadow behind the window */}
        <div 
          className="absolute inset-[-40px] bg-green-500/20 blur-[60px] rounded-[40px] -z-10"
          style={{ transform: 'translateZ(-50px)' }}
        />

        {/* Main App Window */}
        <div 
          className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Fake Header */}
          <div className="h-8 border-b border-white/5 flex items-center px-4 gap-2 bg-white/[0.02]">
            <div className="flex gap-1.5 ml-1">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <div className="mx-auto bg-black/40 border border-white/5 rounded-md px-16 py-1">
              <div className="w-24 h-1 bg-white/10 rounded-full" />
            </div>
          </div>

          {/* Cinematic Looping Video */}
          <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
             <video 
               autoPlay 
               loop 
               muted 
               playsInline
               className="absolute inset-0 w-full h-full object-cover opacity-80"
               src="/loop video.mp4" 
             />
             {/* Subtly animated video placeholder gradient overlay for extra premium color bleed */}
             <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/30 via-transparent to-green-900/30 mix-blend-overlay" />
             <div className="relative z-10 w-14 h-14 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-2xl transition-all hover:scale-110 hover:bg-white/20 cursor-pointer">
               <Play size={24} className="text-white ml-1 fill-white/80" />
             </div>
          </div>

          {/* Fake Controls */}
          <div className="h-10 border-t border-white/5 bg-white/[0.02] flex items-center px-4 gap-4">
             <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 w-[45%] bg-teal-500" />
             </div>
             <Volume2 size={14} className="text-zinc-500" />
             <Maximize size={14} className="text-zinc-500" />
          </div>
        </div>

        {/* Floating Cursor 1 (Sarah) - Popped forward in Z space */}
        <motion.div 
          className="absolute top-[20%] left-[15%] pointer-events-none drop-shadow-2xl"
          style={{ transform: 'translateZ(60px)' }}
        >
          <MousePointer2 size={24} className="text-white fill-white/80 -rotate-12 drop-shadow-md" />
          <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full rounded-tl-none absolute top-full left-4 mt-0 ml-0 shadow-xl">
            Sarah
          </div>
        </motion.div>

        {/* Floating Cursor 2 (Alex) - Popped even further forward in Z space */}
        <motion.div 
          className="absolute bottom-[25%] right-[10%] pointer-events-none drop-shadow-2xl"
          style={{ transform: 'translateZ(100px)' }}
        >
          <MousePointer2 size={24} className="text-white fill-white/80 -rotate-12 drop-shadow-md" />
          <div className="bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-bold px-2.5 py-1 rounded-full rounded-tl-none absolute top-full left-4 mt-0 ml-0 shadow-xl">
            Alex
          </div>
        </motion.div>

        {/* Floating "Sync Label" - Popped backward in Z space */}
        <motion.div 
          className="absolute -top-6 -right-4 bg-zinc-900/80 backdrop-blur-md border border-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-xl"
          style={{ transform: 'translateZ(30px)' }}
        >
          Latency: <span className="text-teal-400">12ms</span>
        </motion.div>

      </motion.div>
    </div>
  );
}
