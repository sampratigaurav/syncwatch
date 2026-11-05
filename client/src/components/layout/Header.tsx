import { useState, useEffect, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { User, Github, Sun, Moon, Star, Menu, X, Clapperboard, Film, CircleHelp, BookOpen } from 'lucide-react';
import { m, AnimatePresence, LazyMotion, domAnimation, useReducedMotion } from 'framer-motion';
import { toast } from 'sonner';
import { useRoomStore } from '../../store/roomStore';
import { useThemeStore } from '../../store/themeStore';
import { useShallow } from 'zustand/react/shallow';
import ProfileModal from './ProfileModal';
import './header.css';

// ─── Cinematic theme toggle ───────────────────────────────────────────────────
const ThemeToggle = () => {
  const { theme, toggleTheme, isTransitioning } = useThemeStore();
  const reducedMotion = useReducedMotion();
  const btnRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (!btnRef.current) {
      toggleTheme();
      return;
    }
    const rect = btnRef.current.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    toggleTheme(x, y);
  };

  const isLight = theme === 'light';

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className="cinema-nav-icon cinema-theme-toggle"
      data-theme={theme}
      disabled={isTransitioning}
      aria-busy={isTransitioning}
    >
      <span className="cinema-theme-orbit" aria-hidden="true"><i /><i /></span>
      <AnimatePresence mode="wait" initial={false}>
        {isLight ? (
          <m.span
            key="moon"
            initial={reducedMotion ? false : { opacity: 0, rotate: -90, scale: 0.4 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.4 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="cinema-theme-glyph"
          >
            <Moon size={16} className="cinema-theme-moon" aria-hidden="true" />
          </m.span>
        ) : (
          <m.span
            key="sun"
            initial={reducedMotion ? false : { opacity: 0, rotate: 90, scale: 0.4 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.4 }}
            transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
            className="cinema-theme-glyph"
          >
            <Sun size={16} className="cinema-theme-sun" aria-hidden="true" />
          </m.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export const Header = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const navToggle = useRef<HTMLButtonElement>(null);

  const scrollToSection = (id: string) => {
    setIsNavOpen(false);
    const isHome = window.location.pathname === '/';
    const scroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
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
        if (isNavOpen) {
          setIsNavOpen(false);
          navToggle.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNavOpen]);

  return (
    <LazyMotion features={domAnimation}>
      <header className="cinema-header sticky top-0 z-50 font-sans" data-home={pathname === '/'}>
        <div className="cinema-nav-shell">
          <Link to="/" className="cinema-nav-brand" onClick={() => setIsNavOpen(false)}>
            <span className="cinema-nav-logo" aria-hidden="true"><svg viewBox="0 0 32 32" width="26" height="26"><path d="M7 6v19l14-9.5z" fill="#a28bea" /><path d="M13 7v19l14-9.5z" fill="#e2fa87" /></svg></span>
            <span>SyncWatch</span>
          </Link>

          <div className="cinema-nav-tools">
            {/* Cinematic theme toggle */}
            <ThemeToggle />

            {/* GitHub Star link — animated icon swap on hover */}
            <a
              href="https://github.com/sampratigaurav/syncwatch"
              target="_blank"
              rel="noreferrer"
              aria-label="Star SyncWatch repository on GitHub"
              className="github-star-btn cinema-nav-icon cinema-nav-star"
            >
              {/* Icon: Github → Star on hover, housed in a fixed-size box so layout never shifts */}
              <span className="relative w-4 h-4 shrink-0" aria-hidden="true">
                {/* Github icon — fades/scales out on hover */}
                <Github className="github-star-btn__github absolute inset-0 w-4 h-4" />
                {/* Star icon — fades/scales in on hover, amber gold */}
                <Star className="github-star-btn__star absolute inset-0 w-4 h-4 fill-current" style={{ color: '#f59e0b' }} />
              </span>
            </a>

            {isAuthLoading ? (
              <div className="cinema-nav-loading motion-safe:animate-pulse rounded-full" style={{ background: 'var(--sw-surface)' }} aria-busy="true" aria-label="Loading authentication status" />
            ) : firebaseUid ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="menu"
                  aria-controls="profile-menu"
                  aria-label="User profile options menu"
                  className="cinema-nav-auth"
                  style={{
                    borderColor: 'var(--sw-border)',
                    background: 'var(--sw-surface)',
                    color: 'var(--sw-text-primary)',
                  }}
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
                      className="absolute right-0 mt-2 w-48 rounded-xl shadow-2xl overflow-hidden py-1 z-50 border"
                      style={{
                        background: 'var(--sw-bg-header)',
                        borderColor: 'var(--sw-border)',
                      }}
                    >
                      <button
                        role="menuitem"
                        onClick={() => { setIsProfileDropdownOpen(false); setIsProfileOpen(true); }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 cursor-pointer hover:bg-[var(--sw-surface-hover)] hover:text-[var(--sw-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] focus-visible:ring-inset"
                        style={{ color: 'var(--sw-text-secondary)' }}
                      >
                        My Profile
                      </button>
                      <button
                        role="menuitem"
                        onClick={() => { setIsProfileDropdownOpen(false); handleLogout(); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] focus-visible:ring-inset"
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
                className="cinema-nav-auth cinema-nav-signin"
              >
                {/* Google G logo */}
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Sign in</span>
              </button>
            )}
            <button
              ref={navToggle}
              type="button"
              className="cinema-nav-icon cinema-nav-toggle"
              aria-label={isNavOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={isNavOpen}
              aria-controls="cinema-navigation"
              onClick={() => { setIsProfileDropdownOpen(false); setIsNavOpen(open => !open); }}
            >
              {isNavOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>

          <nav id="cinema-navigation" className="cinema-navigation" data-open={isNavOpen} aria-label="Main navigation">
            {[
              { id: 'features', label: 'Features', icon: Film },
              { id: 'how-it-works', label: 'How it works', icon: Clapperboard },
              { id: 'faq', label: 'FAQ', icon: CircleHelp },
            ].map(({ id, label, icon: Icon }) => (
              <button key={id} type="button" onClick={() => scrollToSection(id)} className="cinema-nav-link">
                <Icon size={15} aria-hidden="true" /> {label}
              </button>
            ))}
            <NavLink to="/docs" onClick={() => setIsNavOpen(false)} className="cinema-nav-link">
              <BookOpen size={15} aria-hidden="true" /> Docs
            </NavLink>
            <a className="cinema-nav-link cinema-nav-mobile-star" href="https://github.com/sampratigaurav/syncwatch" target="_blank" rel="noreferrer">
              <Github size={15} aria-hidden="true" /> Star on GitHub
            </a>
          </nav>

        </div>
      </header>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </LazyMotion>
  );
};


