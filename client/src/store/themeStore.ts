import { create } from 'zustand';

export type Theme = 'dark' | 'light';

interface ThemeStore {
  theme: Theme;
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
    metaTheme.setAttribute('content', theme === 'light' ? '#f5f5f4' : '#050505');
  }
}

/**
 * Runs the cinematic iris-wipe transition before committing the theme change.
 * Creates a full-screen overlay that expands from the click origin, waits for it
 * to fully cover the viewport, flips the theme class, then removes the overlay.
 */
function runIrisTransition(nextTheme: Theme, originX: number, originY: number): Promise<void> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');

    const bgColor = nextTheme === 'light' ? '#f5f5f4' : '#050505';

    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '99999',
      background: bgColor,
      pointerEvents: 'none',
      clipPath: `circle(0% at ${originX}px ${originY}px)`,
      transition: 'clip-path 420ms cubic-bezier(0.4, 0, 0.2, 1)',
    });

    document.body.appendChild(overlay);

    // Force reflow so the initial clip-path is applied before transition starts
    overlay.getBoundingClientRect();

    // Expand to cover everything — 150% radius covers all corners
    overlay.style.clipPath = `circle(150% at ${originX}px ${originY}px)`;

    // After expansion, flip the theme and fade the overlay out
    overlay.addEventListener('transitionend', () => {
      applyTheme(nextTheme);

      // Brief pause so the painted page underneath is ready, then shrink away
      overlay.style.transition = 'opacity 120ms ease-out';
      overlay.style.opacity = '0';

      setTimeout(() => {
        overlay.remove();
        resolve();
      }, 140);
    }, { once: true });
  });
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'dark',

  initTheme: () => {
    const stored = localStorage.getItem('sw-theme') as Theme | null;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme: Theme = stored ?? (prefersDark ? 'dark' : 'light');
    applyTheme(theme);
    set({ theme });
  },

  toggleTheme: async (originX = window.innerWidth / 2, originY = window.innerHeight / 2) => {
    const current = get().theme;
    const next: Theme = current === 'dark' ? 'light' : 'dark';

    await runIrisTransition(next, originX, originY);

    localStorage.setItem('sw-theme', next);
    set({ theme: next });
  },
}));
