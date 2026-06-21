import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Unlock, Link2, FileVideo, ShieldCheck, Play, Github, Linkedin, Twitter, Eye, EyeOff } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { SERVER_URL } from '../lib/config';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import React, { Suspense, lazy } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import CssOrb from '../components/CssOrb';
const FloatingAppMockup = lazy(() => import('../components/FloatingAppMockup'));

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const AmbientBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 bg-[#050505] overflow-hidden">
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
    <div className="w-full mt-12 overflow-hidden relative z-10 opacity-60">
      <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: 'linear-gradient(90deg, #050505 0%, transparent 5%, transparent 95%, #050505 100%)' }} />
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

const FeatureBentoGrid = () => {
  return (
    <div className="w-full max-w-[1200px] mx-auto mt-32 relative z-10 pb-24 px-4 tablet:px-8">
      <div className="text-center mb-16 tablet:mb-24">
        <h2 className="text-3xl tablet:text-5xl font-bold tracking-tight text-white mb-4">How it works</h2>
        <p className="text-base tablet:text-lg text-zinc-400">From your file to in sync — in under 30 seconds</p>
      </div>

      <div className="grid grid-cols-1 tablet:grid-cols-3 gap-6 tablet:gap-8">
        {STEPS.map((step, index) => {
          // Asymmetrical layout:
          // 0: span 2
          // 1: span 1
          // 2: span 1
          // 3: span 2
          const isWide = index === 0 || index === 3;
          const colSpanClass = isWide ? "tablet:col-span-2" : "tablet:col-span-1";
          
          return (
            <m.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: "-10% 0px -10% 0px" }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
              className={`opacity-0 translate-y-5 group relative p-8 tablet:p-10 rounded-3xl bg-zinc-900/40 backdrop-blur-md border border-white/5 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/10 flex flex-col justify-end min-h-[300px] ${colSpanClass}`}
            >
              {/* Subtle hover gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-teal-500/0 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Glowing Icon Container */}
              <div className="relative w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mb-auto group-hover:border-teal-500/30 transition-colors duration-300">
                <div className="absolute inset-0 bg-teal-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <step.icon className="text-teal-400 w-7 h-7 relative z-10" />
              </div>

              <div className="mt-8 relative z-10">
                <h3 className="text-2xl font-semibold text-white mb-3 tracking-tight">{step.title}</h3>
                <p className="text-zinc-400 text-lg leading-relaxed">{step.desc}</p>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
};

export default function Home() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { setRoomId } = useRoomStore(useShallow(state => ({
    setRoomId: state.setRoomId
  })));

  const savedNickname = localStorage.getItem('syncwatch_nickname') || '';
  const [nickname, setNicknameInput] = useState(savedNickname);
  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(urlRoomId ? 'join' : 'create');

  const [error, setError] = useState('');
  
  const [lockRoom, setLockRoom] = useState(false);
  const [pin, setPin] = useState('');
  const [requiresPin, setRequiresPin] = useState(false);

  const [showExpiredError, setShowExpiredError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleOtpChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!val && e.target.value !== '') return;
    
    let currentStr = inputRoomId.padEnd(6, ' ');
    const newRoomId = currentStr.split('');
    newRoomId[index] = val.slice(-1) || ' ';
    
    setInputRoomId(newRoomId.join('').trimEnd());
    if (error) setError('');
    
    if (val && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    let currentStr = inputRoomId.padEnd(6, ' ');
    if (e.key === 'Backspace') {
      if (currentStr[index] === ' ' && index > 0) {
        otpRefs.current[index - 1]?.focus();
        const newRoomId = currentStr.split('');
        newRoomId[index - 1] = ' ';
        setInputRoomId(newRoomId.join('').trimEnd());
      } else {
        const newRoomId = currentStr.split('');
        newRoomId[index] = ' ';
        setInputRoomId(newRoomId.join('').trimEnd());
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
    if (!pasted) return;
    
    setInputRoomId(pasted);
    if (error) setError('');
    
    const nextIndex = Math.min(pasted.length, 5);
    otpRefs.current[nextIndex === 6 ? 5 : nextIndex]?.focus();
  };

  useEffect(() => {
    if (urlRoomId) {
      setInputRoomId(urlRoomId);
      setActiveTab('join');
    }
  }, [urlRoomId]);

  const handleCreateRoom = async () => {
    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Please enter a nickname to continue');
      return;
    }
    if (lockRoom) {
      if (!pin) {
        setError('Please enter a PIN');
        return;
      }
      if (!/^[a-zA-Z0-9]{4,8}$/.test(pin)) {
        setError('PIN must be 4-8 alphanumeric characters');
        return;
      }
    }
    setError('');
    setIsLoading(true);
    localStorage.setItem('syncwatch_nickname', trimmed);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockRoom ? { password: pin } : {})
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      
      useRoomStore.getState().setRoomPassword(lockRoom ? pin : null);
      setRoomId(data.roomId);
      useRoomStore.getState().setNickname(trimmed);
      navigate(`/room/${data.roomId}/waiting`);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
         setError('Could not reach the server. Please try again in a moment.');
      } else {
         setError(err instanceof Error ? err.message : 'Error creating room');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length < 2) {
      setError('Please enter a nickname to continue');
      setShowExpiredError(false);
      return;
    }
    const parsedCode = inputRoomId.replace(/\s/g, '').toUpperCase();
    if (parsedCode.length < 6) {
      setError('Please enter a 6-character room code');
      setShowExpiredError(false);
      return;
    }
    if (requiresPin) {
      if (!pin || !/^[a-zA-Z0-9]{4,8}$/.test(pin)) {
        setError('PIN must be 4-8 alphanumeric characters');
        return;
      }
    }
    setError('');
    setShowExpiredError(false);
    setIsLoading(true);
    localStorage.setItem('syncwatch_nickname', trimmed);
    
    try {
      const code = parsedCode;
      
      if (!requiresPin) {
        const res = await fetch(`${SERVER_URL}/api/rooms/${code}/exists`);
        if (!res.ok) throw new Error('Failed to check room');
        const data = await res.json();
        
        if (!data.exists) {
          if (urlRoomId) {
            setShowExpiredError(true);
          } else {
            setError('Room not found');
          }
          setIsLoading(false);
          return;
        }
        
        if (data.hasPassword) {
          setRequiresPin(true);
          setIsLoading(false);
          return;
        }
      }

      if (requiresPin) {
        const handleWrongPassword = () => {
          setError('Incorrect PIN. Please try again.');
          setPin('');
          setIsLoading(false);
          cleanup();
        };
        
        const handleRoomState = () => {
          useRoomStore.getState().setRoomPassword(pin);
          setRoomId(code);
          useRoomStore.getState().setNickname(trimmed);
          cleanup();
          navigate(`/room/${code}/waiting`);
        };

        const cleanup = () => {
          socket.off(EVENTS.WRONG_PASSWORD, handleWrongPassword);
          socket.off(EVENTS.ROOM_STATE, handleRoomState);
        };

        socket.once(EVENTS.WRONG_PASSWORD, handleWrongPassword);
        socket.once(EVENTS.ROOM_STATE, handleRoomState);
        
        if (!socket.connected) socket.connect();
        socket.emit(EVENTS.JOIN_ROOM, { roomId: code, nickname: trimmed, password: pin });
      } else {
        useRoomStore.getState().setRoomPassword(null);
        setRoomId(code);
        useRoomStore.getState().setNickname(trimmed);
        navigate(`/room/${code}/waiting`);
      }
    } catch (err: unknown) {
      if (err instanceof TypeError) {
         setError('Could not reach the server. Please try again in a moment.');
      } else {
         setError(err instanceof Error ? err.message : 'Error joining room');
      }
      setIsLoading(false);
    }
  };

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
        
      {/* Floating Pill Header */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[1200px] z-50 flex items-center justify-between backdrop-blur-xl bg-zinc-950/60 border border-white/10 shadow-2xl shadow-teal-500/5 px-6 py-4 rounded-2xl">
        <h1 className="text-xl tablet:text-2xl font-bold tracking-tighter text-white drop-shadow-md">
          SyncWatch
        </h1>
        <div className="flex items-center gap-6">
          <a href="https://github.com/sampratigaurav/syncwatch" aria-label="GitHub Repository" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
            <Github size={20} />
          </a>
          <Link to="/docs" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors hidden tablet:block">
            Docs
          </Link>
          <button onClick={() => toast('Extension is coming soon!', { icon: '🚀' })} className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
            Extension
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-[1200px] flex flex-col items-center px-4 tablet:px-8 pt-24 tablet:pt-32">
          
        {/* Row 1: Full-Width Centered Typography */}
        <m.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="opacity-0 -translate-y-5 flex flex-col items-center w-full mb-12 tablet:mb-16"
        >
          <h2 className="text-5xl tablet:text-[4.5rem] font-bold bg-gradient-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent pb-4 tracking-tight leading-[1.1] text-center max-w-4xl drop-shadow-2xl">
            Watch together.<br className="hidden tablet:block" /> In perfect sync.
          </h2>
          <p className="text-zinc-400 text-lg tablet:text-xl text-center max-w-2xl">
            Experience movies and shows with your friends in real-time, no matter where they are.
          </p>
        </m.div>

        {/* Row 2: 50/50 Split Grid */}
        <div className="w-full grid grid-cols-1 tablet:grid-cols-2 gap-8 tablet:gap-12 items-center">
          
          {/* Left Column: Action Box */}
          <m.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="opacity-0 -translate-x-8 flex flex-col items-center tablet:items-center order-1 tablet:order-1 w-full"
          >
            {/* Unified Action Box */}
            <div className="w-full max-w-[440px] bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 tablet:p-8 relative z-10 overflow-hidden self-center tablet:self-start">
             {/* Inner subtle glow */}
             <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
             
             <div className="relative z-10 flex flex-col gap-6">
               
               {/* Nickname Input */}
               <div className="flex flex-col gap-2">
                 <label htmlFor="nickname" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Your Identity</label>
                 <input 
                   id="nickname"
                   type="text"
                   value={nickname}
                   onChange={e => {
                     setNicknameInput(e.target.value);
                     if (error === 'Please enter a nickname to continue') setError('');
                   }}
                   className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
                   placeholder="Enter a nickname"
                   maxLength={20}
                 />
               </div>

               {/* Tabs / Segmented Control */}
               <div className="bg-black/40 p-1 rounded-xl flex items-center border border-white/5 relative">
                 {/* Active Tab Background Pill */}
                 <div 
                   className={cn(
                     "absolute inset-y-1 w-[calc(50%-4px)] bg-zinc-800 rounded-lg transition-transform duration-300 ease-out shadow-md",
                     activeTab === 'create' ? "translate-x-0" : "translate-x-[calc(100%+2px)]"
                   )}
                 />
                 <button 
                   onClick={() => { setActiveTab('create'); setError(''); }}
                   className={cn(
                     "flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative z-10",
                     activeTab === 'create' ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                   )}
                 >
                   Create Room
                 </button>
                 <button 
                   onClick={() => { setActiveTab('join'); setError(''); }}
                   className={cn(
                     "flex-1 py-2 text-sm font-medium rounded-lg transition-colors relative z-10",
                     activeTab === 'join' ? "text-white" : "text-zinc-400 hover:text-zinc-300"
                   )}
                 >
                   Join Room
                 </button>
               </div>

               {/* Tab Content Area */}
               <div className="min-h-[140px] flex flex-col justify-end">
                 <AnimatePresence mode="wait">
                   {activeTab === 'create' ? (
                     <m.div 
                       key="create"
                       initial={{ opacity: 0, x: -10 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: 10 }}
                       transition={{ duration: 0.2 }}
                       className="flex flex-col gap-5 w-full"
                     >
                        {/* Lock Room Toggle */}
                        <div className="flex items-center justify-between px-1">
                          <div className="flex items-center gap-2">
                            {lockRoom ? <Lock size={16} className="text-teal-400" /> : <Unlock size={16} className="text-zinc-500" />}
                            <span className="text-sm font-medium text-zinc-300">Lock with PIN</span>
                          </div>
                          <button 
                            onClick={() => { setLockRoom(!lockRoom); setError(''); }}
                            className={cn("w-10 h-5 rounded-full relative transition-colors shadow-inner", lockRoom ? "bg-teal-500" : "bg-zinc-800 border border-white/5")}
                          >
                            <div className={cn("w-4 h-4 rounded-full bg-white absolute top-[1px] transition-transform shadow-sm", lockRoom ? "translate-x-[22px]" : "translate-x-0.5")} />
                          </button>
                        </div>
                        
                        <AnimatePresence>
                        {lockRoom && (
                          <m.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                          >
                             <div className="relative w-full">
                               <input
                                 id="create-pin"
                                 aria-label="Create PIN"
                                 type={showPin ? "text" : "password"}
                                 value={pin}
                                 onChange={e => {
                                   setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8));
                                   setError('');
                                 }}
                                 className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
                                 placeholder="4-8 char PIN"
                               />
                               <button
                                 type="button"
                                 onClick={() => setShowPin(!showPin)}
                                 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                               >
                                 {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                               </button>
                             </div>
                          </m.div>
                        )}
                        </AnimatePresence>

                        {error && activeTab === 'create' && <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}

                        <button 
                          onClick={handleCreateRoom}
                          disabled={isLoading}
                          className="w-full h-12 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] bg-teal-600 hover:bg-teal-500 text-white flex items-center justify-center text-base disabled:opacity-50 shadow-[0_0_15px_rgba(13,148,136,0.3)] hover:shadow-[0_0_25px_rgba(13,148,136,0.5)]"
                        >
                          Start New Room
                        </button>
                     </m.div>
                   ) : (
                     <m.div 
                       key="join"
                       initial={{ opacity: 0, x: 10 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -10 }}
                       transition={{ duration: 0.2 }}
                       className="flex flex-col gap-5 w-full"
                     >
                        <div className="flex flex-col gap-2">
                           <label htmlFor="roomCode" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Room Code</label>
                           <div id="roomCode" className="flex justify-between gap-2" aria-label="Room Code Input">
                             {[0, 1, 2, 3, 4, 5].map((index) => (
                               <input
                                 key={index}
                                 ref={el => { otpRefs.current[index] = el; }}
                                 type="text"
                                 aria-label={`Digit ${index + 1}`}
                                 value={inputRoomId.padEnd(6, ' ')[index] === ' ' ? '' : inputRoomId.padEnd(6, ' ')[index]}
                                 onChange={e => handleOtpChange(index, e)}
                                 onKeyDown={e => handleOtpKeyDown(index, e)}
                                 onPaste={handleOtpPaste}
                                 disabled={requiresPin}
                                 maxLength={1}
                                 className="w-full aspect-square text-center text-xl font-mono uppercase bg-black/40 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-zinc-400/50 transition-all shadow-inner"
                               />
                             ))}
                           </div>
                        </div>

                        <AnimatePresence>
                        {requiresPin && (
                          <m.div 
                            initial={{ opacity: 0, height: 0, marginTop: -10 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                            exit={{ opacity: 0, height: 0, marginTop: -10 }}
                            className="overflow-hidden"
                          >
                             <div className="flex items-center gap-2 mb-2 ml-1 mt-1">
                               <Lock size={14} className="text-teal-400" />
                               <span className="text-sm font-medium text-zinc-300">Room is locked</span>
                             </div>
                             <div className="relative w-full">
                               <input
                                 id="join-pin"
                                 aria-label="Enter Room PIN"
                                 type={showPin ? "text" : "password"}
                                 value={pin}
                                 onChange={e => {
                                   setPin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8));
                                   setError('');
                                 }}
                                 autoFocus
                                 className="w-full h-12 bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 text-white font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all placeholder:text-zinc-600 shadow-inner"
                                 placeholder="Enter PIN"
                               />
                               <button
                                 type="button"
                                 onClick={() => setShowPin(!showPin)}
                                 className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                               >
                                 {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                               </button>
                             </div>
                          </m.div>
                        )}
                        </AnimatePresence>

                        {error && activeTab === 'join' && <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}
                        {showExpiredError && activeTab === 'join' && <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">This room has expired or does not exist.</div>}

                        <button 
                          onClick={handleJoinRoom}
                          disabled={isLoading}
                          className="w-full h-12 rounded-xl font-medium transition-all duration-200 active:scale-[0.98] bg-white text-zinc-900 hover:bg-zinc-200 flex items-center justify-center text-base disabled:opacity-50 shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                        >
                          Join Room
                         </button>
                      </m.div>
                   )}
                 </AnimatePresence>
                </div>
              </div>
            </div>
          
            {/* Removed TechTicker from here */}
          </m.div>

          {/* Right Column: 3D Orb / Mobile Fallback */}
          <m.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="w-full h-full min-h-[300px] tablet:min-h-[500px] order-2 tablet:order-2 flex items-center justify-center relative opacity-0 scale-95"
          >
            {isMobile ? (
              <CssOrb />
            ) : (
              <Suspense fallback={<div className="w-full h-full min-h-[500px]" />}>
                <FloatingAppMockup />
              </Suspense>
            )}
          </m.div>
        </div>

        {/* Row 3: Full-Width Tech Ticker (Bounded to Container) */}
        <div className="w-full relative mt-16 tablet:mt-24 mb-8 tablet:mb-12">
          {/* Edge Fade Masks for the Marquee */}
          <div className="absolute inset-y-0 left-0 w-8 tablet:w-16 bg-gradient-to-r from-[#050505] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-8 tablet:w-16 bg-gradient-to-l from-[#050505] to-transparent z-10 pointer-events-none" />
          
          <TechTicker />
        </div>

        <FeatureBentoGrid />

        {/* Support Section */}
        <div className="w-full relative flex flex-col items-center mt-12 tablet:mt-16 pt-16 pb-24 overflow-hidden rounded-t-[40px]">
          {/* Absolute Glow Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-teal-900/20 via-zinc-900/10 to-transparent pointer-events-none" />
          <div className="absolute bottom-0 w-full h-[1px] bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />

          <div className="w-full max-w-[600px] relative z-10">
            <div className="flex flex-col items-center text-center mb-8 px-4">
              <p className="text-zinc-200 font-medium mb-2 text-lg tablet:text-xl tracking-tight">
                SyncWatch is free and open source.
              </p>
              <p className="text-sm tablet:text-base text-zinc-500">
                If it made your movie night better, consider starring the project.
              </p>
            </div>
            
            <div className="flex flex-col items-center gap-4 max-w-sm mx-auto w-full px-4">
              {/* GitHub Button (Row 1) */}
              <a 
                href="https://github.com/sampratigaurav/syncwatch" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-800/80 backdrop-blur-md border border-white/10 hover:border-white/20 text-zinc-200 rounded-2xl px-8 py-3.5 font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/10 active:scale-[0.98]"
              >
                <Github size={18} />
                <span>Star on GitHub</span>
              </a>

              {/* Row 2 Container */}
              <div className="flex flex-row items-center justify-center gap-4 w-full">
                {/* LinkedIn Button */}
                <a 
                  href="https://linkedin.com/in/sampratigaurav" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex-1 flex items-center justify-center gap-2 bg-zinc-900/30 hover:bg-zinc-800/60 backdrop-blur-md border border-white/5 hover:border-white/20 text-zinc-300 rounded-2xl px-4 py-3 font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/10 active:scale-[0.98]"
                >
                  <Linkedin size={18} />
                  <span>Connect</span>
                </a>

                {/* X Button */}
                <a 
                  href="https://x.com/Sampratigaurav0" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full flex-1 flex items-center justify-center gap-2 bg-zinc-900/30 hover:bg-zinc-800/60 backdrop-blur-md border border-white/5 hover:border-white/20 text-zinc-300 rounded-2xl px-4 py-3 font-medium transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-teal-500/10 active:scale-[0.98]"
                >
                  <Twitter size={18} />
                  <span>Follow</span>
                </a>
              </div>
            </div>
          </div>
        </div>

      </div>
    </m.div>
    </LazyMotion>
  );
}
