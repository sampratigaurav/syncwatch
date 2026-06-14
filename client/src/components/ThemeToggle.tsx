import { Moon, Sun } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useRoomStore(useShallow(state => ({
    theme: state.theme,
    toggleTheme: state.toggleTheme
  })));
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;

  return (
    <>
      <button 
        onClick={toggleTheme}
        aria-label={label}
        title={label}
        className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors fixed top-4 right-4 z-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
      </button>
      {/* Screen reader live region announces theme changes */}
      <span aria-live="polite" className="sr-only">
        {theme === 'dark' ? 'Dark mode active' : 'Light mode active'}
      </span>
    </>
  );
}
