import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Coffee, Copy, Check, Lock, Unlock, Link2, FileVideo, ShieldCheck, Play, ArrowRight, Shield, HelpCircle, Github, Linkedin, Twitter } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { SERVER_URL } from '../lib/config';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const Particles = () => {
  const [particles, setParticles] = useState<Array<{ id: number, x: number, y: number, duration: number, delay: number, size: number, isTeal: boolean }>>([]);
  
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    
    const newParticles = Array.from({ length: 18 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      duration: 5 + Math.random() * 8, 
      delay: Math.random() * -10, 
      size: Math.random() > 0.6 ? 2 : 1, 
      isTeal: Math.random() > 0.8 
    }));
    setParticles(newParticles);
  }, []);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 hidden tablet:block mix-blend-screen [.light_&]:mix-blend-multiply">
      {particles.map(p => (
        <div
          key={p.id}
          className={cn(
            "absolute rounded-full",
            p.isTeal ? "bg-teal-400/20 [.light_&]:bg-teal-600/20" : "bg-white/10 [.light_&]:bg-black/10"
          )}
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            animationIterationCount: 'infinite',
            animationName: 'particleFloat',
            animationTimingFunction: 'linear'
          }}
        />
      ))}
      <style>{`
        @keyframes particleFloat {
          0% { transform: translateY(10vh); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-40vh); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

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

export default function Home() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { setRoomId, setNickname } = useRoomStore(useShallow(state => ({
    setRoomId: state.setRoomId,
    setNickname: state.setNickname
  })));

  const savedNickname = localStorage.getItem('syncwatch_nickname') || '';
  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  const [createNickname, setCreateNickname] = useState(savedNickname);
  const [joinNickname, setJoinNickname] = useState(savedNickname);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  
  const [lockRoom, setLockRoom] = useState(false);
  const [createPin, setCreatePin] = useState('');
  const [requiresPin, setRequiresPin] = useState(false);
  const [joinPin, setJoinPin] = useState('');

  const [showExpiredError, setShowExpiredError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [copied, setCopied] = useState(false);

  const joinNicknameInputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.2 });
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText('sampratigaurav123@okaxis');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning,');
    else if (hour < 18) setGreeting('Good afternoon,');
    else setGreeting('Good evening,');
  }, []);

  useEffect(() => {
    if (urlRoomId) {
      setInputRoomId(urlRoomId);
      // Wait a tick for render then focus
      setTimeout(() => {
        joinNicknameInputRef.current?.focus();
      }, 50);
    }
  }, [urlRoomId]);

  const handleCreateRoom = async () => {
    const trimmed = createNickname.trim();
    if (!trimmed || trimmed.length < 2) {
      setCreateError('Please enter a nickname to continue');
      return;
    }
    if (lockRoom) {
      if (!createPin) {
        setCreateError('Please enter a PIN');
        return;
      }
      if (!/^[a-zA-Z0-9]{4,8}$/.test(createPin)) {
        setCreateError('PIN must be 4-8 alphanumeric characters');
        return;
      }
    }
    setCreateError('');
    setIsLoading(true);
    localStorage.setItem('syncwatch_nickname', trimmed);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lockRoom ? { password: createPin } : {})
      });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      
      useRoomStore.getState().setRoomPassword(lockRoom ? createPin : null);
      setRoomId(data.roomId);
      setNickname(trimmed);
      navigate(`/room/${data.roomId}/waiting`);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
         setCreateError('Could not reach the server. Please try again in a moment.');
      } else {
         setCreateError(err instanceof Error ? err.message : 'Error creating room');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    const trimmed = joinNickname.trim();
    if (!trimmed || trimmed.length < 2) {
      setJoinError('Please enter a nickname to continue');
      setShowExpiredError(false);
      return;
    }
    if (!inputRoomId.trim()) {
      setJoinError('Please enter a room code');
      setShowExpiredError(false);
      return;
    }
    if (requiresPin) {
      if (!joinPin || !/^[a-zA-Z0-9]{4,8}$/.test(joinPin)) {
        setJoinError('PIN must be 4-8 alphanumeric characters');
        return;
      }
    }
    setJoinError('');
    setShowExpiredError(false);
    setIsLoading(true);
    localStorage.setItem('syncwatch_nickname', trimmed);
    
    try {
      const code = inputRoomId.trim().toUpperCase();
      
      if (!requiresPin) {
        const res = await fetch(`${SERVER_URL}/api/rooms/${code}/exists`);
        if (!res.ok) throw new Error('Failed to check room');
        const data = await res.json();
        
        if (!data.exists) {
          if (urlRoomId) {
            setShowExpiredError(true);
          } else {
            setJoinError('Room not found');
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
          setJoinError('Incorrect PIN. Please try again.');
          setJoinPin('');
          setIsLoading(false);
          cleanup();
        };
        
        const handleRoomState = () => {
          useRoomStore.getState().setRoomPassword(joinPin);
          setRoomId(code);
          setNickname(trimmed);
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
        socket.emit(EVENTS.JOIN_ROOM, { roomId: code, nickname: trimmed, password: joinPin });
      } else {
        useRoomStore.getState().setRoomPassword(null);
        setRoomId(code);
        setNickname(trimmed);
        navigate(`/room/${code}/waiting`);
      }
    } catch (err: unknown) {
      if (err instanceof TypeError) {
         setJoinError('Could not reach the server. Please try again in a moment.');
      } else {
         setJoinError(err instanceof Error ? err.message : 'Error joining room');
      }
      setIsLoading(false);
    }
  };

  const isCreateNicknameError = createError === 'Please enter a nickname to continue';
  const isCreatePinError = createError === 'Please enter a PIN' || createError === 'PIN must be 4-8 alphanumeric characters';
  const isGlobalCreateError = createError && !isCreateNicknameError && !isCreatePinError;

  const isJoinNicknameError = joinError === 'Please enter a nickname to continue';
  const isJoinCodeError = joinError === 'Please enter a room code' || joinError === 'Room not found';
  const isJoinPinError = joinError === 'PIN must be 4-8 alphanumeric characters' || joinError === 'Incorrect PIN. Please try again.';
  const isGlobalJoinError = joinError && !isJoinNicknameError && !isJoinCodeError && !isJoinPinError;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-x-hidden overflow-y-auto pt-16 tablet:pt-20 pb-12 selection:bg-teal-500/30 bg-zinc-950 transition-colors duration-500 animate-in fade-in duration-500">
        
      {/* Cinematic Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] bg-[#1D9E75]/[0.06] [.light_&]:bg-teal-500/[0.1] rounded-full blur-[140px] mix-blend-screen [.light_&]:mix-blend-multiply animate-orb-1" />
        <div className="absolute -bottom-[20%] -right-[10%] w-[70vw] h-[70vw] max-w-[900px] max-h-[900px] bg-[#d97706]/[0.04] [.light_&]:bg-amber-600/[0.08] rounded-full blur-[160px] mix-blend-screen [.light_&]:mix-blend-multiply animate-orb-2" />
        <div className="absolute top-[20%] left-[30%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-[#7F77DD]/[0.03] [.light_&]:bg-[#7F77DD]/[0.08] rounded-full blur-[120px] mix-blend-screen [.light_&]:mix-blend-multiply animate-orb-3" />
      </div>

      <Particles />
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-[900px] flex flex-col items-center px-4 tablet:px-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10 tablet:mb-14 desktop:mb-20 relative w-full bg-transparent">
           <h1 className="text-5xl tablet:text-6xl desktop:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 [.light_&]:from-zinc-800 [.light_&]:to-zinc-500 pb-2 text-center drop-shadow-[0_0_15px_rgba(29,158,117,0.05)] animate-wordmark animate-cinematic-glow delay-[200ms]" style={{ WebkitTextStroke: '1px rgba(128,128,128,0.2)' }}>
             SyncWatch
           </h1>
           <div className="flex items-center gap-4 w-full justify-center opacity-60 mt-1 text-zinc-300 [.light_&]:text-zinc-600 animate-in fade-in fill-mode-both duration-700 delay-[500ms]">
             <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-current relative overflow-hidden"><div className="absolute inset-0 bg-white/50 animate-shimmer" /></div>
             <p className="text-sm tablet:text-base font-medium tracking-wider uppercase relative overflow-hidden">
               Same movie. Same moment.
               <span className="absolute inset-0 -translate-x-[150%] animate-shimmer fill-mode-both delay-1000 bg-gradient-to-r from-transparent via-white/50 [.light_&]:via-black/20 to-transparent mix-blend-overlay" />
             </p>
             <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-current relative overflow-hidden"><div className="absolute inset-0 bg-white/50 animate-shimmer" /></div>
           </div>
        </div>

        <div className="w-full flex flex-col items-center space-y-10 animate-in fade-in fill-mode-both duration-700 delay-[700ms]">
           
           {/* Greeting */}
           <h2 className="text-xl tablet:text-[22px] desktop:text-2xl font-light text-zinc-300 [.light_&]:text-zinc-600 tracking-wide text-center">
             Good <span className="font-medium text-white [.light_&]:text-zinc-800 tracking-wider">
               {greeting.match(/(morning|afternoon|evening)/)?.[0] || 'day'}
             </span>,
           </h2>

           {/* Create / Join Container */}
           <div className="w-full flex flex-col tablet:flex-row items-stretch justify-center gap-4 tablet:gap-8">

             {/* Create Room Card */}
              <div className="w-full tablet:w-1/2 max-w-[440px] mx-auto bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
               <div className="flex items-center gap-2">
                 <h3 className="text-white [.light_&]:text-zinc-900 font-semibold text-lg">Start a New Room</h3>
                 {lockRoom && <Lock size={16} className="text-teal-400 mt-0.5" />}
               </div>
               <div className="flex flex-col gap-2">
                 <div className="relative w-full">
                    <input 
                      type="text"
                      value={createNickname}
                      onChange={e => {
                        setCreateNickname(e.target.value);
                        if (createError) setCreateError('');
                      }}
                      className={cn(
                        "w-full h-12 tablet:h-[52px] min-h-[48px] bg-zinc-900/80 border rounded-xl px-4 tablet:px-5 text-zinc-100 [.light_&]:text-zinc-900 focus:outline-none focus:border-transparent focus:ring-2 placeholder-zinc-500 transition-all duration-200 font-medium text-base tablet:text-lg",
                        isCreateNicknameError ? "border-red-500/50 focus:ring-red-500 animate-shake" : "border-zinc-700 focus:ring-emerald-500"
                      )}
                      placeholder="Enter your nickname"
                      maxLength={20}
                    />
                    {isCreateNicknameError && <div className="text-red-400 text-xs mt-1 ml-1">{createError}</div>}
                 </div>
                 
                 <div className="flex items-center justify-between mt-2 mb-1 px-1">
                   <div className="flex items-center gap-2">
                     {lockRoom ? <Lock size={16} className="text-teal-400" /> : <Unlock size={16} className="text-zinc-500" />}
                     <div className="flex items-center gap-1.5 cursor-help group/tooltip relative">
                       <span className="text-sm font-medium text-zinc-300 [.light_&]:text-zinc-700">Lock room with a PIN</span>
                       <HelpCircle size={14} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
                       <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[180px] p-2 bg-zinc-800 text-zinc-300 text-xs rounded-md shadow-lg opacity-0 pointer-events-none group-hover/tooltip:opacity-100 transition-opacity z-20 text-center border border-zinc-700">
                         Requires users to enter the correct PIN to join
                       </div>
                     </div>
                   </div>
                   <button 
                     onClick={() => {
                       setLockRoom(!lockRoom);
                       if (createError) setCreateError('');
                     }}
                     role="switch"
                     aria-checked={lockRoom}
                     aria-label="Lock room with a PIN"
                     title={lockRoom ? "Unlock room" : "Lock room"}
                     className={cn("w-10 h-5 rounded-full relative transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900", lockRoom ? "bg-teal-500" : "bg-zinc-700 [.light_&]:bg-zinc-300")}
                   >
                     <div className={cn("w-4 h-4 rounded-full bg-white absolute top-[2px] transition-transform", lockRoom ? "translate-x-[22px]" : "translate-x-0.5")} />
                   </button>
                 </div>
                 
                 {lockRoom && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-1">
                     <p className="text-xs text-zinc-500 mb-1.5 ml-1">Anyone joining will need this PIN</p>
                      <input
                        type="password"
                        value={createPin}
                        onChange={e => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
                          setCreatePin(val);
                          if (createError) setCreateError('');
                        }}
                        className={cn(
                          "w-full h-12 tablet:h-[52px] min-h-[48px] bg-zinc-900/80 border rounded-xl px-4 tablet:px-5 text-zinc-100 [.light_&]:text-zinc-900 focus:outline-none focus:border-transparent focus:ring-2 placeholder-zinc-600 transition-all duration-200 font-mono tracking-widest text-lg",
                          isCreatePinError ? "border-red-500/50 focus:ring-red-500 animate-shake" : "border-zinc-700 focus:ring-emerald-500"
                        )}
                        placeholder="4-8 character PIN"
                        maxLength={8}
                      />
                      {isCreatePinError && <div className="text-red-400 text-xs mt-1 ml-1">{createError}</div>}
                   </div>
                 )}
                 

                {isGlobalCreateError && (
                    <div className="text-red-400 [.light_&]:text-red-600 text-sm font-medium px-1 leading-tight">{createError}</div>
                 )}
               </div>
               <button 
                 onClick={handleCreateRoom}
                 disabled={isLoading}
                 className="w-full h-12 tablet:h-[52px] min-h-[48px] rounded-lg font-medium px-5 py-2.5 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] shadow-sm bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center text-base tablet:text-lg"
               >
                 Create Room
               </button>
             </div>

             {/* Join Room Card */}
             <div className="w-full tablet:w-1/2 max-w-[440px] mx-auto bg-zinc-900 rounded-xl border border-zinc-800 p-6 flex flex-col justify-between gap-4 z-10 hover:-translate-y-1 hover:shadow-2xl transition-all duration-300">
               
               <h3 className="text-white [.light_&]:text-zinc-900 font-semibold text-lg relative z-10">Join Existing</h3>
               <div className="flex flex-col gap-4 relative z-10">
                  <div>
                    <input 
                      ref={joinNicknameInputRef}
                      type="text"
                      value={joinNickname}
                      onChange={e => {
                        setJoinNickname(e.target.value);
                        if (joinError === 'Please enter a nickname to continue') setJoinError('');
                      }}
                      className={cn(
                        "w-full h-12 tablet:h-[52px] min-h-[48px] bg-zinc-900/80 border rounded-xl px-4 tablet:px-5 text-zinc-100 [.light_&]:text-zinc-900 focus:outline-none focus:border-transparent focus:ring-2 placeholder-zinc-500 transition-all duration-200 font-medium text-base tablet:text-lg",
                        isJoinNicknameError ? "border-red-500/50 focus:ring-red-500 animate-shake" : "border-zinc-700 focus:ring-emerald-500"
                      )}
                      placeholder="Enter your nickname"
                      maxLength={20}
                    />
                    {isJoinNicknameError && <div className="text-red-400 text-xs mt-1 ml-1">{joinError}</div>}
                  </div>
                  <div>
                    <input 
                      type="text"
                      value={inputRoomId}
                      onChange={e => {
                        setInputRoomId(e.target.value.toUpperCase());
                        if (joinError === 'Please enter a room code') setJoinError('');
                      }}
                      className={cn(
                        "w-full h-12 tablet:h-[52px] min-h-[48px] bg-zinc-900/80 border rounded-xl px-4 tablet:px-5 text-zinc-100 [.light_&]:text-zinc-900 focus:outline-none focus:border-transparent focus:ring-2 placeholder-zinc-500 font-mono tracking-widest uppercase transition-all duration-200 text-base tablet:text-lg",
                        isJoinCodeError ? "border-red-500/50 focus:ring-red-500 animate-shake" : "border-zinc-700 focus:ring-emerald-500"
                      )}
                      placeholder="ROOM CODE"
                      maxLength={6}
                      disabled={requiresPin}
                    />
                    {isJoinCodeError && <div className="text-red-400 text-xs mt-1 ml-1">{joinError}</div>}
                  </div>
                 
                 {requiresPin && (
                   <div className="animate-in fade-in slide-in-from-top-2 duration-300 mt-1">
                     <div className="flex items-center gap-2 mb-2 ml-1">
                       <Lock size={14} className="text-teal-400" />
                       <span className="text-sm font-medium text-zinc-300 [.light_&]:text-zinc-700">This room is locked</span>
                     </div>
                      <input
                        type="password"
                        value={joinPin}
                        onChange={e => {
                          const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
                          setJoinPin(val);
                          if (joinError) setJoinError('');
                        }}
                        autoFocus
                        className={cn(
                          "w-full h-12 tablet:h-[52px] min-h-[48px] bg-zinc-900/80 border rounded-xl px-4 tablet:px-5 text-zinc-100 [.light_&]:text-zinc-900 focus:outline-none focus:border-transparent focus:ring-2 placeholder-zinc-600 transition-all duration-200 font-mono tracking-widest text-lg",
                          isJoinPinError ? "border-red-500/50 focus:ring-red-500 animate-shake" : "border-zinc-700 focus:ring-emerald-500"
                        )}
                        placeholder="Enter PIN"
                        maxLength={8}
                      />
                      {isJoinPinError && <div className="text-red-400 text-xs mt-1 ml-1">{joinError}</div>}
                   </div>
                 )}
               </div>
               
                {isGlobalJoinError && (
                  <div className="text-red-400 [.light_&]:text-red-600 text-sm font-medium px-1 leading-tight mt-[-4px] relative z-10">{joinError}</div>
               )}
               <button 
                 onClick={handleJoinRoom}
                 disabled={isLoading}
                 className="w-full h-12 tablet:h-[52px] min-h-[48px] rounded-lg font-medium px-5 py-2.5 transition-all duration-200 disabled:opacity-50 active:scale-[0.98] bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white flex items-center justify-center text-base tablet:text-lg"
               >
                 Join Room
               </button>
             </div>

           </div>

           {/* Expired Room Error */}
           {showExpiredError && (
             <div className="w-full max-w-[440px] mx-auto mt-4">
               <div className="flex flex-col items-center p-4 bg-zinc-900/80 [.light_&]:bg-zinc-100/80 backdrop-blur-md rounded-xl border border-white/10 [.light_&]:border-black/5 shadow-lg">
                 <p className="text-zinc-300 [.light_&]:text-zinc-700 text-center mb-4 text-sm tablet:text-base font-medium">
                   This room has expired or does not exist. Create a new room to start watching together.
                 </p>
                 <button 
                   onClick={() => {
                     setShowExpiredError(false);
                     setInputRoomId('');
                     navigate('/');
                     joinNicknameInputRef.current?.focus();
                   }}
                   className="px-5 py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 [.light_&]:text-teal-600 rounded-lg transition-colors font-semibold text-sm"
                 >
                   Create a new room
                 </button>
               </div>
             </div>
           )}

        </div>

        {/* How it works section */}
        <div ref={sectionRef} className="w-full mt-12 tablet:mt-16 pt-8 tablet:pt-12 border-t border-white/5 [.light_&]:border-black/5 flex flex-col items-center">
          
          <div className={cn(
            "text-center transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
          )}>
            <h2 className="text-3xl tablet:text-4xl font-bold tracking-tight text-white [.light_&]:text-zinc-900 mb-2">How it works</h2>
            <p className="text-sm tablet:text-base text-zinc-400 [.light_&]:text-zinc-600 font-medium tracking-wide">From your file to in sync — in under 30 seconds</p>
          </div>

          <div className="relative w-full mt-10 tablet:mt-12 max-w-[900px]">
            {/* Mobile Vertical Timeline Line */}
            <div className={cn(
              "absolute left-[20px] top-6 bottom-6 w-[2px] border-l-2 border-dashed border-teal-500/20 tablet:hidden transition-opacity duration-700 ease-out delay-300",
              isVisible ? "opacity-100" : "opacity-0"
            )} />

            <div className="grid grid-cols-1 tablet:grid-cols-2 desktop:grid-cols-4 gap-8 desktop:gap-12 relative w-full">
              {STEPS.map((step, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "relative flex pl-12 tablet:pl-0 transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
                    isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
                  )}
                  style={{ transitionDelay: `${(i + 1) * 150}ms` }}
                >
                  {/* Mobile Timeline Dot */}
                  <div className="absolute left-[15px] top-[26px] w-[12px] h-[12px] rounded-full bg-teal-500 tablet:hidden shadow-[0_0_8px_rgba(29,158,117,0.5)]" />

                  {/* Desktop/Tablet Horizontal Connector */}
                  {(i === 0 || i === 1 || i === 2) && (
                    <div className={cn(
                      "hidden absolute top-[38px] -right-[12px] text-teal-500/30 z-10",
                      i === 0 || i === 2 ? "tablet:block desktop:block" : "desktop:block"
                    )}>
                      <ArrowRight size={20} className="animate-pulse" />
                    </div>
                  )}

                  {/* Step Container */}
                  <div className="w-full relative group">
                    <step.icon className="text-emerald-400 w-[28px] h-[28px] mb-4 transition-transform duration-300 group-hover:scale-110" />
                    <h4 className="text-zinc-200 [.light_&]:text-zinc-900 font-medium text-[15px] mb-1.5">{step.title}</h4>
                    <p className="text-zinc-400 [.light_&]:text-zinc-600 text-sm leading-[1.6]">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Differentiator Pill */}
          <div 
            className={cn(
              "mt-10 tablet:mt-12 bg-zinc-900/80 [.light_&]:bg-teal-50/80 border border-white/5 [.light_&]:border-teal-200 backdrop-blur-md rounded-2xl py-3 px-5 tablet:px-6 flex items-center gap-3 shadow-xl transition-all duration-500 ease-out motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0",
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
            )}
            style={{ transitionDelay: '750ms' }}
          >
            <Shield className="text-teal-500 flex-shrink-0" size={18} fill="rgba(29, 158, 117, 0.2)" />
            <p className="text-[13px] tablet:text-sm text-zinc-300 [.light_&]:text-teal-900 font-medium tracking-wide">
              Your video file never leaves your device. Only play, pause, and seek signals are sent over the internet.
            </p>
          </div>
        </div>

        {/* Support Section */}
        <div className="w-full max-w-[600px] mt-12 tablet:mt-16 pt-8 border-t border-white/5 [.light_&]:border-black/10 pb-4">
          <div className="flex flex-col items-center text-center mb-6 px-4">
            <p className="text-zinc-200 [.light_&]:text-zinc-700 font-medium mb-1 text-[15px] tablet:text-[16px]">
              SyncWatch is free and open source.
            </p>
            <p className="text-[13px] tablet:text-[14px] text-zinc-500 [.light_&]:text-zinc-500">
              If it made your movie night better, consider starring the project or connecting with me.
            </p>
          </div>
          
          <div className="flex flex-col tablet:flex-row items-center justify-center gap-3 tablet:gap-4 max-w-lg mx-auto">
            {/* GitHub Button */}
            <a 
              href="https://github.com/sampratigaurav/syncwatch" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full tablet:w-auto min-h-[48px] tablet:min-h-[44px] flex items-center justify-center gap-2 bg-transparent border border-zinc-700 [.light_&]:border-zinc-300 hover:border-zinc-500 [.light_&]:hover:border-zinc-400 text-zinc-300 [.light_&]:text-zinc-800 rounded-xl px-5 py-2 font-medium transition-colors active:scale-[0.98]"
            >
              <Github size={18} />
              <span className="text-sm tablet:text-base">Star on GitHub</span>
            </a>

            {/* LinkedIn Button */}
            <a 
              href="https://linkedin.com/in/sampratigaurav" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full tablet:w-auto min-h-[48px] tablet:min-h-[44px] flex items-center justify-center gap-2 bg-transparent border border-zinc-700 [.light_&]:border-zinc-300 hover:border-zinc-500 [.light_&]:hover:border-zinc-400 text-zinc-300 [.light_&]:text-zinc-800 rounded-xl px-5 py-2 font-medium transition-colors active:scale-[0.98]"
            >
              <Linkedin size={18} />
              <span className="text-sm tablet:text-base">Connect</span>
            </a>

            {/* X Button */}
            <a 
              href="https://x.com/sampratigaurav" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full tablet:w-auto min-h-[48px] tablet:min-h-[44px] flex items-center justify-center gap-2 bg-transparent border border-zinc-700 [.light_&]:border-zinc-300 hover:border-zinc-500 [.light_&]:hover:border-zinc-400 text-zinc-300 [.light_&]:text-zinc-800 rounded-xl px-5 py-2 font-medium transition-colors active:scale-[0.98]"
            >
              <Twitter size={18} />
              <span className="text-sm tablet:text-base">Follow</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
