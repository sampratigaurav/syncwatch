import { Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import { Link2, FileVideo, ShieldCheck, Play, Github } from 'lucide-react';

import { m, LazyMotion, domAnimation, useMotionValue, useMotionTemplate } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import CssOrb from '../components/CssOrb';

const FloatingAppMockup = lazy(() => import('../components/FloatingAppMockup'));

const AmbientBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 bg-[#050505] overflow-hidden">
    {/* Dot Matrix Pattern */}
    <div 
      className="absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.8) 1.5px, transparent 1.5px)',
        backgroundSize: '32px 32px',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
        maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)'
      }}
    />
    <div 
      className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] bg-teal-900/30 rounded-full blur-[120px] mix-blend-screen animate-orb-1" 
    />
    <div 
      className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-slate-800/40 rounded-full blur-[150px] mix-blend-screen animate-orb-2" 
    />
  </div>
);

const STEPS = [
  {
    icon: Link2,
    title: "Create or join a room",
    desc: "Share a 6-character room code with whoever you want to watch with. No account needed."
  },
  {
    icon: FileVideo,
    title: "Select your local file",
    desc: "Each person picks their own copy of the video from their device. Nothing is uploaded."
  },
  {
    icon: ShieldCheck,
    title: "File verified instantly",
    desc: "A quick hash check confirms you both have the same file. Takes under a second."
  },
  {
    icon: Play,
    title: "Watch in perfect sync",
    desc: "Press play once. SyncWatch keeps everyone at the exact same moment automatically."
  }
];

const TechTicker = () => {
  return (
    <div 
      className="w-full mt-12 overflow-hidden relative z-10 opacity-60"
      style={{ WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)', maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)' }}
    >
      <m.div 
        className="flex items-center gap-8 whitespace-nowrap w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        style={{ willChange: 'transform' }}
      >
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-8 text-xs tablet:text-sm font-medium text-zinc-400 uppercase tracking-widest pr-8">
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-500" /> 100% Private</span>
            <span className="text-zinc-700">•</span>
            <span className="flex items-center gap-2"><Link2 size={16} className="text-emerald-500" /> WebRTC Powered</span>
            <span className="text-zinc-700">•</span>
            <span className="flex items-center gap-2"><FileVideo size={16} className="text-blue-500" /> Zero Cloud Uploads</span>
            <span className="text-zinc-700">•</span>
            <span className="flex items-center gap-2"><Github size={16} className="text-zinc-400" /> Open Source</span>
            <span className="text-zinc-700">•</span>
          </div>
        ))}
      </m.div>
    </div>
  );
};

