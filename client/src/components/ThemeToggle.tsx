import { Moon, Sun } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useEffect } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useRoomStore();
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Actually changing index.css to handle this class toggle
  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors fixed top-4 right-4 z-50"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
