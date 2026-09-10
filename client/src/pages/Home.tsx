import { Suspense, lazy, useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, FileVideo, ShieldCheck, Play, Github, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useThemeStore } from '../store/themeStore';
import { SEO } from '../components/layout/SEO';

import { m, LazyMotion, domAnimation, useMotionValue, useMotionTemplate, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import CssOrb from '../components/layout/CssOrb';

const FloatingAppMockup = lazy(() => import('../components/layout/FloatingAppMockup'));

// ─── Ambient Background (theme-aware) ────────────────────────────────────────
const AmbientBackground = () => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{ backgroundColor: 'var(--sw-bg)' }}
    >
      {/* Dot Matrix */}
      <div
        className="absolute inset-0"
        style={{
          opacity: 'var(--sw-dot-opacity)',
          backgroundImage: `radial-gradient(circle at center, var(--sw-dot-color) 1.5px, transparent 1.5px)`,
          backgroundSize: '32px 32px',
          WebkitMaskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 0%, black 50%, transparent 100%)',
        }}
      />
      {/* Orb 1 */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] rounded-full animate-orb-1"
        style={{
          background: `radial-gradient(circle, var(--sw-orb-1), transparent 70%)`,
          filter: isLight ? 'blur(80px)' : 'blur(120px)',
          mixBlendMode: isLight ? 'multiply' : 'screen',
        }}
      />
      {/* Orb 2 */}
      <div
        className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full animate-orb-2"
        style={{
          background: `radial-gradient(circle, var(--sw-orb-2), transparent 70%)`,
          filter: isLight ? 'blur(100px)' : 'blur(150px)',
          mixBlendMode: isLight ? 'multiply' : 'screen',
        }}
      />
    </div>
  );
};

const STEPS = [
  {
    icon: Link2,
    title: "Create or join a room",
    desc: "Share your room link or code with whoever you want to watch with. No account needed."
  },
  {
    icon: FileVideo,
    title: "Select your local file",
    desc: "Each person picks their own copy of the video from their device. Nothing is uploaded."
  },
  {
    icon: ShieldCheck,
    title: "Audio verified instantly",
    desc: "Acoustic fingerprinting confirms your audio tracks match. You can even mix 1080p and 4K video files!"
  },
  {
    icon: Play,
    title: "Watch in perfect sync",
    desc: "Press play once. SyncWatch keeps everyone at the exact same moment automatically."
  }
];

// ─── Tech Ticker ─────────────────────────────────────────────────────────────
const TechTicker = () => {
  return (
    <div
      className="w-full mt-12 overflow-hidden relative z-10"
      style={{
        opacity: 0.6,
        WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
        maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
      }}
    >
      <m.div
        className="flex items-center gap-8 whitespace-nowrap w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        style={{ willChange: 'transform' }}
      >
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex items-center gap-8 text-xs tablet:text-sm font-medium uppercase tracking-widest pr-8" style={{ color: 'var(--sw-text-muted)' }}>
            <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-teal-500" /> 100% Private</span>
            <span style={{ color: 'var(--sw-ticker-sep)' }}>•</span>
            <span className="flex items-center gap-2"><Link2 size={16} className="text-emerald-500" /> WebRTC Powered</span>
            <span style={{ color: 'var(--sw-ticker-sep)' }}>•</span>
            <span className="flex items-center gap-2"><FileVideo size={16} className="text-blue-500" /> Zero Cloud Uploads</span>
            <span style={{ color: 'var(--sw-ticker-sep)' }}>•</span>
            <span className="flex items-center gap-2"><Github size={16} style={{ color: 'var(--sw-text-muted)' }} /> Open Source</span>
            <span style={{ color: 'var(--sw-ticker-sep)' }}>•</span>
          </div>
        ))}
      </m.div>
    </div>
  );
};

// ─── Spotlight Bento Card ─────────────────────────────────────────────────────
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
      className={`group relative p-8 tablet:p-10 rounded-3xl backdrop-blur-md overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-end min-h-[300px] border ${colSpanClass}`}
      style={{
        background: 'var(--sw-card-bg)',
        borderColor: 'var(--sw-border)',
        boxShadow: '0 0 0 0 transparent',
      }}
    >
      {/* Mobile static glow */}
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

      {/* Hover shadow */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{ boxShadow: '0 20px 60px var(--sw-accent-glow)' }} />

      <div
        className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-auto group-hover:border-teal-500/30 transition-colors duration-300 z-10 border"
        style={{ background: 'var(--sw-code-bg)', borderColor: 'var(--sw-border)' }}
      >
        <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <step.icon className="text-teal-400 w-7 h-7 relative z-10" />
      </div>

      <div className="mt-8 relative z-10">
        <h3 className="text-2xl font-semibold mb-3 tracking-tight" style={{ color: 'var(--sw-text-primary)' }}>{step.title}</h3>
        <p className="text-lg leading-relaxed" style={{ color: 'var(--sw-text-muted)' }}>{step.desc}</p>
      </div>
    </m.div>
  );
};

