import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { Users, X, UserPlus, Check, Clock, Copy, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVER_URL } from '../lib/config';

interface FriendProfile {
  displayName: string;
  avatarUrl: string | null;
  friendCode: string;
}

interface FriendshipEdge {
  id: string;
  participants: string[];
  status: 'pending' | 'accepted';
  requesterId: string;
  profiles: Record<string, FriendProfile>;
}

export const FriendsSidebar = () => {
  const { firebaseUid, authToken, friendCode } = useRoomStore();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  
  const [friends, setFriends] = useState<(FriendshipEdge & { status: 'online' | 'offline' | 'away' })[]>([]);
  const [incomingReqs, setIncomingReqs] = useState<FriendshipEdge[]>([]);
  const [outgoingReqs, setOutgoingReqs] = useState<FriendshipEdge[]>([]);
  
  const [addFriendCode, setAddFriendCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!firebaseUid) {
      setFriends([]);
      setIncomingReqs([]);
      setOutgoingReqs([]);
      return;
    }

    const loadFriends = async () => {
      const { app } = await import('../firebase');
      const db = getFirestore(app);
      const rtdb = getDatabase(app);

      const q = query(collection(db, 'friendships'), where('participants', 'array-contains', firebaseUid));
      
      let rtdbUnsubs: (() => void)[] = [];

      const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const edges: FriendshipEdge[] = [];
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data() as FriendshipEdge;
            // Real-time toast for new incoming requests
            if (data.status === 'pending' && data.requesterId !== firebaseUid) {
              const requesterProfile = data.profiles[data.requesterId];
              toast(`New friend request from ${requesterProfile?.displayName || 'Someone'}!`, {
                icon: '👋',
                duration: 5000,
              });
            }
          }
        });

        snapshot.forEach((doc) => {
          edges.push({ id: doc.id, ...doc.data() } as FriendshipEdge);
        });

        const accepted = edges.filter(e => e.status === 'accepted');
        const incoming = edges.filter(e => e.status === 'pending' && e.requesterId !== firebaseUid);
        const outgoing = edges.filter(e => e.status === 'pending' && e.requesterId === firebaseUid);

        setIncomingReqs(incoming);
        setOutgoingReqs(outgoing);

        // Clean up old RTDB listeners
        rtdbUnsubs.forEach(unsub => unsub());
        rtdbUnsubs = [];

        // Set up presence listeners for accepted friends
        const friendsWithPresence = accepted.map(edge => ({ ...edge, status: 'offline' as const }));
        setFriends(friendsWithPresence);

        friendsWithPresence.forEach(edge => {
          const friendUid = edge.participants.find(p => p !== firebaseUid);
          if (!friendUid) return;

          const statusRef = ref(rtdb, `/status/${friendUid}`);
          const unsub = onValue(statusRef, (presenceSnap) => {
            const val = presenceSnap.val();
            const state = val?.state || 'offline';
            setFriends(prev => prev.map(f => f.id === edge.id ? { ...f, status: state } : f));
          });
          rtdbUnsubs.push(unsub);
        });
      });

      return () => {
        unsubscribeFirestore();
        rtdbUnsubs.forEach(unsub => unsub());
      };
    };

    const cleanupPromise = loadFriends();
    return () => {
      cleanupPromise.then(cleanup => cleanup && cleanup());
    };
  }, [firebaseUid]);

  const handleSendRequest = async () => {
    if (!addFriendCode || !authToken) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/friends/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ friendCode: addFriendCode.trim().toUpperCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send request');
      
      setAddFriendCode('');
      toast.success(data.message || 'Friend request sent!');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptRequest = async (targetUid: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/friends/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ targetUid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to accept');
      toast.success('Friend added!');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleRemoveFriend = async (targetUid: string) => {
    if (!authToken) return;
    try {
      const res = await fetch(`${SERVER_URL}/api/friends/${targetUid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove');
      toast.success('Removed successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const copyMyCode = () => {
    if (friendCode) {
      navigator.clipboard.writeText(friendCode);
      toast.success('Friend Code copied!');
    }
  };

  if (!firebaseUid) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-teal-600 hover:bg-teal-500 text-white rounded-full shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all z-40 hover:scale-105"
      >
        <div className="relative">
          <Users size={24} />
          {incomingReqs.length > 0 && (
            <div className="absolute -top-2 -right-2 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-teal-600" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-sm h-full bg-[#0a0a0a] border-l border-white/10 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="p-6 pb-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-teal-500" />
                    Friends
                  </h2>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="Enter Friend Code (e.g. A8X2-94P1)"
                    value={addFriendCode}
                    onChange={e => setAddFriendCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors uppercase placeholder:normal-case"
                  />
                  <button 
                    onClick={handleSendRequest}
                    disabled={isSubmitting || !addFriendCode}
                    className="p-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <UserPlus size={18} />
                  </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/5 mb-4">
                  <button 
                    onClick={() => setActiveTab('friends')}
                    className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'friends' ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Friends ({friends.length})
                    {activeTab === 'friends' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-t-full" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className={`pb-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'requests' ? 'text-teal-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Requests
                    {incomingReqs.length > 0 && (
                      <span className="bg-teal-500/20 text-teal-400 text-[10px] px-1.5 py-0.5 rounded-full">{incomingReqs.length}</span>
                    )}
                    {activeTab === 'requests' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-400 rounded-t-full" />}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                
                {/* My Code Banner */}
                <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3 flex items-center justify-between mb-4 group cursor-pointer hover:bg-teal-500/20 transition-colors" onClick={copyMyCode}>
                  <div>
                    <div className="text-xs text-teal-500/70 font-semibold uppercase tracking-wider mb-0.5">My Friend Code</div>
                    <div className="text-sm text-teal-400 font-mono tracking-widest">{friendCode || 'Loading...'}</div>
                  </div>
                  <Copy size={16} className="text-teal-500 opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Friends Tab */}
                {activeTab === 'friends' && (
                  <div className="flex flex-col gap-2">
                    {friends.length === 0 ? (
                      <div className="text-sm text-zinc-500 text-center py-8">
                        No friends yet. Add someone using their code!
                      </div>
                    ) : (
                      friends.map(edge => {
                        const friendUid = edge.participants.find(p => p !== firebaseUid)!;
                        const profile = edge.profiles[friendUid];
                        return (
                          <div key={edge.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                {profile?.avatarUrl ? (
                                  <img src={profile.avatarUrl} alt={profile.displayName} className="w-10 h-10 rounded-full object-cover border border-white/10" />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                                    <Users size={16} className="text-zinc-500" />
                                  </div>
                                )}
                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0a0a0a] ${edge.status === 'online' ? 'bg-teal-500' : 'bg-zinc-500'}`} />
                              </div>
                              <div>
                                <div className="text-sm font-medium text-white leading-tight">{profile?.displayName || 'Unknown'}</div>
                                <div className="text-xs text-zinc-400 capitalize">{edge.status}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleRemoveFriend(friendUid)} 
                              className="p-2 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-400/10 rounded-lg transition-all"
                              title="Remove Friend"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                  <div className="flex flex-col gap-6">
                    
                    {/* Incoming */}
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Inbox size={14} /> Incoming
                      </h3>
                      <div className="flex flex-col gap-2">
                        {incomingReqs.length === 0 ? (
                          <div className="text-xs text-zinc-600">No incoming requests</div>
                        ) : (
                          incomingReqs.map(edge => {
                            const profile = edge.profiles[edge.requesterId];
                            return (
                              <div key={edge.id} className="flex items-center justify-between p-3 rounded-xl bg-teal-500/5 border border-teal-500/10 transition-colors">
                                <div className="flex items-center gap-3">
                                  {profile?.avatarUrl ? (
                                    <img src={profile.avatarUrl} alt={profile.displayName} className="w-8 h-8 rounded-full object-cover" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                                      <Users size={14} className="text-zinc-500" />
                                    </div>
                                  )}
                                  <div className="text-sm font-medium text-white">{profile?.displayName || 'Unknown'}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleAcceptRequest(edge.requesterId)} className="p-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors" title="Accept">
                                    <Check size={16} />
                                  </button>
                                  <button onClick={() => handleRemoveFriend(edge.requesterId)} className="p-1.5 hover:bg-white/10 text-zinc-400 hover:text-red-400 rounded-lg transition-colors" title="Decline">
                                    <X size={16} />
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Outgoing */}
                    <div>
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Clock size={14} /> Sent
                      </h3>
                      <div className="flex flex-col gap-2">
                        {outgoingReqs.length === 0 ? (
                          <div className="text-xs text-zinc-600">No pending sent requests</div>
                        ) : (
                          outgoingReqs.map(edge => {
                            const targetUid = edge.participants.find(p => p !== firebaseUid)!;
                            const profile = edge.profiles[targetUid];
                            return (
                              <div key={edge.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center opacity-50">
                                    <Users size={14} className="text-zinc-500" />
                                  </div>
                                  <div className="text-sm text-zinc-400">{profile?.displayName || 'Unknown'}</div>
                                </div>
                                <button onClick={() => handleRemoveFriend(targetUid)} className="p-1.5 hover:bg-white/10 text-zinc-500 hover:text-red-400 rounded-lg transition-colors" title="Cancel Request">
                                  <X size={14} />
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>
                )}
                
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
