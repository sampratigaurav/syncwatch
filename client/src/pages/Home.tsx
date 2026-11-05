import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, FileVideo, ShieldCheck, Github, Plus, ArrowUpRight, Star } from 'lucide-react';
import { SEO } from '../components/layout/SEO';

import { m, LazyMotion, domAnimation } from 'framer-motion';
import { CinemaHero } from '../components/layout/CinemaHero';
import './cinema.css';
import { CinemaWalkthrough } from '../components/layout/CinemaWalkthrough';

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
    <section id="faq" aria-labelledby="cinema-faq-title" className="cinema-faq">
      <div className="cinema-faq-intro">
        <div className="cinema-faq-sculpture" aria-hidden="true">
          <span>?</span><i>?</i><b>✦</b>
        </div>
        <h2 id="cinema-faq-title">Got questions?</h2>
        <p>A few things to know before movie night.</p>
        <Link to="/docs" className="cinema-faq-docs">Explore the docs <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </div>
      <div className="cinema-faq-list">
        {FAQ_ITEMS.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={item.question} className="cinema-faq-item" data-open={isOpen}>
              <h3>
                <button type="button"
                  id={`faq-question-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}>
                  <span className="cinema-faq-number" aria-hidden="true">0{index + 1}</span>
                  <span>{item.question}</span>
                  <span className="cinema-faq-toggle" aria-hidden="true"><Plus size={18} /></span>
                </button>
              </h3>
              <div id={`faq-answer-${index}`} role="region" aria-labelledby={`faq-question-${index}`}
                aria-hidden={!isOpen} className="cinema-faq-answer">
                <div><p>{item.answer}</p></div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default function Home() {
  return (
    <>
      <SEO title="SyncWatch - Watch Movies Together in Real-Time" />
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="cinema-home opacity-0 relative flex flex-col items-center min-h-screen overflow-x-hidden selection:bg-teal-500/30"
        >

          {/* Main Content Area */}
          <main id="features" className="relative z-10 w-full max-w-[1200px] flex flex-col items-center px-4 sm:px-6 tablet:px-8 pt-8 tablet:pt-16">

            <CinemaHero />

            {/* Tech Ticker */}
            <div className="w-full relative mt-16 tablet:mt-24 mb-8 tablet:mb-12">
              <TechTicker />
            </div>

            <CinemaWalkthrough />

            <FAQAccordion />

            <section aria-labelledby="cinema-support-title" className="cinema-support">
              <div className="cinema-support-ticket">
                <div className="cinema-support-art" aria-hidden="true">
                  <span className="cinema-support-spark">✦</span>
                  <Star className="cinema-support-star" strokeWidth={1.1} />
                  <span className="cinema-support-spark">✧</span>
                  <span className="cinema-support-stamp">MADE FOR MOVIE NIGHTS</span>
                </div>
                <div className="cinema-support-copy">
                  <h2 id="cinema-support-title">Enjoying SyncWatch?</h2>
                  <p>Free to use. Open source. Built for watching together.<br className="hidden sm:block" /> A star on GitHub helps more people find us.</p>
                  <a href="https://github.com/sampratigaurav/syncwatch" target="_blank" rel="noopener noreferrer" className="cinema-support-link">
                    <Github size={19} aria-hidden="true" />
                    <span>Star on GitHub</span>
                    <ArrowUpRight size={18} aria-hidden="true" />
                  </a>
                </div>
                <div className="cinema-support-stub" aria-hidden="true">
                  <span>THANKS FOR<br />BEING HERE</span>
                  <div className="cinema-support-barcode" />
                  <span>SW — ADMIT ALL</span>
                </div>
              </div>
            </section>
          </main>
        </m.div>
      </LazyMotion>
    </>
  );
}