// ─── Feature Bento Grid ───────────────────────────────────────────────────────
const FeatureBentoGrid = () => {
  return (
    <section id="how-it-works" aria-label="Features" className="w-full max-w-[1200px] mx-auto mt-20 tablet:mt-32 relative z-10 pb-16 tablet:pb-24 px-4 sm:px-6 tablet:px-8">
      <div className="text-center mb-12 tablet:mb-24">
        <h2 className="text-3xl tablet:text-5xl font-bold tracking-tight mb-4" style={{ color: 'var(--sw-text-primary)' }}>How it works</h2>
        <p className="text-base tablet:text-lg" style={{ color: 'var(--sw-text-muted)' }}>From your file to in sync — in under 30 seconds</p>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6 tablet:gap-8">
        {STEPS.map((step, index) => (
          <SpotlightCard key={index} step={step} index={index} />
        ))}
      </div>
    </section>
  );
};

// ─── FAQ ─────────────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    question: "Is it really free?",
    answer: "Yes, entirely free. SyncWatch is an open-source project and doesn't run ads or charge subscriptions."
  },
  {
    question: "Do you upload my video files?",
    answer: "No, everything happens locally. The WebRTC connection only synchronizes timestamps and play/pause commands between you and your friends."
  },
  {
    question: "Do my friends need to have the exact same file?",
    answer: "Nope! Because SyncWatch uses advanced acoustic fingerprinting instead of strict file hashing, one of you can be watching a 4K rip while the other watches a 1080p version. As long as the audio tracks match, we'll keep you in perfect sync."
  },
  {
    question: "What if we just want to watch YouTube?",
    answer: "We are actively developing the official SyncWatch Chrome Extension, which will allow you to sync YouTube videos directly on the YouTube website! For now, the extension is coming soon."
  },
  {
    question: "Does it work on mobile?",
    answer: "Currently optimized for desktop/laptops due to browser restrictions on local file access, but mobile support is in our roadmap."
  }
];

const FAQAccordion = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" aria-label="FAQ" className="w-full max-w-[800px] mx-auto mt-20 tablet:mt-32 mb-12 tablet:mb-16 px-4 sm:px-6 tablet:px-8 relative z-10">
      <div className="text-center mb-12 tablet:mb-16">
        <h2 className="text-3xl tablet:text-5xl font-bold tracking-tight mb-4" style={{ color: 'var(--sw-text-primary)' }}>Got questions?</h2>
        <p className="text-base tablet:text-lg" style={{ color: 'var(--sw-text-muted)' }}>Everything you need to know about SyncWatch</p>
      </div>

      <div className="space-y-4">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <m.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="rounded-2xl border overflow-hidden backdrop-blur-md transition-colors duration-300"
              style={{
                background: isOpen ? 'var(--sw-faq-bg-open)' : 'var(--sw-faq-bg)',
                borderColor: isOpen ? 'rgba(20,184,166,0.3)' : 'var(--sw-border)',
              }}
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                className="group w-full flex items-center justify-between p-6 tablet:p-8 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-2xl"
              >
                <span className="text-lg font-medium tracking-tight pr-8" style={{ color: 'var(--sw-text-primary)' }}>{item.question}</span>
                <div
                  className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: isOpen ? 'rgba(20,184,166,0.15)' : 'var(--sw-code-bg)',
                    color: isOpen ? '#14b8a6' : 'var(--sw-text-muted)',
                  }}
                >
                  <ChevronDown size={18} aria-hidden="true" className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <m.div
                    id={`faq-answer-${index}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 tablet:px-8 pb-6 tablet:pb-8 leading-relaxed" style={{ color: 'var(--sw-text-muted)' }}>
                      {item.answer}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </m.div>
          );
        })}
      </div>
    </section>
  );
};

// ─── Hero CTA ─────────────────────────────────────────────────────────────────
const HeroCTA = ({ firebaseUid }: { firebaseUid: boolean }) => {
  const { theme } = useThemeStore();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const spotlight = useMotionTemplate`radial-gradient(120px circle at ${mouseX}px ${mouseY}px, rgba(34,211,165,0.18) 0%, transparent 80%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  // In light mode, invert the button to dark-on-light
  const isLight = theme === 'light';

  return (
    <m.a
      href="/dashboard"
      onMouseMove={handleMouseMove}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="group relative flex items-center gap-2.5 px-8 py-3.5 rounded-full font-semibold overflow-hidden cursor-pointer select-none"
      style={{
        background: isLight ? '#111111' : '#ffffff',
        color: isLight ? '#f4f4f5' : '#0a0a0a',
        boxShadow: isLight
          ? '0 0 0 1px rgba(0,0,0,0.15), 0 8px 40px -8px rgba(0,0,0,0.35)'
          : '0 0 0 1px rgba(255,255,255,0.15), 0 8px 40px -8px rgba(255,255,255,0.25)',
      }}
    >
      {/* Cursor-tracking teal spotlight */}
      <m.span
        className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: spotlight }}
      />

      {/* Shimmer sweep on hover */}
      <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </span>

      {/* Hover glow ring */}
      <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_28px_6px_rgba(34,211,165,0.35)]" />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2.5">
        <m.span
          className="flex items-center"
          animate={{ rotate: 0 }}
          whileHover={{ rotate: 15 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {firebaseUid
            ? <LayoutDashboard size={17} />
            : <Play size={17} className="fill-current" />}
        </m.span>
        <span>
          {firebaseUid ? 'Go to Dashboard' : 'Start Watching'}
        </span>
      </span>
    </m.a>
  );
};

