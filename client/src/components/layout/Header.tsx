import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Github, Sun, Moon } from 'lucide-react';
import { m, AnimatePresence, LazyMotion, domAnimation } from 'framer-motion';
import { toast } from 'sonner';
import { useRoomStore } from '../../store/roomStore';
import { useThemeStore } from '../../store/themeStore';
import { useShallow } from 'zustand/react/shallow';
import ProfileModal from './ProfileModal';

// ─── Cinematic theme toggle ───────────────────────────────────────────────────
const ThemeToggle = () => {
  const { theme, toggleTheme } = useThemeStore();
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
      className="theme-toggle-btn"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLight ? (
          <m.span
            key="moon"
            initial={{ opacity: 0, rotate: -90, scale: 0.4 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 90, scale: 0.4 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            <Moon size={16} className="text-[#0d9488]" aria-hidden="true" />
          </m.span>
        ) : (
          <m.span
            key="sun"
            initial={{ opacity: 0, rotate: 90, scale: 0.4 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: -90, scale: 0.4 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex items-center justify-center"
          >
            <Sun size={16} className="text-amber-400" aria-hidden="true" />
          </m.span>
        )}
      </AnimatePresence>
    </button>
  );
};

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
      <header
        className="sticky top-0 w-full z-50 font-sans border-b"
        style={{ backgroundColor: 'var(--sw-bg-header)', borderColor: 'var(--sw-border)' }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-10 h-[60px]">

          {/* Left: Brand logomark + Wordmark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] p-1 -m-1 cursor-pointer"
          >
            <img
              src="/logo.png"
              alt="SyncWatch logo"
              width={34}
              height={34}
              className="shrink-0 rounded-[6px] transition-opacity duration-150 group-hover:opacity-90"
            />
            <span className="text-[16px] font-semibold tracking-[0.01em] leading-none transition-colors duration-150 group-hover:text-[var(--sw-text-primary)]" style={{ color: 'var(--sw-text-primary)' }}>
              SyncWatch
            </span>
          </Link>

          {/* Center: Navigation links with subtle hover pill */}
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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 rounded-lg border"
                    style={{ background: 'var(--sw-surface-hover)', borderColor: 'var(--sw-border-hover)' }}
                    transition={{ duration: 0.15 }}
                  />
                )}
                <button
                  onClick={action}
                  onFocus={() => setHoveredNav(id)}
                  onBlur={() => setHoveredNav(null)}
                  className="relative z-10 px-3.5 py-1.5 text-[14px] font-medium transition-colors duration-150 hover:text-[var(--sw-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] rounded-lg cursor-pointer"
                  style={{ color: 'var(--sw-nav-text)' }}
                >
                  {label}
                </button>
              </div>
            ))}

            {/* Docs — router link, same hover treatment */}
            <div
              className="relative"
              onMouseEnter={() => setHoveredNav('docs-btn')}
            >
              {hoveredNav === 'docs-btn' && (
                <m.div
                  layoutId="nav-hover-bg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 rounded-lg border"
                  style={{ background: 'var(--sw-surface-hover)', borderColor: 'var(--sw-border-hover)' }}
                  transition={{ duration: 0.15 }}
                />
              )}
              <Link
                to="/docs"
                onFocus={() => setHoveredNav('docs-btn')}
                onBlur={() => setHoveredNav(null)}
                className="relative z-10 block px-3.5 py-1.5 text-[14px] font-medium transition-colors duration-150 hover:text-[var(--sw-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5] rounded-lg cursor-pointer"
                style={{ color: 'var(--sw-nav-text)' }}
              >
                Docs
              </Link>
            </div>
          </nav>

          {/* Right: Theme toggle + GitHub + Sign in */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Cinematic theme toggle */}
            <ThemeToggle />

            {/* GitHub link */}
            <a
              href="https://github.com/sampratigaurav/syncwatch"
              target="_blank"
              rel="noreferrer"
              aria-label="Star SyncWatch repository on GitHub"
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full border transition-colors duration-150 cursor-pointer hover:border-[var(--sw-border-hover)] hover:bg-[var(--sw-surface-hover)] hover:text-[var(--sw-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
              style={{
                borderColor: 'var(--sw-border)',
                background: 'var(--sw-surface)',
                color: 'var(--sw-text-secondary)',
              }}
            >
              <Github className="w-4 h-4 text-inherit transition-opacity duration-150" aria-hidden="true" />
              <span className="hidden sm:block text-[13px] font-medium tracking-wide text-inherit">Star</span>
            </a>

            {isAuthLoading ? (
              <div className="w-36 h-9 animate-pulse rounded-full" style={{ background: 'var(--sw-surface)' }} aria-busy="true" aria-label="Loading authentication status" />
            ) : firebaseUid ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  aria-expanded={isProfileDropdownOpen}
                  aria-haspopup="menu"
                  aria-controls="profile-menu"
                  aria-label="User profile options menu"
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium transition-colors duration-150 cursor-pointer hover:border-[var(--sw-border-hover)] hover:bg-[var(--sw-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
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
                className="group flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-[13.5px] font-medium transition-colors duration-150 cursor-pointer hover:border-[var(--sw-border-hover)] hover:bg-[var(--sw-surface-hover)] hover:text-[var(--sw-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3a5]"
                style={{
                  borderColor: 'var(--sw-border)',
                  background: 'var(--sw-surface)',
                  color: 'var(--sw-text-primary)',
                }}
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
          </div>

        </div>
      </header>
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </LazyMotion>
  );
};


