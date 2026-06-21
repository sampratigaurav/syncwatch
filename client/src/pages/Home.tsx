import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Lock, Unlock, Link2, FileVideo, ShieldCheck, Play, Github, Linkedin, Twitter, Eye, EyeOff } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { SERVER_URL } from '../lib/config';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { motion, AnimatePresence } from 'framer-motion';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const AmbientBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 bg-[#050505] overflow-hidden">
    <motion.div 
      animate={{ 
        scale: [1, 1.1, 1],
        opacity: [0.3, 0.5, 0.3],
        rotate: [0, 90, 0]
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] bg-teal-900/30 rounded-full blur-[120px] mix-blend-screen" 
    />
    <motion.div 
      animate={{ 
        scale: [1, 1.2, 1],
        opacity: [0.2, 0.4, 0.2],
        rotate: [0, -90, 0]
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-slate-800/40 rounded-full blur-[150px] mix-blend-screen" 
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
    <div className="w-full max-w-3xl mx-auto mt-12 overflow-hidden relative z-10 opacity-60">
      <div className="absolute inset-0 z-20 pointer-events-none" style={{ background: 'linear-gradient(90deg, #050505 0%, transparent 15%, transparent 85%, #050505 100%)' }} />
      <motion.div 
        className="flex items-center gap-8 whitespace-nowrap w-max"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        {[...Array(2)].map((_, i) => (
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
      </motion.div>
    </div>
  );
};

const StickyScrollSteps = () => {
  return (
    <div className="w-full max-w-[800px] mx-auto mt-32 relative z-10 pb-24">
      <div className="text-center mb-24 px-4">
        <h2 className="text-3xl tablet:text-5xl font-bold tracking-tight text-white mb-4">How it works</h2>
        <p className="text-base tablet:text-lg text-zinc-400">From your file to in sync — in under 30 seconds</p>
      </div>

      <div className="relative border-l border-white/10 ml-6 tablet:ml-12 pb-12">
        {STEPS.map((step, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, margin: "-20% 0px -20% 0px" }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-24 pl-8 tablet:pl-16 relative pr-4"
          >
            <div className="absolute left-[-17px] top-0 w-8 h-8 rounded-full bg-zinc-950 border border-white/10 flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
            </div>
            <step.icon className="text-teal-400 w-8 h-8 mb-6" />
            <h3 className="text-2xl tablet:text-3xl font-semibold text-white mb-3 tracking-tight">{step.title}</h3>
            <p className="text-zinc-400 text-lg leading-relaxed max-w-lg">{step.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative flex flex-col items-center min-h-screen overflow-x-hidden selection:bg-teal-500/30 bg-[#050505]"
    >
      <AmbientBackground />
        
      {/* Sticky Header */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between backdrop-blur-xl bg-[#050505]/60 border-b border-white/5 px-6 py-4">
        <h1 className="text-xl tablet:text-2xl font-bold tracking-tighter text-white drop-shadow-md">
          SyncWatch
        </h1>
        <div className="flex items-center gap-6">
          <a href="https://github.com/sampratigaurav/syncwatch" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
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
      <div className="relative z-10 w-full max-w-[1000px] flex flex-col items-center px-4 tablet:px-8 pt-32 tablet:pt-40">
          
        {/* Hero Section */}
        <div className="w-full flex flex-col items-center justify-center mb-16 tablet:mb-24">
           
           <h2 className="text-5xl tablet:text-7xl font-bold bg-gradient-to-br from-white via-zinc-200 to-zinc-600 bg-clip-text text-transparent pb-4 tracking-tight leading-[1.1] text-center px-4 max-w-3xl drop-shadow-2xl">
             Watch together.<br className="hidden tablet:block" /> In perfect sync.
           </h2>

           {/* Unified Action Box */}
           <div className="w-full max-w-[440px] mx-auto mt-8 bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 tablet:p-8 relative z-10 overflow-hidden">
             {/* Inner subtle glow */}
             <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
             
             <div className="relative z-10 flex flex-col gap-6">
               
               {/* Nickname Input */}
               <div className="flex flex-col gap-2">
                 <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Your Identity</label>
                 <input 
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
                     <motion.div 
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
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                          >
                             <div className="relative w-full">
                               <input
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
                          </motion.div>
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
                     </motion.div>
                   ) : (
                     <motion.div 
                       key="join"
                       initial={{ opacity: 0, x: 10 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: -10 }}
                       transition={{ duration: 0.2 }}
                       className="flex flex-col gap-5 w-full"
                     >
                        <div className="flex flex-col gap-2">
                           <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Room Code</label>
                           <div className="flex justify-between gap-2">
                             {[0, 1, 2, 3, 4, 5].map((index) => (
                               <input
                                 key={index}
                                 ref={el => { otpRefs.current[index] = el; }}
                                 type="text"
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
                          <motion.div 
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
                          </motion.div>
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
                     </motion.div>
                   )}
                 </AnimatePresence>
                </div>
              </div>
            </div>
          
          <TechTicker />
        </div>

        <StickyScrollSteps />

        {/* Support Section */}
        <div className="w-full max-w-[600px] mt-12 tablet:mt-16 pt-8 border-t border-white/5 pb-12 relative z-10">
          <div className="flex flex-col items-center text-center mb-6 px-4">
            <p className="text-zinc-200 font-medium mb-1 text-[15px] tablet:text-[16px]">
              SyncWatch is free and open source.
            </p>
            <p className="text-[13px] tablet:text-[14px] text-zinc-500">
              If it made your movie night better, consider starring the project.
            </p>
          </div>
          
          <div className="flex flex-col tablet:flex-row items-center justify-center gap-3 tablet:gap-4 max-w-lg mx-auto">
            {/* GitHub Button */}
            <a 
              href="https://github.com/sampratigaurav/syncwatch" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full tablet:w-auto min-h-[48px] tablet:min-h-[44px] flex items-center justify-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl px-5 py-2 font-medium transition-colors active:scale-[0.98]"
            >
              <Github size={18} />
              <span className="text-sm tablet:text-base">Star on GitHub</span>
            </a>

            {/* LinkedIn Button */}
            <a 
              href="https://linkedin.com/in/sampratigaurav" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full tablet:w-auto min-h-[48px] tablet:min-h-[44px] flex items-center justify-center gap-2 bg-transparent border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl px-5 py-2 font-medium transition-colors active:scale-[0.98]"
            >
              <Linkedin size={18} />
              <span className="text-sm tablet:text-base">Connect</span>
            </a>

            {/* X Button */}
            <a 
              href="https://x.com/Sampratigaurav0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full tablet:w-auto min-h-[48px] tablet:min-h-[44px] flex items-center justify-center gap-2 bg-transparent border border-white/10 hover:border-white/20 text-zinc-300 rounded-xl px-5 py-2 font-medium transition-colors active:scale-[0.98]"
            >
              <Twitter size={18} />
              <span className="text-sm tablet:text-base">Follow</span>
            </a>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
