import { create } from 'zustand';
import { flushSync } from 'react-dom';
import './theme-transition.css';

export type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
  isTransitioning: boolean;
  /** Toggles theme, applies html class, persists to localStorage. */
  toggleTheme: (originX?: number, originY?: number) => void;
  /** Called once on app init to hydrate from localStorage / system pref. */
  initTheme: () => void;
}

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === 'light') {
    html.classList.add('light');
  } else {
    html.classList.remove('light');
  }
  // Update the meta theme-color for mobile browsers
  const metaTheme = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'light' ? '#fff8eb' : '#151319');
  }
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'dark',
  isTransitioning: false,

  initTheme: () => {
    const stored = localStorage.getItem('sw-theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme: Theme = stored ?? (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: async (originX = window.innerWidth / 2, originY = window.innerHeight / 2) => {
    if (get().isTransitioning) return;
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark';
    const commit = () => {
      applyTheme(next);
      set({ theme: next });
      localStorage.setItem('sw-theme', next);
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !document.startViewTransition) {
      commit();
      return;
    }

    const html = document.documentElement;
    const x = Math.max(0, Math.min(originX, window.innerWidth));
    const y = Math.max(0, Math.min(originY, window.innerHeight));
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    set({ isTransitioning: true });
    html.dataset.themeTransition = 'active';
    let committed = false;

    try {
      const transition = document.startViewTransition(() => {
        flushSync(commit);
        committed = true;
      });
      // A transition can be skipped if the page loses visibility.
      void transition.finished.catch(() => undefined);
      await transition.ready;
      await html.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${Math.ceil(radius) + 2}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 720,
          easing: 'cubic-bezier(0.22, 0.68, 0.15, 1)',
          pseudoElement: '::view-transition-new(root)',
        }
      ).finished;
      await transition.finished;
    } catch {
      if (!committed) commit();
    } finally {
      delete html.dataset.themeTransition;
      set({ isTransitioning: false });
    }
  },
}));
