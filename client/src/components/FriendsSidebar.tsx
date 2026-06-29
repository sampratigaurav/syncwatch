import { useState, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import { Users, X, Copy, UserPlus, Inbox, Clock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { SERVER_URL } from '../lib/config';
import { EmptyState } from './ui/EmptyState';
import { SkeletonShimmer } from './ui/Skeleton';

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
  const { firebaseUid, authToken, friendCode } = useRoomStore(useShallow(state => ({
    firebaseUid: state.firebaseUid,
    authToken: state.authToken,
    friendCode: state.friendCode
  })));
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  
  const [friends, setFriends] = useState<(FriendshipEdge & { onlineStatus: 'online' | 'offline' | 'away' })[]>([]);
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
        const friendsWithPresence = accepted.map(edge => ({ ...edge, onlineStatus: 'offline' as const }));
        setFriends(friendsWithPresence);

        friendsWithPresence.forEach(edge => {
          const friendUid = edge.participants.find(p => p !== firebaseUid);
          if (!friendUid) return;

          const statusRef = ref(rtdb, `/status/${friendUid}`);
          const unsub = onValue(statusRef, (presenceSnap) => {
            const val = presenceSnap.val();
            const state = val?.state || 'offline';
            setFriends(prev => prev.map(f => f.id === edge.id ? { ...f, onlineStatus: state } : f));
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
              className="w-full max-w-sm h-full bg-[#050505]/95 backdrop-blur-3xl border-l border-white/10 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden"
            >
              {/* Subtle ambient glow */}
              <div className="absolute top-[-10%] left-[-10%] w-[120%] h-64 bg-teal-900/20 blur-[100px] pointer-events-none rounded-full" />
              
              {/* Header */}
              <div className="p-6 pb-0 relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Users className="text-teal-500" />
                    Friends
                  </h2>
                  <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-2 mb-8 relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-500/0 via-teal-500/10 to-teal-500/0 rounded-xl opacity-0 group-focus-within:opacity-100 blur transition-opacity duration-500" />
                  <input
                    type="text"
                    placeholder="Enter Friend Code (e.g. A8X2-94P1)"
                    value={addFriendCode}
                    onChange={e => setAddFriendCode(e.target.value.toUpperCase())}
                    className="relative flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-teal-500/50 focus:bg-white/[0.02] transition-all uppercase placeholder:normal-case shadow-inner"
                  />
                  <button 
                    onClick={handleSendRequest}
                    disabled={isSubmitting || !addFriendCode}
                    className="relative px-4 bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all disabled:opacity-50 disabled:hover:bg-teal-600 shadow-lg active:scale-95 flex items-center justify-center"
                  >
                    <UserPlus size={20} />
                  </button>
                </div>

                <div className="flex gap-6 border-b border-white/5 mb-6">
                  <button 
                    onClick={() => setActiveTab('friends')}
                    className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'friends' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Friends <span className="ml-1.5 text-xs font-mono text-zinc-500">({friends.length})</span>
                    {activeTab === 'friends' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-t-full shadow-[0_-2px_10px_rgba(20,184,166,0.5)]" />}
                  </button>
                  <button 
                    onClick={() => setActiveTab('requests')}
                    className={`pb-3 text-sm font-semibold transition-colors relative flex items-center gap-2 ${activeTab === 'requests' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                  >
                    Requests
                    {incomingReqs.length > 0 && (
                      <span className="bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[10px] px-2 py-0.5 rounded-full font-bold">{incomingReqs.length}</span>
                    )}
                    {activeTab === 'requests' && <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500 rounded-t-full shadow-[0_-2px_10px_rgba(20,184,166,0.5)]" />}
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                
                {/* My Code Banner */}
                <div className="relative overflow-hidden bg-gradient-to-br from-teal-900/40 to-teal-950/40 border border-teal-500/30 rounded-2xl p-4 flex items-center justify-between mb-8 group cursor-pointer hover:border-teal-400/50 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] transition-all duration-300" onClick={copyMyCode}>
                  <div className="absolute inset-0 bg-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <div className="text-[10px] text-teal-300/70 font-semibold uppercase tracking-widest mb-1.5 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                      My Friend Code
                    </div>
                    {friendCode ? (
                      <div className="text-lg text-teal-400 font-mono tracking-[0.2em] drop-shadow-md">{friendCode}</div>
                    ) : (
                      <SkeletonShimmer className="w-32 h-7 bg-teal-500/10 rounded-md mt-1" />
                    )}
                  </div>
                  <div className="relative z-10 w-10 h-10 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/20 group-hover:scale-110 group-hover:border-teal-500/40 transition-all duration-300">
                    <Copy size={18} className="text-teal-400" />
                  </div>
                </div>

                {/* Friends Tab */}
                {activeTab === 'friends' && (
                  <div className="flex flex-col gap-2">
                    {friends.length === 0 ? (
                      <EmptyState 
                        icon={<Users size={32} className="opacity-80" />}
                        title="No friends yet"
                        description="Share your friend code to start watching together."
                        className="py-12"
                      />
                    ) : (
                      friends.map(edge => {
                        const friendUid = edge.participants.find(p => p !== firebaseUid)!;
                        const profile = edge.profiles[friendUid];
                        return (
                          <div key={edge.id} className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5 hover:border-white/10 hover:bg-white/[0.04] hover:shadow-lg transition-all duration-300 group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none" />
                            <div className="flex items-center gap-3 relative z-10">
                              <div className="relative">
                                {profile?.avatarUrl ? (
                                  <img src={profile.avatarUrl} alt={profile.displayName} className="w-11 h-11 rounded-full object-cover border border-white/10 shadow-md" />
                                ) : (
                                  <div className="w-11 h-11 rounded-full bg-zinc-800/80 flex items-center justify-center border border-white/10 shadow-md">
                                    <Users size={18} className="text-zinc-500" />
                                  </div>
                                )}
                                <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#0a0a0a] ${edge.onlineStatus === 'online' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-600'}`} />
                              </div>
                              <div className="flex flex-col justify-center">
                                <div className="text-[15px] font-semibold text-white leading-tight drop-shadow-sm">{profile?.displayName || 'Unknown'}</div>
                                <div className={`text-[11px] font-medium tracking-wide uppercase mt-0.5 ${edge.onlineStatus === 'online' ? 'text-emerald-400/80' : 'text-zinc-500'}`}>{edge.onlineStatus}</div>
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
                          <EmptyState 
                            icon={<Inbox size={24} className="opacity-80" />}
                            title="No incoming requests"
                            description="You're all caught up."
                            className="py-8"
                          />
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
                          <EmptyState 
                            icon={<Clock size={24} className="opacity-80" />}
                            title="No pending requests"
                            description="Requests you send will appear here."
                            className="py-8"
                          />
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
