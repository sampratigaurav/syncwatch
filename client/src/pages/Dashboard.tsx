import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { SEO } from '../components/layout/SEO';
import { Link2, Lock, Unlock, Eye, EyeOff, ArrowUpRight, Ticket, Loader2 } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { SERVER_URL } from '../lib/config';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { m, LazyMotion, domAnimation, AnimatePresence, useReducedMotion } from 'framer-motion';
import './cinema.css';
import './counter.css';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function Dashboard() {

  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { roomId: urlRoomId } = useParams();
  const [searchParams] = useSearchParams();
  const mode = urlRoomId ? 'join' : searchParams.get('mode');
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
    };
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

  const widgetBase: React.CSSProperties = {
    background: 'var(--cinema-panel)',
    borderColor: 'var(--cinema-line)',
  };

  const inputBase: React.CSSProperties = {
    background: 'var(--counter-input)',
    borderColor: 'var(--cinema-line)',
    color: 'var(--cinema-ink)',
  };

  return (
    <>
      <SEO title="Dashboard | SyncWatch" />
      <LazyMotion features={domAnimation}>
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.35, ease: "easeOut" }}
          className="cinema-counter opacity-0 relative flex flex-col items-center min-h-screen overflow-x-hidden selection:bg-teal-500/30 p-4"
        >
          <div className="counter-heading">
            <p className="cinema-kicker"><Ticket size={15} aria-hidden="true" /> THE TICKET COUNTER</p>
            <h1>
              {mode === 'join' ? 'Join the party' : mode === 'create' ? 'Host movie night' : 'Your next movie night'}
            </h1>
            <p className="counter-intro">{mode === 'join' ? 'Your friends have the room. Bring your name and the invite.' : 'Set up your room, send an invite, and settle in.'}</p>
            {!urlRoomId && (
              <nav className="counter-mode-switch" aria-label="Room actions">
                <Link to="/dashboard?mode=create" className={cn('cinema-button', mode === 'create' ? 'cinema-button-primary' : 'cinema-button-secondary')} aria-current={mode === 'create' ? 'page' : undefined}>Create a room</Link>
                <Link to="/dashboard?mode=join" className={cn('cinema-button', mode === 'join' ? 'cinema-button-primary' : 'cinema-button-secondary')} aria-current={mode === 'join' ? 'page' : undefined}>Join with a code</Link>
              </nav>
            )}
          </div>

          <div className="counter-grid">

            {/* ── Widget 1: Profile & Identity ─────────────────────────── */}
            <div
              className={cn(
                "cinema-counter-panel counter-identity col-span-1 rounded-3xl border p-6 relative overflow-hidden group order-1 transition-all duration-300",
                missingIdentity ? "animate-[shake_0.5s_ease-in-out]" : ""
              )}
              style={{
                ...widgetBase,
                boxShadow: missingIdentity
                  ? '0 0 20px rgba(239,68,68,0.25), inset 0 0 0 1px rgba(239,68,68,0.4)'
                  : '0 0 30px rgba(0,0,0,0.18)',
                borderColor: missingIdentity ? '#f28787' : 'var(--cinema-line)',
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
              <div className="counter-identity-heading"><span>01 / YOUR SEAT</span><Ticket size={20} aria-hidden="true" /></div>
              <h2 className="counter-card-title">What should we call you?</h2>
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-12 h-12 rounded-full border" style={{ borderColor: 'var(--sw-border)' }} />
                  ) : (
                    <div className="w-12 h-12 rounded-full counter-avatar border flex items-center justify-center">
                      <span className="font-bold text-lg">{nickname ? nickname[0].toUpperCase() : '?'}</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      id="nickname"
                      aria-label="Your nickname"
                      type="text"
                      value={nickname}
                      onChange={e => {
                        setNicknameInput(e.target.value);
                        if (error === 'Please enter your identity above') setError('');
                      }}
                      className="w-full bg-transparent font-medium text-lg focus:outline-none"
                      style={{ color: 'var(--sw-text-primary)', caretColor: 'var(--sw-accent)' }}
                      placeholder="Enter nickname..."
                      maxLength={20}
                    />
                    <div className="h-[1px] w-full mt-1" style={{ background: 'var(--sw-border-hover)' }} />
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--sw-text-muted)' }}>Your friends will see this name in the room.</p>
              </div>
            </div>

            {/* ── Widget 2: Host Room ───────────────────────────────────── */}
            {mode !== 'join' && (
              <div
                data-counter="create"
                className="cinema-counter-panel col-span-1 tablet:col-span-2 rounded-3xl border p-6 relative overflow-hidden group order-3 tablet:order-2 transition-colors duration-300 flex flex-col"
                style={{ ...widgetBase, boxShadow: '0 0 30px rgba(0,0,0,0.18)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
                <div className="counter-card-banner">
                  <div><span>02 / HOST A WATCH PARTY</span><h2>Your room. Your crew.</h2><p>Create a room, then share the invite.</p></div>
                  <div className="counter-mascot cinema-object cinema-object-projector" aria-hidden="true"><i /><i /><i /></div>
                </div>

                <div className="flex-1 flex flex-col gap-5">
                  {/* Lock with PIN toggle */}
                  <div className="counter-option flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {lockRoom
                        ? <Lock size={16} className="text-teal-500" />
                        : <Unlock size={16} style={{ color: 'var(--sw-text-muted)' }} />}
                      <span className="text-sm font-medium" style={{ color: 'var(--sw-text-secondary)' }}>Lock with PIN</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={lockRoom}
                      aria-label="Lock with PIN"
                      title="Lock with PIN"
                      onClick={() => { setLockRoom(!lockRoom); setError(''); }}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-colors shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                        lockRoom ? "bg-teal-500" : ""
                      )}
                      style={lockRoom ? {} : { background: 'var(--sw-surface-hover)', border: '1px solid var(--sw-border)' }}
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
                            className="w-full h-12 border rounded-xl pl-4 pr-12 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all shadow-inner"
                            style={{ ...inputBase, caretColor: 'var(--sw-accent)' }}
                            aria-label="Room PIN"
                            placeholder="4-8 char PIN"
                          />
                          <button
                            type="button"
                            aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                            style={{ color: 'var(--sw-text-muted)' }}
                          >
                            {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </m.div>
                    )}
                  </AnimatePresence>

                  {/* Custom Permanent Link toggle (logged in only) */}
                  {firebaseUid && (
                    <>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-2">
                          <Link2 size={16} className={isPersistent ? "text-teal-500" : ""} style={isPersistent ? {} : { color: 'var(--sw-text-muted)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--sw-text-secondary)' }}>Custom Permanent Link</span>
                        </div>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={isPersistent}
                          aria-label="Custom Permanent Link"
                          title="Custom Permanent Link"
                          onClick={() => { setIsPersistent(!isPersistent); setError(''); }}
                          className={cn(
                            "w-10 h-5 rounded-full relative transition-colors shadow-inner focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                            isPersistent ? "bg-teal-500" : ""
                          )}
                          style={isPersistent ? {} : { background: 'var(--sw-surface-hover)', border: '1px solid var(--sw-border)' }}
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
                            <div
                              className="flex items-center border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/50 transition-all shadow-inner pl-4"
                              style={{ ...inputBase }}
                            >
                              <span className="font-medium whitespace-nowrap text-sm" style={{ color: 'var(--sw-text-muted)' }}>syncwatch.com/join/</span>
                              <input
                                type="text"
                                value={customRoomId}
                                onChange={e => {
                                  setCustomRoomId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                                  setError('');
                                }}
                                className="w-full h-12 bg-transparent font-mono outline-none px-2 text-sm"
                                style={{ color: 'var(--sw-text-primary)', caretColor: 'var(--sw-accent)' }}
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
                  {error && !requiresPin && (
                    <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>
                  )}
                  <button
                    onClick={() => { handleCreateRoom(); }}
                    disabled={isLoading}
                    className="counter-submit"
                  >
                    {isLoading ? <><Loader2 size={18} className="counter-loading" aria-hidden="true" /> Creating room…</> : <>Create my room <ArrowUpRight size={18} aria-hidden="true" /></>}
                  </button>
                </div>
              </div>
            )}

            {/* ── Widget 3: Quick Join ──────────────────────────────────── */}
            {mode !== 'create' && (
            <div
              data-counter="join"
              className={cn(
                "cinema-counter-panel rounded-3xl border p-6 relative overflow-hidden group transition-colors duration-300 flex flex-col",
                urlRoomId ? "col-span-1 tablet:col-span-2 order-2" : "col-span-1 tablet:col-span-2 order-4 tablet:order-4"
              )}
              style={{ ...widgetBase, boxShadow: '0 0 30px rgba(0,0,0,0.18)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none rounded-3xl" />
              <div className="counter-card-banner">
                <div><span>02 / JOIN A WATCH PARTY</span><h2>{urlRoomId ? "You're invited." : 'Your seat is waiting.'}</h2><p>Paste the link or room code your friend shared.</p></div>
                <div className="counter-mascot cinema-object cinema-object-screens" aria-hidden="true"><i /><i /><i /></div>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-4">
                <label className="counter-field-label" htmlFor="invite-code">Invite link or room code</label>
                <div className="relative">
                  <input
                    type="text"
                    id="invite-code"
                    aria-label="Invite link or room code"
                    placeholder="Paste Invite Link or Code"
                    value={inputRoomId}
                    onChange={handleRoomIdChange}
                    disabled={requiresPin}
                    className="w-full h-12 border rounded-xl px-4 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all shadow-inner disabled:opacity-50"
                    style={{ ...inputBase, caretColor: 'var(--sw-accent)' }}
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <Link2 className="w-4 h-4" style={{ color: 'var(--sw-text-muted)' }} />
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
                        <Lock size={14} className="text-teal-500" />
                        <span className="text-sm font-medium" style={{ color: 'var(--sw-text-secondary)' }}>Room is locked</span>
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
                          className="w-full h-12 border rounded-xl pl-4 pr-12 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all shadow-inner"
                          style={{ ...inputBase, caretColor: 'var(--sw-accent)' }}
                          aria-label="Room PIN"
                          placeholder="Enter PIN"
                        />
                        <button
                          type="button"
                          aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                            onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors"
                          style={{ color: 'var(--sw-text-muted)' }}
                        >
                          {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                {error && (
                  <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>
                )}
                {showExpiredError && (
                  <div className="text-red-400 text-xs font-medium text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">This room has expired or does not exist.</div>
                )}
                <button
                  onClick={() => { handleJoinRoom(); }}
                  disabled={isLoading}
                  className="counter-submit"
                >
                  {isLoading ? <><Loader2 size={18} className="counter-loading" aria-hidden="true" /> Joining room…</> : <>Join the room <ArrowUpRight size={18} aria-hidden="true" /></>}
                </button>
              </div>
            </div>
            )}

            <div className="counter-connection" role="status">
              <span className="counter-connection-dot" data-connected={isConnected} aria-hidden="true" />
              <span>{isConnected ? 'Connected and ready' : 'Connecting to SyncWatch…'}</span>
              <span className="counter-connection-hint">{isConnected ? 'Invite your friends when your room is ready.' : 'Room connection will be ready when the server responds.'}</span>
            </div>

          </div>
        </m.div>
      </LazyMotion>
    </>
  );
}
