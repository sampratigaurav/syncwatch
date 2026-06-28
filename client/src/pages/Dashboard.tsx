import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
    <div 
      className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] max-w-[800px] max-h-[800px] bg-teal-900/30 rounded-full blur-[120px] mix-blend-screen animate-orb-1" 
    />
    <div 
      className="absolute bottom-[-20%] right-[-10%] w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] bg-slate-800/40 rounded-full blur-[150px] mix-blend-screen animate-orb-2" 
    />
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { roomId: urlRoomId } = useParams();
  const { setRoomId, nickname: authNickname } = useRoomStore(useShallow(state => ({
    setRoomId: state.setRoomId,
    nickname: state.nickname
  })));

  const savedNickname = localStorage.getItem('syncwatch_nickname') || authNickname || '';
  const [nickname, setNicknameInput] = useState(savedNickname);
  const [inputRoomId, setInputRoomId] = useState(urlRoomId || '');
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(urlRoomId ? 'join' : 'create');
  const [error, setError] = useState('');
  
  const [lockRoom, setLockRoom] = useState(false);
  const [pin, setPin] = useState('');
  const [requiresPin, setRequiresPin] = useState(false);
  const firebaseUid = useRoomStore(state => state.firebaseUid);
  
  const [isPersistent, setIsPersistent] = useState(false);
  const [customRoomId, setCustomRoomId] = useState('');

  const [showExpiredError, setShowExpiredError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handleRoomIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputRoomId(e.target.value);
    if (error) setError('');
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
      setError('Please enter a nickname to continue');
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
    
    if (parsedCode.length < 6) {
      setError('Room code or custom link must be at least 6 characters');
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
        className="opacity-0 relative flex flex-col items-center justify-center min-h-screen overflow-x-hidden selection:bg-teal-500/30 bg-[#050505] p-4"
      >
        <AmbientBackground />
        
        <div className="w-full max-w-[440px] bg-zinc-900/40 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] p-6 tablet:p-8 relative z-10 overflow-hidden mt-8 tablet:mt-0">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-6">
            {urlRoomId && (
              <div className="text-center pb-2 border-b border-white/5">
                <h2 className="text-xl font-bold text-white tracking-tight">You've been invited!</h2>
                <p className="text-sm text-zinc-400 mt-1">Join room <span className="text-teal-400 font-mono">{urlRoomId}</span></p>
              </div>
            )}
            
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

            <div className="bg-black/40 p-1 rounded-xl flex items-center border border-white/5 relative">
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
                    
                    {firebaseUid && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-1">
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
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 4 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="overflow-hidden"
                          >
                              <div className="flex items-center bg-black/40 border border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/50 transition-all shadow-inner pl-4">
                                <span className="text-zinc-500 font-medium whitespace-nowrap text-sm">syncwatch.com/join/</span>
                                <input
                                  aria-label="Custom Room ID"
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
                      </div>
                    )}
                    
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
                        <label htmlFor="roomCode" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider ml-1">Room Code or Invite Link</label>
                        <div className="relative">
                          <input
                            id="roomCode"
                            type="text"
                            placeholder="e.g. AB1234 or my-room-name"
                            value={inputRoomId}
                            onChange={handleRoomIdChange}
                            disabled={requiresPin}
                            className="w-full h-12 bg-black/40 border border-white/10 rounded-xl px-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all font-mono"
                          />
                          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                            <Link2 className="w-4 h-4 text-zinc-500" />
                          </div>
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
      </m.div>
    </LazyMotion>
  );
}
