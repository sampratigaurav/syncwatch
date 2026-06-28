import { useState, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Trash2, Key, Check, Link2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { SERVER_URL } from '../lib/config';
import toast from 'react-hot-toast';
import { app } from '../firebase';
import { getFirestore, collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { socket } from '../hooks/useSocket';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RoomTemplate {
  id: string;
  hostId: string;
  createdAt: number;
  controlPolicy: string;
  password?: string | null;
}

// 12 Curated DiceBear Seeds for bottts style
const AVATAR_SEEDS = [
  'Felix', 'Aneka', 'Oliver', 'Scooter', 'Gizmo', 'Bandit',
  'Whiskers', 'Luna', 'Cleo', 'Buster', 'Tiger', 'Simba'
];

const getAvatarUrl = (seed: string) => `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=transparent`;

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { firebaseUid, authToken, nickname, avatarUrl, setNickname, setAvatarUrl } = useRoomStore(useShallow(state => ({
    firebaseUid: state.firebaseUid,
    authToken: state.authToken,
    nickname: state.nickname,
    avatarUrl: state.avatarUrl,
    setNickname: state.setNickname,
    setAvatarUrl: state.setAvatarUrl
  })));
  const [rooms, setRooms] = useState<RoomTemplate[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [editName, setEditName] = useState(nickname || '');
  const [isSavingIdentity, setIsSavingIdentity] = useState(false);
  const [showPinEdit, setShowPinEdit] = useState<string | null>(null);
  const [newPin, setNewPin] = useState('');

  useEffect(() => {
    if (isOpen && firebaseUid) {
      setEditName(nickname || '');
      fetchRooms();
    }
  }, [isOpen, firebaseUid, nickname]);

  const fetchRooms = async () => {
    if (!firebaseUid) return;
    setIsLoadingRooms(true);
    try {
      const db = getFirestore(app);
      const q = query(collection(db, 'roomTemplates'), where('hostId', '==', firebaseUid));
      const querySnapshot = await getDocs(q);
      const fetchedRooms: RoomTemplate[] = [];
      querySnapshot.forEach((doc) => {
        fetchedRooms.push({ id: doc.id, ...doc.data() } as RoomTemplate);
      });
      // Sort by newest first
      fetchedRooms.sort((a, b) => b.createdAt - a.createdAt);
      setRooms(fetchedRooms);
    } catch (err) {
      console.error('Failed to fetch rooms', err);
      toast.error('Failed to load your rooms');
    } finally {
      setIsLoadingRooms(false);
    }
  };

  const handleSaveIdentity = async (newAvatarUrl?: string) => {
    if (!firebaseUid) return;
    setIsSavingIdentity(true);
    try {
      const targetName = editName.trim() || nickname;
      const targetAvatar = newAvatarUrl !== undefined ? newAvatarUrl : avatarUrl;
      
      const db = getFirestore(app);
      await setDoc(doc(db, 'users', firebaseUid), {
        displayName: targetName,
        avatarUrl: targetAvatar
      }, { merge: true });

      setNickname(targetName);
      setAvatarUrl(targetAvatar);
      
      // Sync to live rooms
      socket.emit('profile_updated', {
        displayName: targetName,
        avatarUrl: targetAvatar
      });
      
      if (newAvatarUrl === undefined) {
        toast.success('Profile updated');
      }
    } catch (err) {
      toast.error('Failed to update profile');
    } finally {
      setIsSavingIdentity(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm(`Are you sure you want to delete ${roomId}? This will permanently remove the room and kick anyone inside.`)) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to delete room');
      toast.success('Room deleted successfully');
      setRooms(rooms.filter(r => r.id !== roomId));
    } catch (err) {
      toast.error('Failed to delete room');
    }
  };

  const handleUpdatePin = async (roomId: string) => {
    if (newPin && !/^[a-zA-Z0-9]{4,8}$/.test(newPin)) {
      toast.error('PIN must be 4-8 alphanumeric characters');
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/rooms/${roomId}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ password: newPin || null })
      });
      if (!res.ok) throw new Error('Failed to update PIN');
      toast.success(newPin ? 'PIN updated securely' : 'PIN removed');
      setShowPinEdit(null);
      setNewPin('');
      fetchRooms(); // refresh to get updated state (or just update local state)
    } catch (err) {
      toast.error('Failed to update PIN');
    }
  };

  const copyLink = (roomId: string) => {
    const url = `${window.location.origin}/room/${roomId}/waiting`;
    navigator.clipboard.writeText(url);
    toast.success('Room link copied!');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      >
        <m.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <UserIcon className="w-6 h-6 text-teal-400" />
              My Profile
            </h2>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar flex flex-col md:flex-row gap-8">
            
            {/* Left Column: Identity */}
            <div className="flex-1 space-y-6">
              <h3 className="text-lg font-semibold text-white/90 mb-4">Identity</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Display Name</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
                      placeholder="Your display name"
                    />
                    <button
                      onClick={() => handleSaveIdentity()}
                      disabled={isSavingIdentity || editName === nickname}
                      className="px-6 bg-teal-500 hover:bg-teal-400 text-black font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isSavingIdentity ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-3">Choose Avatar</label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {AVATAR_SEEDS.map((seed) => {
                      const url = getAvatarUrl(seed);
                      const isSelected = avatarUrl === url;
                      return (
                        <button
                          key={seed}
                          onClick={() => handleSaveIdentity(url)}
                          className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all group ${
                            isSelected ? 'border-teal-400 scale-105' : 'border-transparent bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <img src={url} alt={seed} className="w-full h-full object-cover p-2" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                              <Check className="w-6 h-6 text-teal-400" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-zinc-500 mt-3 text-center">Avatars generated by DiceBear</p>
                </div>
              </div>
            </div>

            {/* Right Column: Room Hub */}
            <div className="flex-1 space-y-6">
              <h3 className="text-lg font-semibold text-white/90 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-400" />
                Permanent Rooms
              </h3>
              
              <div className="space-y-3">
                {isLoadingRooms ? (
                  <div className="text-center py-8 text-zinc-500 animate-pulse">Loading rooms...</div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-12 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-zinc-400">You don't have any permanent rooms yet.</p>
                  </div>
                ) : (
                  rooms.map((room) => (
                    <div key={room.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-mono text-teal-400 text-lg">{room.id}</h4>
                          <p className="text-xs text-zinc-500">Created {new Date(room.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyLink(room.id)}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="Copy Room Link"
                          >
                            <Link2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowPinEdit(showPinEdit === room.id ? null : room.id)}
                            className="p-2 text-zinc-400 hover:text-indigo-400 hover:bg-white/10 rounded-lg transition-colors"
                            title="Change PIN"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(room.id)}
                            className="p-2 text-zinc-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {showPinEdit === room.id && (
                        <m.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-3 border-t border-white/5 flex gap-2"
                        >
                          <input
                            type="text"
                            placeholder={room.password ? 'Enter new PIN...' : 'Add a PIN...'}
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                            maxLength={8}
                            className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleUpdatePin(room.id)}
                            className="px-4 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 font-medium rounded-lg text-sm transition-colors"
                          >
                            Save
                          </button>
                        </m.div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </m.div>
      </m.div>
    </AnimatePresence>
  );
}
