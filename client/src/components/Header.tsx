import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Github, User } from 'lucide-react';
import { m, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import ProfileModal from './ProfileModal';

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

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
                className="flex items-center gap-2 px-4 py-2 bg-white text-zinc-950 text-sm font-semibold rounded-lg border border-transparent hover:bg-zinc-950 hover:text-white hover:border-zinc-700 hover:shadow-xl hover:shadow-white/5 transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};
