import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, User } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import ProfileModal from './ProfileModal';

export const Header = () => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const { firebaseUid, isAuthLoading, avatarUrl, authNickname } = useRoomStore(useShallow(state => ({
    firebaseUid: state.firebaseUid,
    isAuthLoading: state.isAuthLoading,
    avatarUrl: state.avatarUrl,
    authNickname: state.nickname
  })));

  const handleLogin = async () => {
    try {
      const { app } = await import('../firebase');
      const { getAuth, signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully!');
    } catch (err: unknown) {
      toast.error('Failed to login: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleLogout = async () => {
    try {
      const { app } = await import('../firebase');
      const { getAuth, signOut } = await import('firebase/auth');
      const auth = getAuth(app);
      await signOut(auth);
      toast.success('Logged out');
    } catch (err: unknown) {
      toast.error('Failed to logout');
    }
  };

  return (
    <>
      <div className="sticky top-0 w-full z-50 backdrop-blur-xl bg-zinc-950/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 tablet:grid-cols-3 items-center px-6 py-4">
          
          {/* Left: Logo */}
          <div className="flex items-center justify-start">
            <Link to="/" className="text-xl tablet:text-2xl font-bold tracking-tighter text-white drop-shadow-md">
              SyncWatch
            </Link>
          </div>

          {/* Center: Links */}
          <div className="hidden tablet:flex items-center justify-center gap-8">
            <Link to="/dashboard" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
              Getting Started
            </Link>
            <Link to="/docs" className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
              Docs
            </Link>
            <button onClick={() => toast('Extension is coming soon!', { icon: '🚀' })} className="text-zinc-400 hover:text-white text-sm font-medium transition-colors">
              Extension
            </button>
          </div>
          
          {/* Right: Auth & Social */}
          <div className="flex items-center justify-end gap-4 tablet:gap-6">
            <a href="https://github.com/sampratigaurav/syncwatch" aria-label="GitHub Repository" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">
              <Github size={20} />
            </a>
            
            <div className="w-px h-4 bg-white/10 hidden tablet:block" />
            
            {isAuthLoading ? (
              <div className="w-16 h-8 bg-white/5 animate-pulse rounded-lg" />
            ) : firebaseUid ? (
              <div className="relative">
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-teal-500/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-teal-400" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-white max-w-[100px] truncate">
                    {authNickname || 'User'}
                  </span>
                </button>
                
                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <m.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50"
                    >
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          setIsProfileOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        My Profile
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                      >
                        Sign Out
                      </button>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="text-xs font-semibold px-4 py-2 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded-lg transition-colors border border-teal-500/30"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};