// ─── Home Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const firebaseUid = useRoomStore(state => state.firebaseUid);
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <>
      <SEO title="SyncWatch - Watch Movies Together in Real-Time" />
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="opacity-0 relative flex flex-col items-center min-h-screen overflow-x-hidden selection:bg-teal-500/30"
          style={{ backgroundColor: 'var(--sw-bg)' }}
        >
          <AmbientBackground />

          {/* Main Content Area */}
          <main id="features" className="relative z-10 w-full max-w-[1200px] flex flex-col items-center px-4 sm:px-6 tablet:px-8 pt-8 tablet:pt-16">

            {/* Row 1: Hero Typography */}
            <m.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="opacity-0 -translate-y-5 flex flex-col items-center w-full mb-10 tablet:mb-16"
            >
              <h2
                className="font-sans text-4xl sm:text-5xl tablet:text-6xl lg:text-[4.5rem] font-bold pb-4 tracking-tight leading-[1.1] text-center max-w-5xl drop-shadow-2xl"
                style={{ color: 'var(--sw-text-primary)' }}
              >
                Watch together.<br className="hidden tablet:block" /> In perfect sync.
              </h2>
              <p
                className="text-base sm:text-lg tablet:text-xl text-center max-w-none mb-8 px-2 sm:px-0"
                style={{ color: 'var(--sw-text-muted)' }}
              >
                Experience movies and shows with your friends in real-time, no matter where they are.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <HeroCTA firebaseUid={!!firebaseUid} />
              </div>
            </m.div>

            {/* Row 2: App Mockup */}
            <div className="w-full max-w-6xl mx-auto flex items-center justify-center relative cursor-pointer mt-4 tablet:mt-8 px-4 sm:px-6 tablet:px-0">
              <Link to="/dashboard" className="w-full h-full block">
                <m.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full h-full min-h-[250px] sm:min-h-[300px] tablet:min-h-[500px] flex items-center justify-center relative opacity-0"
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

            <FAQAccordion />

            {/* Support Section */}
            <section
              aria-label="Support Us"
              className="w-full relative flex flex-col items-center mt-12 tablet:mt-16 pt-16 pb-24 overflow-hidden rounded-t-[40px]"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at bottom, var(--sw-accent-glow) 0%, transparent 70%)' }}
              />
              <div className="absolute bottom-0 w-full h-[1px]" style={{ background: 'linear-gradient(90deg, transparent, rgba(20,184,166,0.3), transparent)' }} />

              <div className="w-full max-w-[600px] relative z-10">
                <div className="flex flex-col items-center text-center mb-8 px-4">
                  <p className="font-medium mb-2 text-lg tablet:text-xl tracking-tight" style={{ color: 'var(--sw-text-primary)' }}>
                    Want to help SyncWatch grow?
                  </p>
                  <p className="text-sm tablet:text-base leading-relaxed" style={{ color: 'var(--sw-text-muted)' }}>
                    SyncWatch is an open source project. We don't run ads or charge subscriptions. <br className="hidden tablet:block" />
                    If you like using it, giving it a star on GitHub helps a lot.
                  </p>
                </div>

                <div className="flex justify-center">
                  <a
                    href="https://github.com/sampratigaurav/syncwatch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all duration-300"
                    style={{
                      background: 'var(--sw-surface)',
                      borderColor: 'var(--sw-border)',
                      color: 'var(--sw-text-primary)',
                    }}
                  >
                    <div className="absolute inset-0 bg-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                    <Github size={20} className="relative z-10 text-teal-500 group-hover:text-teal-400 transition-colors" />
                    <span className="relative z-10 font-medium">Star on GitHub</span>
                  </a>
                </div>
              </div>
            </section>
          </main>
        </m.div>
      </LazyMotion>
    </>
  );
}
