import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRoomStore } from '../store/roomStore';
import { SERVER_URL } from '../lib/config';

export default function Home() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const setRoomId = useRoomStore((s) => s.setRoomId);
  const { nickname, setNickname } = useRoomStore();

  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  const [inputName, setInputName] = useState(nickname);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning,');
    else if (hour < 18) setGreeting('Good afternoon,');
    else setGreeting('Good evening,');
  }, []);

  const handleCreateRoom = async () => {
    if (!inputName.trim()) {
      setError('Nickname is required');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create room');
      const data = await res.json();
      setRoomId(data.roomId);
      setNickname(inputName);
      navigate(`/room/${data.roomId}/waiting`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error creating room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!inputName.trim()) {
      setError('Nickname is required');
      return;
    }
    if (!inputRoomId.trim()) {
      setError('Room ID is required');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const code = inputRoomId.trim().toUpperCase();
      const res = await fetch(`${SERVER_URL}/api/rooms/${code}/exists`);
      if (!res.ok) throw new Error('Failed to check room');
      const data = await res.json();
      if (!data.exists) {
        setError('Room not found');
        return;
      }
      setRoomId(code);
      setNickname(inputName);
      navigate(`/room/${code}/waiting`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error joining room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen overflow-hidden selection:bg-teal-500/30">
        
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-[120%] -translate-y-1/2 w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] bg-teal-500/10 [.light_&]:bg-teal-400/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 translate-x-[20%] -translate-y-1/2 w-[500px] h-[500px] sm:w-[800px] sm:h-[800px] bg-amber-500/10 [.light_&]:bg-amber-400/20 rounded-full blur-[100px] sm:blur-[140px] pointer-events-none" />
      
      {/* Content Container */}
      <div className="relative z-10 w-full max-w-[440px] flex flex-col items-center px-6">
          
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-16 relative w-full">
           <h1 className="text-6xl sm:text-7xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-zinc-400 [.light_&]:from-zinc-800 [.light_&]:to-zinc-500 pb-2 text-center drop-shadow-xl" style={{ WebkitTextStroke: '1px rgba(128,128,128,0.2)' }}>
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
           <h2 className="text-2xl font-normal text-zinc-300 [.light_&]:text-zinc-600 tracking-wide text-center">
             {greeting}
           </h2>

           {/* Create Room Section */}
           <div className="w-full space-y-4">
             <div className="relative group w-full">
               {/* Glowing border effect */}
               <div className="absolute -inset-[2px] bg-gradient-to-r from-teal-400/50 via-cyan-400/40 to-emerald-400/50 rounded-xl blur-[4px] opacity-80 group-hover:opacity-100 transition duration-500"></div>
               {/* The Input */}
               <input 
                 type="text"
                 value={inputName}
                 onChange={e => setInputName(e.target.value)}
                 className="relative w-full bg-[#151515]/90 [.light_&]:bg-[#fcfbf9]/90 backdrop-blur-xl border border-white/10 [.light_&]:border-white/60 rounded-xl px-5 py-4 text-white [.light_&]:text-zinc-900 focus:outline-none placeholder-zinc-500 transition-all font-medium text-lg leading-none shadow-[inset_0_2px_6px_rgba(0,0,0,0.5)] [.light_&]:shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)]"
                 placeholder="Enter your nickname"
                 maxLength={20}
               />
             </div>

             <button 
               onClick={handleCreateRoom}
               disabled={isLoading}
               className="relative w-full overflow-hidden rounded-xl font-medium px-5 py-4 transition-all disabled:opacity-50 active:scale-[0.98] shadow-xl group bg-gradient-to-b from-[#358d86] to-[#1a5a54] [.light_&]:from-[#40A89F] [.light_&]:to-[#277D76] border border-[#42b5ab]/20 [.light_&]:border-[#48BDB3]/30"
             >
               {/* Button shine reflection */}
               <div className="absolute top-0 left-0 right-0 h-[48%] bg-gradient-to-b from-white/30 to-transparent opacity-60"></div>
               {/* Inner glow */}
               <div className="absolute inset-0 rounded-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)] pointer-events-none"></div>
               <span className="relative drop-shadow-sm text-lg text-[#fff] font-semibold tracking-wide block text-center">Start a New Room</span>
             </button>
           </div>

           {/* OR Divider */}
           <div className="relative flex items-center w-full py-2 opacity-40 [.light_&]:opacity-50 text-zinc-300 [.light_&]:text-zinc-600">
             <div className="flex-grow h-[1px] bg-gradient-to-r from-transparent to-current"></div>
             <span className="flex-shrink-0 mx-4 text-sm font-medium tracking-wide">or</span>
             <div className="flex-grow h-[1px] bg-gradient-to-l from-transparent to-current"></div>
           </div>

           {/* Join Room Section */}
           <div className="flex w-full gap-3">
             <input 
               type="text"
               value={inputRoomId}
               onChange={e => setInputRoomId(e.target.value.toUpperCase())}
               className="flex-grow w-2/3 bg-transparent border border-zinc-700 [.light_&]:border-zinc-300 rounded-xl px-5 py-3.5 text-white [.light_&]:text-zinc-900 focus:outline-none focus:border-zinc-500 [.light_&]:focus:border-zinc-400 placeholder-zinc-500 font-mono tracking-widest uppercase transition-colors"
               placeholder="ROOM CODE"
               maxLength={6}
             />
             <button 
               onClick={handleJoinRoom}
               disabled={isLoading}
               className="w-1/3 bg-transparent border border-zinc-700 [.light_&]:border-zinc-300 hover:border-zinc-500 [.light_&]:hover:border-zinc-400 text-zinc-300 [.light_&]:text-zinc-800 rounded-xl px-6 py-3.5 font-medium transition-colors active:scale-[0.98] disabled:opacity-50 text-center"
             >
               Join
             </button>
           </div>

           {/* Error Display */}
           {error && (
             <div className="w-full text-red-400 [.light_&]:text-red-600 text-sm mt-4 text-center bg-red-500/20 [.light_&]:bg-red-500/10 py-3 rounded-lg border border-red-500/20 font-medium tracking-wide">
               {error}
             </div>
           )}

        </div>
      </div>
    </div>
  );
}
