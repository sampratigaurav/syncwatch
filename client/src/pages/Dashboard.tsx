import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SEO } from '../components/SEO';
import { Link2, Lock, Unlock, Eye, EyeOff } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { SERVER_URL } from '../lib/config';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { m, LazyMotion, domAnimation, AnimatePresence } from 'framer-motion';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

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
      className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] bg-teal-900/40 rounded-full blur-[120px] mix-blend-screen animate-orb-1" 
    />
    <div 
      className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-slate-800/50 rounded-full blur-[150px] mix-blend-screen animate-orb-2" 
    />
  </div>
);

export default function Dashboard() {

  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { setRoomId, nickname: authNickname, profileName, avatarUrl } = useRoomStore(useShallow(state => ({
    setRoomId: state.setRoomId,
    nickname: state.nickname,
    profileName: state.profileName,
    avatarUrl: state.avatarUrl
  })));

  const savedNickname = profileName || localStorage.getItem('syncwatch_nickname') || authNickname || '';
  const [nickname, setNicknameInput] = useState(savedNickname);
  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  
  const [error, setError] = useState('');
  const [missingIdentity, setMissingIdentity] = useState(false);
  
  const [lockRoom, setLockRoom] = useState(false);
  const [pin, setPin] = useState('');
  const [requiresPin, setRequiresPin] = useState(false);
  const firebaseUid = useRoomStore(state => state.firebaseUid);
  
  const [isPersistent, setIsPersistent] = useState(false);
  const [customRoomId, setCustomRoomId] = useState('');

  const [showExpiredError, setShowExpiredError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    }
  }, []);

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputRoomId(e.target.value);
    if (error) setError('');
  };

  useEffect(() => {
    if (urlRoomId) {
      setInputRoomId(urlRoomId);
    }
  }, [urlRoomId]);

  useEffect(() => {
    if (profileName && (!nickname || nickname === authNickname)) {
      setNicknameInput(profileName);
    }
  }, [profileName]);

  const triggerIdentityError = () => {
    setMissingIdentity(true);
    setTimeout(() => setMissingIdentity(false), 500);
    setError('Please enter your identity above');
  };

  const handleCreateRoom = async () => {
    const trimmed = nickname.trim();
    if (!trimmed || trimmed.length < 2) {
      triggerIdentityError();
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
    
    if (isPersistent) {
      if (!customRoomId || customRoomId.length < 3) {
        setError('Custom link must be at least 3 characters');
        return;
      }
      if (!/^[a-z0-9-]+$/.test(customRoomId)) {
        setError('Custom link can only contain lowercase letters, numbers, and hyphens');
        return;
      }
    }
    
    setError('');
    setIsLoading(true);
    localStorage.setItem('syncwatch_nickname', trimmed);
    try {
      if (isPersistent) {
        const { app } = await import('../firebase');
        const { getFirestore, doc, setDoc, getDoc } = await import('firebase/firestore');
        const db = getFirestore(app);
        
        const docRef = doc(db, 'roomTemplates', customRoomId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data().hostId !== firebaseUid) {
          setError('This custom link is already taken.');
          setIsLoading(false);
          return;
        }

        await setDoc(docRef, {
          hostId: firebaseUid,
          controlPolicy: 'host_only',
          password: lockRoom ? pin : null,
          createdAt: Date.now()
        }, { merge: true });
        
        useRoomStore.getState().setRoomPassword(lockRoom ? pin : null);
        setRoomId(customRoomId);
        useRoomStore.getState().setNickname(trimmed);
        navigate(`/room/${customRoomId}/waiting`);
        return;
      }

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
      triggerIdentityError();
      setShowExpiredError(false);
      return;
    }
    let parsedCode = inputRoomId.trim();
    
    if (parsedCode.includes('/join/')) {
       parsedCode = parsedCode.split('/join/')[1].split('?')[0].split('/')[0];
    } else if (parsedCode.includes('/room/')) {
       parsedCode = parsedCode.split('/room/')[1].replace('/waiting', '').split('?')[0].split('/')[0];
    } else if (parsedCode.includes('/')) {
       const parts = parsedCode.split('/');
       parsedCode = parts[parts.length - 1];
    }
    
    if (parsedCode.length < 3) {
      setError('Room code or custom link must be at least 3 characters');
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
      let code = parsedCode;
      
      if (!requiresPin) {
        let res = await fetch(`${SERVER_URL}/api/rooms/${code}/exists`);
        if (!res.ok) throw new Error('Failed to check room');
        let data = await res.json();
        
        if (!data.exists && code.length === 6 && code !== code.toUpperCase()) {
          const upperCode = code.toUpperCase();
          const upperRes = await fetch(`${SERVER_URL}/api/rooms/${upperCode}/exists`);
          if (upperRes.ok) {
            const upperData = await upperRes.json();
            if (upperData.exists) {
              data = upperData;
              code = upperCode;
            }
          }
        }
        
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
        socket.emit(EVENTS.JOIN_ROOM, { roomId: code, nickname: trimmed, password: pin, avatarUrl: useRoomStore.getState().avatarUrl || undefined });
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
    <>
      <SEO title="Dashboard | SyncWatch" />
      <LazyMotion features={domAnimation}>
      <m.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="opacity-0 relative flex flex-col items-center justify-center min-h-screen overflow-x-hidden selection:bg-teal-500/30 bg-[#050505] p-4"
      >
        <AmbientBackground />
        
        <div className="w-full max-w-5xl mx-auto mt-24 tablet:mt-32 pb-12 grid grid-cols-1 tablet:grid-cols-3 tablet:grid-rows-2 gap-4 tablet:gap-6 relative z-10 px-4">
          
          {/* Widget 1: Profile & Identity */}
          <div className={cn(
            "col-span-1 bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/5 p-6 relative overflow-hidden group order-2 tablet:order-1 transition-all duration-300 shadow-[0_0_30px_rgba(0,0,0,0.5)]",
            missingIdentity ? "animate-[shake_0.5s_ease-in-out] border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "hover:border-white/10"
          )}>
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">Your Identity</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full bg-zinc-800 border border-white/10" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                    <span className="text-teal-400 font-bold text-lg">{nickname ? nickname[0].toUpperCase() : '?'}</span>
                  </div>
                )}
                <div className="flex-1">
                  <input 
                    id="nickname"
                    type="text"
                    value={nickname}
                    onChange={e => {
                      setNicknameInput(e.target.value);
                      if (error === 'Please enter your identity above') setError('');
                    }}
                    className="w-full bg-transparent text-white font-medium text-lg focus:outline-none placeholder:text-zinc-600"
                    placeholder="Enter nickname..."
                    maxLength={20}
                  />
                  <div className="h-[1px] w-full bg-white/10 mt-1" />
                </div>
              </div>
              <p className="text-xs text-zinc-500">This name will be visible to others in the room.</p>
            </div>
          </div>

          {/* Widget 2: Host Room (Hidden if urlRoomId) */}
          {!urlRoomId && (
            <div className="col-span-1 tablet:col-span-2 bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/5 p-6 relative overflow-hidden group order-3 tablet:order-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-white/10 transition-colors duration-300 flex flex-col">
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Host a Watch Party</h3>
              
              <div className="flex-1 flex flex-col gap-5">
                <div className="flex items-center justify-between">
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
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
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
                    </m.div>
                  )}
                </AnimatePresence>
                
                {firebaseUid && (
                  <>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2">
                        <Link2 size={16} className={isPersistent ? "text-teal-400" : "text-zinc-500"} />
                        <span className="text-sm font-medium text-zinc-300">Custom Permanent Link</span>
                      </div>
                      <button 
                        onClick={() => { setIsPersistent(!isPersistent); setError(''); }}
                        className={cn("w-10 h-5 rounded-full relative transition-colors shadow-inner", isPersistent ? "bg-teal-500" : "bg-zinc-800 border border-white/5")}
                      >
                        <div className={cn("w-4 h-4 rounded-full bg-white absolute top-[1px] transition-transform shadow-sm", isPersistent ? "translate-x-[22px]" : "translate-x-0.5")} />
                      </button>
                    </div>
                    
                    <AnimatePresence>
                      {isPersistent && (
                        <m.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/50 transition-all shadow-inner pl-4">
                            <span className="text-zinc-500 font-medium whitespace-nowrap text-sm">syncwatch.com/join/</span>
                            <input
                              type="text"
                              value={customRoomId}
                              onChange={e => {
                                setCustomRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                                setError('');
                              }}
                              className="w-full h-12 bg-transparent text-white font-mono placeholder:text-zinc-600 outline-none px-2 text-sm"
                              placeholder="my-room"
                            />
                          </div>
                        </m.div>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2">
                {error && !requiresPin && <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}
                <button 
                  onClick={() => { handleCreateRoom(); }}
                  disabled={isLoading}
                  className="w-full h-12 rounded-xl font-semibold transition-all duration-300 active:scale-[0.98] bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center text-base disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                >
                  Start New Room
                </button>
              </div>
            </div>
          )}

          {/* Widget 3: Quick Join (Expands if urlRoomId exists) */}
          <div className={cn(
            "bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/5 p-6 relative overflow-hidden group shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-white/10 transition-colors duration-300 flex flex-col",
            urlRoomId ? "col-span-1 tablet:col-span-2 order-1" : "col-span-1 tablet:col-span-2 order-4 tablet:order-4"
          )}>
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">
              {urlRoomId ? "You've been invited!" : "Quick Join"}
            </h3>
            
            <div className="flex-1 flex flex-col justify-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Paste Invite Link or Code"
                  value={inputRoomId}
                  onChange={handleRoomIdChange}
                  disabled={requiresPin}
                  className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono shadow-inner"
                />
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                  <Link2 className="w-4 h-4 text-zinc-500" />
                </div>
              </div>

              <AnimatePresence>
                {requiresPin && (
                  <m.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 mb-2 ml-1">
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
                  </m.div>
                )}
              </AnimatePresence>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              {error && <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}
              {showExpiredError && <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">This room has expired or does not exist.</div>}
              <button 
                onClick={() => { handleJoinRoom(); }}
                disabled={isLoading}
                className="w-full h-12 rounded-xl font-semibold transition-all duration-300 active:scale-[0.98] bg-zinc-800 border border-white/10 hover:bg-zinc-700 hover:border-white/20 text-white flex items-center justify-center text-base disabled:opacity-50"
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Widget 4: Network Status */}
          <div className="col-span-1 bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/5 p-6 relative overflow-hidden group order-5 tablet:order-3 flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:border-white/10 transition-colors duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">Systems</h3>
            
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className={cn(
                  "w-3 h-3 rounded-full relative",
                  isConnected ? "bg-green-500" : "bg-amber-500"
                )}>
                  <div className={cn(
                    "absolute inset-0 rounded-full animate-ping opacity-75",
                    isConnected ? "bg-green-400" : "bg-amber-400"
                  )} />
                </div>
                <span className={cn(
                  "text-xl font-bold tracking-tight",
                  isConnected ? "text-white" : "text-amber-100"
                )}>
                  {isConnected ? "Online" : "Connecting..."}
                </span>
              </div>
              <p className="text-sm text-zinc-500">
                {isConnected ? "WebRTC signaling server active. Global routing operational." : "Establishing secure socket connection to signaling server..."}
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
               <div className="flex justify-between items-center text-xs font-mono text-zinc-500">
                  <span>LATENCY</span>
                  <span className={isConnected ? "text-teal-400/80" : "text-amber-400/80"}>{isConnected ? "< 50ms" : "---"}</span>
               </div>
            </div>
          </div>

        </div>
      </m.div>
    </LazyMotion>
    </>
  );
}
