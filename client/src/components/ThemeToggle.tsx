import { Moon, Sun } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useRoomStore();
  const [announcement, setAnnouncement] = useState('');
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setAnnouncement(nextTheme === 'dark' ? 'Dark mode enabled' : 'Light mode enabled');
    toggleTheme();
  };

  // Actually changing index.css to handle this class toggle
  return (
    <>
      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
      <button
        onClick={handleThemeToggle}
        className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors fixed top-4 right-4 z-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900"
        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    </>
  );
}
