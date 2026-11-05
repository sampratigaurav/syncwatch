import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Trash2, Key, Check, Link2, Ticket, Loader2, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useRoomStore } from '../../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { SERVER_URL } from '../../lib/config';
import { toast } from 'sonner';
import { socket } from '../../hooks/useSocket';
import './profile.css';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoomTemplate {
  id: string;
  createdAt: number;
  password?: string | null;
}

const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Oliver', 'Scooter', 'Gizmo', 'Bandit',
  'Whiskers', 'Luna', 'Cleo', 'Buster', 'Tiger', 'Simba'
];
const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=transparent`;

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { firebaseUid, authToken, nickname, profileName, avatarUrl, setProfileName, setAvatarUrl } = useRoomStore(useShallow(state => ({
    firebaseUid: state.firebaseUid,
    authToken: state.authToken,
    nickname: state.nickname,
    profileName: state.profileName,
    avatarUrl: state.avatarUrl,
    setProfileName: state.setProfileName,
    setAvatarUrl: state.setAvatarUrl
  })));
  const [rooms, setRooms] = useState<RoomTemplate[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState<string | null>(null);
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPinEdit, setShowPinEdit] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');
  const [pendingRoom, setPendingRoom] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const duration = reducedMotion ? 0 : 0.24;
  const hasChanges = editName.trim() !== (profileName || nickname || '') || editAvatar !== avatarUrl;

  const fetchRooms = useCallback(async (signal?: AbortSignal) => {
    if (!firebaseUid || !authToken) return;
    setIsLoadingRooms(true);
    setRoomsError(false);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/my-rooms`, {
        headers: { Authorization: `Bearer ${authToken}` },
        signal
      });
      if (!res.ok) throw new Error('Failed to fetch rooms');
      const data = await res.json();
      setRooms((data.rooms as RoomTemplate[]).sort((a, b) => b.createdAt - a.createdAt));
    } catch {
      if (!signal?.aborted) setRoomsError(true);
    } finally {
      if (!signal?.aborted) setIsLoadingRooms(false);
    }
  }, [firebaseUid, authToken]);

  useEffect(() => {
    if (!isOpen) return;
    const current = useRoomStore.getState();
    setEditName(current.profileName || current.nickname || '');
    setEditAvatar(current.avatarUrl);
    setSaved(false);
    setShowPinEdit(null);
    setNewPin('');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    void fetchRooms(controller.signal);
    return () => controller.abort();
  }, [isOpen, fetchRooms]);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]'
      ) || []).filter(control => control.getClientRects().length > 0);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeys, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeys, true);
      previousFocus?.focus();
    };
  }, [isOpen, onClose]);

  const handleSaveIdentity = async () => {
    const targetName = editName.trim();
    if (!firebaseUid || isSavingIdentity || !targetName) return;
    setIsSavingIdentity(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/users/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ displayName: targetName, avatarUrl: editAvatar })
      });
      if (!res.ok) throw new Error('Failed to update profile');
      setProfileName(targetName);
      setAvatarUrl(editAvatar);
      socket.emit('profile_updated', { displayName: targetName, avatarUrl: editAvatar });
      setSaved(true);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (pendingRoom || !confirm(`Delete ${roomId}? This permanently removes the room and disconnects anyone inside.`)) return;
    setPendingRoom(roomId);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` }
      });
      if (!res.ok) throw new Error('Failed to delete room');
      setRooms(current => current.filter(room => room.id !== roomId));
      toast.success('Room deleted');
    } catch {
      toast.error('Failed to delete room');
    } finally {
      setPendingRoom(null);
    }
  };

  const handleUpdatePin = async (roomId: string) => {
    if (pendingRoom) return;
    if (newPin && !/^[a-zA-Z0-9]{4,8}$/.test(newPin)) {
      toast.error('PIN must be 4-8 alphanumeric characters');
      return;
    }
    setPendingRoom(roomId);
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${encodeURIComponent(roomId)}/pin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ password: newPin || null })
      });
      if (!res.ok) throw new Error('Failed to update PIN');
      toast.success(newPin ? 'PIN updated' : 'PIN removed');
      setShowPinEdit(null);
      setNewPin('');
      void fetchRooms();
    } catch {
      toast.error('Failed to update PIN');
    } finally {
      setPendingRoom(null);
    }
  };

  const copyLink = async (roomId: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/join/${encodeURIComponent(roomId)}`);
      toast.success('Invite link copied');
    } catch {
      toast.error('Could not copy the link. Please try again.');
    }
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <m.div className="profile-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration }}
          onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
          <m.div ref={panelRef} className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-title"
            initial={reducedMotion ? false : { scale: 0.96, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: reducedMotion ? 1 : 0.98, opacity: 0, y: reducedMotion ? 0 : 12 }}
            transition={{ duration, ease: [0.2, 0.8, 0.3, 1] }}>
            <header className="profile-header">
              <div><span className="profile-eyebrow"><Ticket size={14} aria-hidden="true" /> YOUR CLUB PASS</span><h2 id="profile-title">My Profile</h2></div>
              <button ref={closeRef} onClick={onClose} aria-label="Close profile modal" className="profile-icon"><X size={20} /></button>
            </header>
            <div className="profile-body">
              <section className="profile-identity" aria-labelledby="profile-identity-title">
                <div className="profile-pass">
                  <div className="profile-pass-avatar">
                    {editAvatar ? <img src={editAvatar} alt="" /> : <span>{(editName.trim()[0] || '?').toUpperCase()}</span>}
                  </div>
                  <div><span className="profile-eyebrow">ADMIT ONE GOOD FRIEND</span><strong>{editName.trim() || 'Your name here'}</strong><span className="profile-pass-note">Ready for movie night</span></div>
                  <span className="profile-pass-star" aria-hidden="true">✦</span>
                </div>
                <form onSubmit={event => { event.preventDefault(); void handleSaveIdentity(); }}>
                  <h3 id="profile-identity-title">Make yourself at home</h3>
                  <label htmlFor="profile-name">Display name</label>
                  <input id="profile-name" value={editName} maxLength={50} required disabled={isSavingIdentity}
                    onChange={event => { setEditName(event.target.value); setSaved(false); }} placeholder="What should your friends call you?" />
                  <fieldset disabled={isSavingIdentity} className="profile-avatars">
                    <legend>Pick your movie-night face</legend>
                    <div className="profile-avatar-grid">
                      {AVATAR_SEEDS.map(seed => {
                        const url = getAvatarUrl(seed);
                        return (
                          <button key={seed} type="button" onClick={() => { setEditAvatar(url); setSaved(false); }}
                            aria-label={`Select avatar ${seed}`} aria-pressed={editAvatar === url} className="profile-avatar" title={seed}>
                            <img src={url} alt="" loading="lazy" />
                            {editAvatar === url && <span className="profile-avatar-check"><Check size={12} aria-hidden="true" /></span>}
                          </button>
                        );
                      })}
                    </div>
                    <p className="profile-credit">Avatars by DiceBear</p>
                  </fieldset>
                  <button type="submit" className="profile-save" disabled={isSavingIdentity || !hasChanges || !editName.trim()}>
                    {isSavingIdentity ? <><Loader2 size={17} className="profile-spinner" /> Saving…</> : saved ? <><Check size={17} /> Saved</> : <>Save my profile <ArrowUpRight size={17} /></>}
                  </button>
                  <p className="profile-save-note">Name and avatar are saved together.</p>
                </form>
              </section>
              <section className="profile-rooms" aria-labelledby="profile-rooms-title">
                <div className="profile-rooms-heading"><h3 id="profile-rooms-title"><Ticket size={19} aria-hidden="true" /> Permanent rooms</h3><span>{isLoadingRooms || roomsError ? '—' : rooms.length}</span></div>
                <p className="profile-room-intro">Your regular spots for watching together.</p>
                <div className="profile-room-list" aria-busy={isLoadingRooms}>
                  {isLoadingRooms ? <div className="profile-room-placeholder"><Loader2 className="profile-spinner" size={22} /><p>Finding your rooms…</p></div>
                    : roomsError ? <div className="profile-room-placeholder"><p>Your rooms couldn’t be loaded.</p><button className="profile-retry" onClick={() => void fetchRooms()}><RefreshCw size={15} /> Try again</button></div>
                    : rooms.length === 0 ? <div className="profile-room-placeholder"><Ticket size={38} /><p>No permanent rooms yet.</p><span>Create a room with a custom link to keep it here.</span></div>
                    : rooms.map(room => (
                      <article key={room.id} className="profile-room-ticket">
                        <div className="profile-room-main"><span className="profile-eyebrow">YOUR ROOM</span><h4>{room.id}</h4><p>Created {new Date(room.createdAt).toLocaleDateString()}</p></div>
                        <div className="profile-room-actions">
                          <button className="profile-icon" onClick={() => void copyLink(room.id)} aria-label={`Copy link for room ${room.id}`} title="Copy invite"><Link2 size={16} /></button>
                          <button className="profile-icon" disabled={!!pendingRoom} onClick={() => { setShowPinEdit(showPinEdit === room.id ? null : room.id); setNewPin(''); }}
                            aria-label={`Change PIN for room ${room.id}`} aria-expanded={showPinEdit === room.id} aria-controls={`pin-edit-${room.id}`} title="Change PIN"><Key size={16} /></button>
                          <button className="profile-icon profile-delete" disabled={!!pendingRoom} onClick={() => void handleDeleteRoom(room.id)} aria-label={`Delete room ${room.id}`} title="Delete room"><Trash2 size={16} /></button>
                        </div>
                        <AnimatePresence initial={false}>
                          {showPinEdit === room.id && (
                            <m.form id={`pin-edit-${room.id}`} className="profile-pin-form"
                              initial={{ opacity: 0, height: reducedMotion ? 'auto' : 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: reducedMotion ? 'auto' : 0 }} transition={{ duration }}
                              onSubmit={event => { event.preventDefault(); void handleUpdatePin(room.id); }}>
                              <label htmlFor={`room-pin-${room.id}`}>New PIN <span>Leave empty to remove the PIN.</span></label>
                              <div><input id={`room-pin-${room.id}`} type="password" maxLength={8} disabled={!!pendingRoom} value={newPin} onChange={event => setNewPin(event.target.value.replace(/[^a-zA-Z0-9]/g, ''))} placeholder="4–8 letters or numbers" /><button disabled={!!pendingRoom} type="submit">{pendingRoom === room.id ? 'Saving…' : 'Save PIN'}</button></div>
                            </m.form>
                          )}
                        </AnimatePresence>
                      </article>
                    ))}
                </div>
              </section>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>, document.body
  );
}
