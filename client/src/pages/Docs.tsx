import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, FileVideo, ShieldCheck, HelpCircle, 
  Keyboard, Play, ChevronDown, Monitor, CheckCircle2,
  Lock, MessageSquare
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: Play },
  { id: 'supported-formats', label: 'Supported Formats', icon: FileVideo },
  { id: 'privacy', label: 'Privacy & Security', icon: ShieldCheck },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
];

const FAQS = [
  {
    q: "Why does it say File Mismatch?",
    a: "SyncWatch uses acoustic fingerprinting to ensure everyone is watching the same content. While you don't need the exact same file (e.g. 1080p vs 4K works perfectly), if one of you has an extended 'Director's Cut' or a completely different audio dub, the fingerprints won't match. You can always click 'Force Join' to bypass this error if you are sure they are the same."
  },
  {
    q: "The video won't auto-play for my friend.",
    a: "Modern browsers have strict auto-play policies. If the video doesn't play automatically, your friend simply needs to click anywhere on the page to allow media playback."
  },
  {
    q: "Why is the video randomly pausing?",
    a: "If someone in the room has a slow hard drive or CPU and their video starts buffering, SyncWatch will automatically pause the video for everyone else to keep you in sync. It will resume once they catch up."
  }
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: '-20% 0px -60% 0px' }
    );

    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 font-sans selection:bg-teal-500/30">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center p-4 backdrop-blur-md bg-zinc-950/80 border-b border-zinc-900/50">
        <Link to="/" className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium">Back to Home</span>
        </Link>
      </div>
      
      {/* Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-[1000px] h-[500px] bg-teal-500/5 blur-[120px] pointer-events-none -z-10" />

      <div className="max-w-[1200px] mx-auto pt-28 pb-20 px-6 animate-in fade-in slide-in-from-bottom-8 duration-700 flex flex-col tablet:flex-row gap-12">
        
        {/* Left Sidebar */}
        <div className="hidden tablet:block w-[280px] shrink-0">
          <div className="sticky top-28">
            <h3 className="text-sm font-bold tracking-wider text-zinc-500 uppercase mb-6 px-3">Documentation</h3>
            <nav className="flex flex-col gap-1">
              {SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 text-left w-full",
                    activeSection === sec.id 
                      ? "bg-teal-500/10 text-teal-400" 
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  )}
                >
                  <sec.icon size={16} className={cn("transition-colors", activeSection === sec.id ? "text-teal-400" : "text-zinc-500")} />
                  {sec.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 max-w-3xl">
          <h1 className="text-4xl tablet:text-5xl font-bold text-white mb-4 tracking-tight">
            SyncWatch Docs
          </h1>
          <p className="text-zinc-400 text-lg mb-16 leading-relaxed">
            Everything you need to know about setting up rooms, formatting files, and enjoying a perfectly synced watch party.
          </p>
          
          <div className="space-y-24">
            
            {/* Getting Started */}
            <section id="getting-started" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                  <Play size={24} />
                </div>
                <h2 className="text-2xl tablet:text-3xl font-bold text-white tracking-tight">Getting Started</h2>
              </div>
              
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 tablet:p-8">
                <div className="relative">
                  {/* Timeline Line */}
                  <div className="absolute left-[15px] top-4 bottom-4 w-px bg-zinc-800" />
                  
                  <div className="space-y-8">
                    {/* Step 1 */}
                    <div className="relative flex gap-6">
                      <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-teal-500/30 flex items-center justify-center shrink-0 text-teal-400 font-bold text-sm shadow-[0_0_10px_rgba(20,184,166,0.2)] z-10">1</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Create or Join a Room</h3>
                        <p className="text-zinc-400 leading-relaxed">One person creates a room (and can optionally lock it with a 4-8 character PIN) and shares their room link or code. Others use this to join.</p>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex gap-6">
                      <div className="w-8 h-8 rounded-full bg-zinc-950 border-2 border-teal-500/30 flex items-center justify-center shrink-0 text-teal-400 font-bold text-sm shadow-[0_0_10px_rgba(20,184,166,0.2)] z-10">2</div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">Select Your File</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed">
                          SyncWatch works locally. This means <strong>everyone must have their own copy of the video</strong> on their device. Thanks to our acoustic fingerprinting, it doesn't have to be the exact same file—a 1080p and a 4K version will sync perfectly as long as the audio matches! The video is never uploaded.
                        </p>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex gap-6">
                      <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shrink-0 text-zinc-950 z-10 shadow-[0_0_15px_rgba(20,184,166,0.4)]">
                        <CheckCircle2 size={18} className="stroke-[3]" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-2">Watch Together</h3>
                        <p className="text-zinc-400 leading-relaxed">Once everyone has selected the file, the host can play, pause, or seek. SyncWatch will automatically keep everyone's player at the exact same moment.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Supported Formats */}
            <section id="supported-formats" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <FileVideo size={24} />
                </div>
                <h2 className="text-2xl tablet:text-3xl font-bold text-white tracking-tight">Supported Formats</h2>
              </div>
              
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 tablet:p-8 space-y-6">
                <p className="text-zinc-400 leading-relaxed">Because SyncWatch relies on your browser's native video player, format support depends on the browser you are using (Chrome, Firefox, Safari, Edge).</p>
                
                <div className="grid gap-4">
                  <div className="flex gap-4 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
                    <Monitor size={20} className="text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-zinc-200 font-medium mb-1">Recommended Video</h4>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        <code className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-mono text-[13px] border border-indigo-500/20 mr-1">.mp4</code> and 
                        <code className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-mono text-[13px] border border-indigo-500/20 ml-1">.webm</code> are widely supported across all modern browsers.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
                    <FileVideo size={20} className="text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-zinc-200 font-medium mb-1">Other Video Formats</h4>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        <code className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[13px] border border-zinc-700 mr-1">.mkv</code> or 
                        <code className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono text-[13px] border border-zinc-700 ml-1">.avi</code> might only play audio or fail completely, depending on the browser. If possible, convert your files to MP4.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800">
                    <MessageSquare size={20} className="text-zinc-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-zinc-200 font-medium mb-1">Subtitles</h4>
                      <p className="text-zinc-400 text-sm leading-relaxed">
                        You can load local subtitle files like 
                        <code className="px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-mono text-[13px] border border-teal-500/20 mx-1">.vtt</code> or 
                        <code className="px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-400 font-mono text-[13px] border border-teal-500/20 mx-1">.srt</code> directly into the player once you are in the room.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Privacy & Security */}
            <section id="privacy" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <ShieldCheck size={24} />
                </div>
                <h2 className="text-2xl tablet:text-3xl font-bold text-white tracking-tight">Privacy & Security</h2>
              </div>
              
              <div className="bg-emerald-950/10 border border-emerald-900/30 rounded-2xl p-6 tablet:p-8">
                <div className="flex flex-col gap-6">
                  <p className="text-zinc-300 text-lg leading-relaxed">
                    <strong className="text-emerald-400">Your files never leave your device.</strong> SyncWatch is a "bring your own file" platform. When you select a video, it is read entirely locally by your browser.
                  </p>
                  
                  <div>
                    <p className="text-zinc-400 mb-4 font-medium">The only data sent to our server is:</p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 text-zinc-400">
                        <Lock size={18} className="text-emerald-500/70 shrink-0 mt-1" />
                        <span>An acoustic fingerprint of the audio track (to ensure everyone is watching the same content, even if resolutions differ).</span>
                      </li>
                      <li className="flex items-start gap-3 text-zinc-400">
                        <Play size={18} className="text-emerald-500/70 shrink-0 mt-1" />
                        <span>Playback events (Play, Pause, and current timestamp).</span>
                      </li>
                      <li className="flex items-start gap-3 text-zinc-400">
                        <MessageSquare size={18} className="text-emerald-500/70 shrink-0 mt-1" />
                        <span>Chat messages and emoji reactions.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
            
            {/* Keyboard Shortcuts */}
            <section id="shortcuts" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <Keyboard size={24} />
                </div>
                <h2 className="text-2xl tablet:text-3xl font-bold text-white tracking-tight">Keyboard Shortcuts</h2>
              </div>

              {/* Mac Style Window */}
              <div className="rounded-2xl border border-zinc-800 bg-[#1E1E1E] overflow-hidden shadow-2xl">
                {/* Window Header */}
                <div className="h-10 bg-[#2D2D2D] border-b border-zinc-800 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <div className="ml-2 text-xs font-mono text-zinc-500 select-none">shortcuts.txt</div>
                </div>
                {/* Content */}
                <div className="p-6 tablet:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                      <span className="text-zinc-300 font-medium">Play / Pause</span>
                      <kbd className="px-3 py-1.5 bg-zinc-800 text-zinc-200 rounded-md text-sm font-mono border-b-2 border-zinc-950 shadow-sm flex items-center gap-1">
                        Space
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                      <span className="text-zinc-300 font-medium">Fullscreen</span>
                      <kbd className="px-3 py-1.5 bg-zinc-800 text-zinc-200 rounded-md text-sm font-mono border-b-2 border-zinc-950 shadow-sm">
                        F
                      </kbd>
                    </div>
                    <div className="flex items-center justify-between pb-4 border-b border-zinc-800 sm:border-none">
                      <span className="text-zinc-300 font-medium">Seek Forward / Back</span>
                      <div className="flex gap-1">
                        <kbd className="px-2 py-1.5 bg-zinc-800 text-zinc-200 rounded-md text-sm font-mono border-b-2 border-zinc-950 shadow-sm">←</kbd>
                        <kbd className="px-2 py-1.5 bg-zinc-800 text-zinc-200 rounded-md text-sm font-mono border-b-2 border-zinc-950 shadow-sm">→</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-300 font-medium">Mute / Unmute</span>
                      <kbd className="px-3 py-1.5 bg-zinc-800 text-zinc-200 rounded-md text-sm font-mono border-b-2 border-zinc-950 shadow-sm">
                        M
                      </kbd>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Troubleshooting */}
            <section id="troubleshooting" className="scroll-mt-28">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 rounded-lg bg-pink-500/10 text-pink-400">
                  <HelpCircle size={24} />
                </div>
                <h2 className="text-2xl tablet:text-3xl font-bold text-white tracking-tight">Troubleshooting</h2>
              </div>
              
              <div className="space-y-4">
                {FAQS.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div 
                      key={index} 
                      className={cn(
                        "rounded-2xl border transition-colors duration-200",
                        isOpen ? "bg-zinc-900/80 border-zinc-700" : "bg-zinc-950/50 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/50"
                      )}
                    >
                      <button
                        onClick={() => setOpenFaq(isOpen ? null : index)}
                        className="flex items-center justify-between w-full p-5 tablet:p-6 text-left focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded-2xl"
                      >
                        <span className="text-zinc-200 font-medium pr-8">{faq.q}</span>
                        <ChevronDown 
                          size={20} 
                          className={cn(
                            "text-zinc-500 transition-transform duration-300 shrink-0",
                            isOpen ? "rotate-180 text-zinc-300" : ""
                          )} 
                        />
                      </button>
                      <div 
                        className={cn(
                          "overflow-hidden transition-all duration-300 ease-in-out",
                          isOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
                        )}
                      >
                        <div className="p-5 tablet:p-6 pt-0 text-zinc-400 leading-relaxed border-t border-zinc-800/50 mt-2">
                          {faq.a}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}
