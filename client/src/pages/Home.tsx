import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Coffee, Copy, Check, Loader2 } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { SERVER_URL } from '../lib/config';

export default function Home() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const setRoomId = useRoomStore((s) => s.setRoomId);
  const { setNickname } = useRoomStore();

  const connectionStatus = useRoomStore(s => s.connectionStatus);
  const savedNickname = localStorage.getItem('syncwatch_nickname') || '';
  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  const [createNickname, setCreateNickname] = useState(savedNickname);
  const [joinNickname, setJoinNickname] = useState(savedNickname);
  const [createError, setCreateError] = useState('');
  const [joinError, setJoinError] = useState('');
  const [showExpiredError, setShowExpiredError] = useState(false);
  const [showWakingUp, setShowWakingUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [copied, setCopied] = useState(false);

  const joinNicknameInputRef = useRef<HTMLInputElement>(null);

  const handleCopyUPI = () => {
    navigator.clipboard.writeText('sampratigaurav123@okaxis');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (connectionStatus === 'connecting') {
      timer = setTimeout(() => setShowWakingUp(true), 3000);
    } else {
      setShowWakingUp(false);
    }
    return () => clearTimeout(timer);
  }, [connectionStatus]);

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
    setCreateError('');
    setIsLoading(true);
    localStorage.setItem('syncwatch_nickname', trimmed);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
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
    setJoinError('');
    setShowExpiredError(false);
    setIsLoading(true);
    localStorage.setItem('syncwatch_nickname', trimmed);
    try {
      const code = inputRoomId.trim().toUpperCase();
      const res = await fetch(`${SERVER_URL}/api/rooms/${code}/exists`);
      if (!res.ok) throw new Error('Failed to check room');
      const data = await res.json();
      if (!data.exists) {
        if (urlRoomId) {
          setShowExpiredError(true);
        } else {
          setJoinError('Room not found');
        }
        return;
      }
      setRoomId(code);
      setNickname(trimmed);
      navigate(`/room/${code}/waiting`);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
         setJoinError('Could not reach the server. Please try again in a moment.');
      } else {
         setJoinError(err instanceof Error ? err.message : 'Error joining room');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-x-hidden overflow-y-auto py-12 selection:bg-teal-500/30">
        
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-[120%] -translate-y-1/2 w-[400px] h-[400px] tablet:w-[600px] tablet:h-[600px] desktop:w-[800px] desktop:h-[800px] bg-teal-500/10 [.light_&]:bg-teal-400/20 rounded-full blur-[80px] tablet:blur-[120px] desktop:blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 translate-x-[20%] -translate-y-1/2 w-[400px] h-[400px] tablet:w-[600px] tablet:h-[600px] desktop:w-[800px] desktop:h-[800px] bg-amber-500/10 [.light_&]:bg-amber-400/20 rounded-full blur-[80px] tablet:blur-[120px] desktop:blur-[140px] pointer-events-none" />
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-[900px] flex flex-col items-center px-4 tablet:px-8 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 tablet:mb-12 desktop:mb-16 relative w-full">
           <h1 className="text-5xl tablet:text-6xl desktop:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 [.light_&]:from-zinc-800 [.light_&]:to-zinc-500 pb-2 text-center drop-shadow-xl" style={{ WebkitTextStroke: '1px rgba(128,128,128,0.2)' }}>
             SyncWatch
           </h1>
           <div className="flex items-center gap-4 w-full justify-center opacity-60 mt-1 text-zinc-300 [.light_&]:text-zinc-600">
             <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-current"></div>
             <p className="text-sm font-medium tracking-wide">Same movie. Same moment.</p>
             <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-current"></div>
           </div>
        </div>

        <div className="w-full flex flex-col items-center space-y-8">
           
           {/* Greeting */}
           <h2 className="text-xl tablet:text-2xl font-normal text-zinc-300 [.light_&]:text-zinc-600 tracking-wide text-center">
             {greeting}
           </h2>

           {/* Create / Join Container */}
           <div className="w-full flex flex-col tablet:flex-row items-stretch justify-center gap-4 tablet:gap-6">

             {/* Create Room Card */}
              <div className="w-full tablet:w-1/2 max-w-[440px] mx-auto bg-zinc-950/60 [.light_&]:bg-zinc-100/60 backdrop-blur-xl border border-white/10 [.light_&]:border-black/5 rounded-2xl p-5 tablet:p-6 flex flex-col gap-4 shadow-xl">
               <h3 className="text-white [.light_&]:text-zinc-900 font-semibold text-lg">Start a New Room</h3>
               <div className="flex flex-col gap-2">
                 <div className="relative group w-full">
                   <div className="absolute -inset-[2px] bg-gradient-to-r from-teal-400/50 via-cyan-400/40 to-emerald-400/50 rounded-xl blur-[4px] opacity-80 group-hover:opacity-100 transition duration-500"></div>
                   <input 
                     type="text"
                     value={createNickname}
                     onChange={e => {
                       setCreateNickname(e.target.value);
                       if (createError) setCreateError('');
                     }}
                     className="relative w-full h-12 tablet:h-[52px] min-h-[48px] bg-[#151515]/90 [.light_&]:bg-[#fcfbf9]/90 backdrop-blur-xl border border-white/10 [.light_&]:border-white/60 rounded-xl px-4 tablet:px-5 text-white [.light_&]:text-zinc-900 focus:outline-none placeholder-zinc-500 transition-all font-medium text-base tablet:text-lg shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] [.light_&]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                     placeholder="Enter your nickname"
                     maxLength={20}
                   />
                 </div>
                 {createError && (
                   <div className="text-red-400 [.light_&]:text-red-600 text-sm font-medium px-1 leading-tight">{createError}</div>
                 )}
               </div>
               <button 
                 onClick={handleCreateRoom}
                 disabled={isLoading}
                 className="relative w-full h-12 tablet:h-[52px] min-h-[48px] overflow-hidden rounded-xl font-medium px-5 transition-all disabled:opacity-50 active:scale-[0.98] shadow-xl group bg-gradient-to-b from-[#358d86] to-[#1a5a54] [.light_&]:from-[#40A89F] [.light_&]:to-[#277D76] border border-[#42b5ab]/20 [.light_&]:border-[#48BDB3]/30"
               >
                 <div className="absolute top-0 left-0 right-0 h-[48%] bg-gradient-to-b from-white/30 to-transparent opacity-60"></div>
                 <div className="absolute inset-0 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] pointer-events-none"></div>
                 <span className="relative drop-shadow-sm text-base tablet:text-lg text-[#fff] font-semibold tracking-wide flex items-center justify-center">
                   Create Room
                 </span>
               </button>
             </div>

             {/* Join Room Card */}
             <div className="w-full tablet:w-1/2 max-w-[440px] mx-auto bg-zinc-950/60 [.light_&]:bg-zinc-100/60 backdrop-blur-xl border border-white/10 [.light_&]:border-black/5 rounded-2xl p-5 tablet:p-6 flex flex-col gap-4 shadow-xl">
               <h3 className="text-white [.light_&]:text-zinc-900 font-semibold text-lg">Join Existing</h3>
               <div className="flex flex-col gap-4">
                 <input 
                   ref={joinNicknameInputRef}
                   type="text"
                   value={joinNickname}
                   onChange={e => {
                     setJoinNickname(e.target.value);
                     if (joinError === 'Please enter a nickname to continue') setJoinError('');
                   }}
                   className="w-full h-12 tablet:h-[52px] min-h-[48px] bg-[#151515]/80 [.light_&]:bg-[#fcfbf9]/80 border border-zinc-700 [.light_&]:border-zinc-300 rounded-xl px-4 tablet:px-5 text-white [.light_&]:text-zinc-900 focus:outline-none focus:border-zinc-500 [.light_&]:focus:border-zinc-400 placeholder-zinc-500 transition-colors text-base tablet:text-lg"
                   placeholder="Enter your nickname"
                   maxLength={20}
                 />
                 <input 
                   type="text"
                   value={inputRoomId}
                   onChange={e => {
                     setInputRoomId(e.target.value.toUpperCase());
                     if (joinError === 'Please enter a room code') setJoinError('');
                   }}
                   className="w-full h-12 tablet:h-[52px] min-h-[48px] bg-[#151515]/80 [.light_&]:bg-[#fcfbf9]/80 border border-zinc-700 [.light_&]:border-zinc-300 rounded-xl px-4 tablet:px-5 text-white [.light_&]:text-zinc-900 focus:outline-none focus:border-zinc-500 [.light_&]:focus:border-zinc-400 placeholder-zinc-500 font-mono tracking-widest uppercase transition-colors text-base tablet:text-lg"
                   placeholder="ROOM CODE"
                   maxLength={6}
                 />
               </div>
               
               {joinError && (
                 <div className="text-red-400 [.light_&]:text-red-600 text-sm font-medium px-1 leading-tight mt-[-4px]">{joinError}</div>
               )}
               <button 
                 onClick={handleJoinRoom}
                 disabled={isLoading}
                 className="w-full h-12 tablet:h-[52px] min-h-[48px] bg-transparent border border-zinc-700 [.light_&]:border-zinc-300 hover:border-zinc-500 [.light_&]:hover:border-zinc-400 text-zinc-300 [.light_&]:text-zinc-800 rounded-xl px-6 font-medium transition-colors active:scale-[0.98] disabled:opacity-50 flex items-center justify-center text-base tablet:text-lg"
               >
                 Join Room
               </button>
             </div>

           </div>

           {/* Waking up banner */}
           {showWakingUp && (
             <div className="w-full max-w-[440px] tablet:max-w-[900px] mt-6 mx-auto bg-amber-950/40 [.light_&]:bg-amber-100/60 border border-amber-500/30 rounded-xl p-4 flex items-center justify-center animate-in fade-in slide-in-from-bottom-4 shadow-lg backdrop-blur-md">
               <Loader2 className="w-5 h-5 text-amber-500 animate-spin mr-3 flex-shrink-0" />
               <div className="flex flex-col text-left">
                 <span className="text-amber-400 [.light_&]:text-amber-700 font-medium text-sm tablet:text-base">Waking up the server, please wait...</span>
                 <span className="text-amber-500/70 [.light_&]:text-amber-600/80 text-xs hidden tablet:block mt-0.5">Free tier servers sleep after inactivity. This takes up to 30 seconds.</span>
               </div>
             </div>
           )}

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

        {/* Support Section */}
        <div className="w-full max-w-[440px] tablet:max-w-full mt-12 tablet:mt-16 pt-8 border-t border-white/5 [.light_&]:border-black/10 pb-4">
          <div className="flex flex-col items-center text-center mb-6 px-4">
            <p className="text-zinc-200 [.light_&]:text-zinc-700 font-medium mb-1 text-[15px] tablet:text-[16px]">
              SyncWatch is free and open source.
            </p>
            <p className="text-[13px] tablet:text-[14px] text-zinc-500 [.light_&]:text-zinc-500">
              If it made your movie night better, consider supporting the project.
            </p>
          </div>
          
          <div className="flex flex-col tablet:flex-row items-stretch tablet:items-end justify-center gap-3 tablet:gap-4 max-w-lg mx-auto">
            {/* Ko-fi Button */}
            <a 
              href="https://ko-fi.com/sampratigaurav" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 min-h-[48px] tablet:min-h-[44px] flex items-center justify-center gap-2 bg-transparent border border-zinc-700 [.light_&]:border-zinc-300 hover:border-zinc-500 [.light_&]:hover:border-zinc-400 text-zinc-300 [.light_&]:text-zinc-800 rounded-xl px-4 py-3 font-medium transition-colors active:scale-[0.98]"
            >
              <Coffee size={18} color="#FF5E5B" />
              <span className="text-sm tablet:text-base">Support this project</span>
            </a>

            {/* UPI Element */}
            <div className="flex-1 flex flex-col" title="UPI (India)">
              <span className="text-[10px] tablet:text-[11px] text-zinc-500 [.light_&]:text-zinc-500 uppercase tracking-wider mb-1 ml-1 font-semibold text-center tablet:text-left">UPI (India)</span>
              <div className="min-h-[48px] tablet:min-h-[44px] flex items-center justify-between bg-zinc-900/50 [.light_&]:bg-zinc-100/80 border border-zinc-800 [.light_&]:border-zinc-200 rounded-xl pl-4 pr-2 tablet:pl-3 tablet:pr-1 py-1">
                <span className="font-mono text-sm tablet:text-xs text-zinc-400 [.light_&]:text-zinc-600 truncate mr-2">
                  sampratigaurav123@okaxis
                </span>
                <button 
                  onClick={handleCopyUPI}
                  className="w-10 h-10 tablet:w-8 tablet:h-8 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-zinc-800 [.light_&]:hover:bg-zinc-200 text-zinc-400 [.light_&]:text-zinc-600 transition-colors"
                  title="Copy UPI ID"
                >
                  {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
