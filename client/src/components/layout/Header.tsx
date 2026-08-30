import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Github } from 'lucide-react';
import { m, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { toast } from 'sonner';
import { useRoomStore } from '../../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import ProfileModal from './ProfileModal';


export const Header = () => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    const isHome = window.location.pathname === '/';
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    if (isHome) {
      scroll();
    } else {
      navigate('/');
      // Wait for the page to render then scroll
      setTimeout(scroll, 300);
    }
  };

  const { firebaseUid, isAuthLoading, avatarUrl, nickname, profileName } = useRoomStore(useShallow(state => ({
    firebaseUid: state.firebaseUid,
    isAuthLoading: state.isAuthLoading,
    avatarUrl: state.avatarUrl,
    nickname: state.nickname,
    profileName: state.profileName
  })));

  // Pre-load Firebase auth on mount so signInWithPopup is called
  // synchronously from the click event (no async gap = no popup blocker)
  const authRef = useRef<{
    getAuth: typeof import('firebase/auth').getAuth;
    signInWithPopup: typeof import('firebase/auth').signInWithPopup;
    signOut: typeof import('firebase/auth').signOut;
    GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider;
    app: import('firebase/app').FirebaseApp;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      import('../../firebase'),
      import('firebase/auth'),
    ]).then(([{ app }, { getAuth, signInWithPopup, signOut, GoogleAuthProvider }]) => {
      if (!cancelled) {
        authRef.current = { app, getAuth, signInWithPopup, signOut, GoogleAuthProvider };
      }
    });
    return () => { cancelled = true; };
  }, []);

  const handleLogin = () => {
    if (!authRef.current) {
      toast.error('Auth not ready yet, please try again.');
      return;
    }
    const { app, getAuth, signInWithPopup, GoogleAuthProvider } = authRef.current;
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(() => toast.success('Logged in successfully!'))
      .catch((err: unknown) => toast.error('Failed to login: ' + (err instanceof Error ? err.message : String(err))));
  };

  const handleLogout = () => {
    if (!authRef.current) return;
    const { app, getAuth, signOut } = authRef.current;
    const auth = getAuth(app);
    signOut(auth)
      .then(() => toast.success('Logged out'))
      .catch(() => toast.error('Failed to logout'));
  };

  // Close profile dropdown on Escape key or outside click
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsProfileDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <LazyMotion features={domAnimation}>
      <header className="sticky top-0 w-full z-50 bg-[#09100f] border-b border-white/[0.06] font-sans">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-10 h-[60px]">

          {/* Left: Brand logomark + Wordmark */}
          <Link 
            to="/" 
            className="flex items-center gap-2.5 group shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] p-1 -m-1"
          >
            <img
              src="/logo.png"
              alt="SyncWatch logo"
              width={34}
              height={34}
              className="shrink-0 rounded-[6px]"
            />
            <span className="text-[16px] font-semibold text-white tracking-[0.01em] leading-none">
              SyncWatch
            </span>
          </Link>

          {/* Center: Navigation links with magic hover/focus pill */}
          <nav
            className="hidden tablet:flex items-center gap-1"
            onMouseLeave={() => setHoveredNav(null)}
            aria-label="Main navigation"
          >
            {([
              { id: 'features-btn',    label: 'Features',     action: () => scrollToSection('features') },
              { id: 'howitworks-btn',  label: 'How it works', action: () => scrollToSection('how-it-works') },
              { id: 'faq-btn',         label: 'FAQ',           action: () => scrollToSection('faq') },
            ] as const).map(({ id, label, action }) => (
              <div
                key={id}
                className="relative"
                onMouseEnter={() => setHoveredNav(id)}
              >
                {hoveredNav === id && (
                  <m.div
                    layoutId="nav-hover-bg"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    className="absolute inset-0 rounded-lg bg-[#22d3a5]/10 border border-[#22d3a5]/25 shadow-[0_0_14px_rgba(34,211,165,0.12)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                  />
                )}
                <button
                  onClick={action}
                  onFocus={() => setHoveredNav(id)}
                  onBlur={() => setHoveredNav(null)}
                  className="relative z-10 px-3.5 py-1.5 text-[14px] font-normal transition-colors duration-150 text-[#9ca3af] hover:text-[#22d3a5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] rounded-lg"
                >
                  {label}
                </button>
              </div>
            ))}

            {/* Docs — router link, same hover/focus treatment */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredNav('docs-btn')}
            >
              {hoveredNav === 'docs-btn' && (
                <m.div
                  layoutId="nav-hover-bg"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  className="absolute inset-0 rounded-lg bg-[#22d3a5]/10 border border-[#22d3a5]/25 shadow-[0_0_14px_rgba(34,211,165,0.12)]"
                  transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                />
              )}
              <Link
                to="/docs"
                onFocus={() => setHoveredNav('docs-btn')}
                onBlur={() => setHoveredNav(null)}
                className="relative z-10 block px-3.5 py-1.5 text-[14px] font-normal transition-colors duration-150 text-[#9ca3af] hover:text-[#22d3a5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] rounded-lg"
              >
                Docs
              </Link>
            </div>
          </nav>

          {/* Right: GitHub + Sign in */}
          <div className="flex items-center gap-3 shrink-0">
            {/* GitHub link */}
            <a
              href="https://github.com/sampratigaurav/syncwatch"
              target="_blank"
              rel="noreferrer"
              aria-label="Star SyncWatch repository on GitHub"
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-white/10 hover:border-white/25 bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-200 text-zinc-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:block text-[13px] font-normal tracking-wide">Star</span>
            </a>

            {isAuthLoading ? (
              <div className="w-36 h-9 bg-white/5 animate-pulse rounded-full" aria-busy="true" aria-label="Loading authentication status" />
            ) : firebaseUid ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="menu"
                  aria-controls="profile-menu"
                  aria-label="User profile options menu"
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 hover:border-white/20 bg-white/[0.04] hover:bg-white/[0.07] transition-all duration-200 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full" aria-hidden="true" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-[#22d3a5]/20 flex items-center justify-center" aria-hidden="true">
                      <User className="w-3 h-3 text-[#22d3a5]" aria-hidden="true" />
                    </div>
                  )}
                  <span className="max-w-[100px] truncate">
                    {profileName || nickname || 'User'}
                  </span>
                </button>

                <AnimatePresence>
                  {isProfileDropdownOpen && (
                    <m.div
                      id="profile-menu"
                      role="menu"
                      aria-orientation="vertical"
                      aria-label="User profile options"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-2xl overflow-hidden py-1 z-50"
                    >
                      <button
                        role="menuitem"
                        onClick={() => { setIsProfileDropdownOpen(false); setIsProfileOpen(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] focus-visible:ring-inset"
                      >
                        My Profile
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => { setIsProfileDropdownOpen(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] focus-visible:ring-inset"
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
                aria-label="Sign in with Google"
                className="group relative flex items-center gap-2.5 px-5 py-2 rounded-full border border-white/[0.12] hover:border-white/25 bg-white/[0.04] hover:bg-white/[0.08] text-white text-[13.5px] font-medium transition-all duration-200 active:scale-[0.97] overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
              >
                {/* Subtle shimmer on hover */}
                <span className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-transparent via-white/[0.04] to-transparent" aria-hidden="true" />
                {/* Google G logo */}
                <svg className="relative w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="relative">Sign in</span>
              </button>
            )}
          </div>

        </div>
      </header>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </LazyMotion>
  );
};