const SpotlightCard = ({ step, index }: { step: typeof STEPS[0], index: number }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  };

  const isWide = index === 0 || index === 3;
  const colSpanClass = isWide ? "tablet:col-span-2" : "tablet:col-span-1";

  return (
    <m.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
      onMouseMove={handleMouseMove}
      className={`group relative p-8 tablet:p-10 rounded-3xl bg-zinc-900/40 backdrop-blur-md border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10 flex flex-col justify-end min-h-[300px] ${colSpanClass}`}
    >
      {/* Mobile static glow - disabled on hover-capable devices */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-teal-500/5 opacity-100 [@media(hover:hover)]:opacity-0 transition-opacity duration-500" />
      
      {/* Desktop interactive spotlight */}
      <m.div
        className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-300 group-hover:opacity-100 hidden [@media(hover:hover)]:block"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(20, 184, 166, 0.15),
              transparent 40%
            )
          `,
          mixBlendMode: "overlay"
        }}
      />
      
      <div className="relative w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-auto group-hover:border-teal-500/30 transition-colors duration-300 z-10">
        <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <step.icon className="text-teal-400 w-7 h-7 relative z-10" />
      </div>

      <div className="mt-8 relative z-10">
        <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">{step.title}</h3>
        <p className="text-zinc-400 text-lg leading-relaxed">{step.desc}</p>
      </div>
    </m.div>
  );
};

const FeatureBentoGrid = () => {
  return (
    <div className="w-full max-w-[1200px] mx-auto mt-32 relative z-10 pb-24 px-4 tablet:px-8">
      <div className="text-center mb-16 tablet:mb-24">
        <h2 className="text-3xl tablet:text-5xl font-bold tracking-tight text-white mb-4">How it works</h2>
        <p className="text-base tablet:text-lg text-zinc-400">From your file to in sync — in under 30 seconds</p>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6 tablet:gap-8">
        {STEPS.map((step, index) => (
          <SpotlightCard key={index} step={step} index={index} />
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const isMobile = useMediaQuery('(max-width: 768px)');



  return (
    <LazyMotion features={domAnimation}>
      <m.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="opacity-0 relative flex flex-col items-center min-h-screen overflow-x-hidden selection:bg-teal-500/30 bg-[#050505]"
      >
      <AmbientBackground />
      
      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-[1200px] flex flex-col items-center px-4 tablet:px-8 pt-10 tablet:pt-16">
          
        {/* Row 1: Full-Width Centered Typography */}
        <m.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="opacity-0 -translate-y-5 flex flex-col items-center w-full mb-12 tablet:mb-16"
        >
          <h2 className="text-5xl tablet:text-[4.5rem] font-bold text-white pb-4 tracking-tight leading-[1.1] text-center max-w-5xl drop-shadow-2xl">
            Watch together.<br className="hidden tablet:block" /> In perfect sync.
          </h2>
          <p className="text-zinc-400 text-lg tablet:text-xl text-center max-w-none mb-8">
            Experience movies and shows with your friends in real-time, no matter where they are.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link 
              to="/dashboard"
              className="group relative flex items-center gap-3 px-8 py-4 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 hover:text-teal-300 rounded-full border border-teal-500/30 hover:border-teal-500/60 transition-all duration-300 backdrop-blur-md"
            >
              <div className="absolute inset-0 bg-teal-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full" />
              <Play size={20} className="relative z-10 fill-current" />
              <span className="relative z-10 font-bold tracking-wide">Start Watching for Free</span>
            </Link>
          </div>
        </m.div>

        {/* Row 2: Centered Large Video Mockup */}
        <div className="w-full max-w-6xl mx-auto flex items-center justify-center relative cursor-pointer mt-4 tablet:mt-8 px-4 tablet:px-0">
           <Link to="/dashboard" className="w-full h-full block">
             <m.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               transition={{ duration: 0.5, ease: "easeOut" }}
               className="w-full h-full min-h-[300px] tablet:min-h-[500px] flex items-center justify-center relative opacity-0"
             >
               {isMobile ? (
                 <CssOrb />
               ) : (
                 <Suspense fallback={<div className="w-full h-full min-h-[500px]" />}>
                   <div className="w-full h-full transform transition-transform duration-500 rounded-2xl">
                     <FloatingAppMockup />
                   </div>
                 </Suspense>
               )}
             </m.div>
           </Link>
        </div>

        {/* Tech Ticker */}
        <div className="w-full relative mt-16 tablet:mt-24 mb-8 tablet:mb-12">
          <TechTicker />
        </div>

        <FeatureBentoGrid />

        {/* Support Section */}
        <div className="w-full relative flex flex-col items-center mt-12 tablet:mt-16 pt-16 pb-24 overflow-hidden rounded-t-[40px]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-teal-900/20 via-zinc-900/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

          <div className="w-full max-w-[600px] relative z-10">
            <div className="flex flex-col items-center text-center mb-8 px-4">
              <p className="text-zinc-200 font-medium mb-2 text-lg tablet:text-xl tracking-tight">
                Want to help SyncWatch grow?
              </p>
              <p className="text-zinc-500 text-sm tablet:text-base leading-relaxed">
                SyncWatch is an open source project. We don't run ads or charge subscriptions. <br className="hidden tablet:block" />
                If you like using it, giving it a star on GitHub helps a lot.
              </p>
            </div>
            
            <div className="flex justify-center">
              <a 
                href="https://github.com/sampratigaurav/syncwatch" 
                target="_blank" 
                rel="noopener noreferrer"
                className="group relative flex items-center gap-3 px-6 py-3 bg-zinc-900/50 hover:bg-zinc-800/80 text-white rounded-2xl border border-white/10 hover:border-teal-500/50 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                <Github size={20} className="relative z-10 text-zinc-400 group-hover:text-teal-400 transition-colors" />
                <span className="relative z-10 font-medium">Star on GitHub</span>
              </a>
            </div>
          </div>
        </div>
      </div>
      </m.div>
    </LazyMotion>
  );
}
