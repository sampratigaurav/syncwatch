import { useState, useEffect, useRef } from 'react';
import { Smile } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const ALLOWED_EMOJIS = ['😂', '❤️', '😮', '😭', '🔥', '👏', '😍', '💀', '🤯', '👀'];

interface ReactionButtonProps {
  onSend: (emoji: string) => void;
}

export function ReactionButton({ onSend }: ReactionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [onCooldown, setOnCooldown] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        pickerRef.current && !pickerRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle 4-second timeout to auto-close picker
  useEffect(() => {
    if (isOpen) {
      hideTimeoutRef.current = setTimeout(() => {
        setIsOpen(false);
      }, 4000);
    } else {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCooldown) return;
    setIsOpen(prev => !prev);
  };

  const handleSend = (e: React.MouseEvent, emoji: string) => {
    e.stopPropagation();
    if (onCooldown) return;
    
    onSend(emoji);
    setIsOpen(false);
    setOnCooldown(true);
    
    // 2-second cooldown tracking strictly
    setTimeout(() => {
      setOnCooldown(false);
    }, 2000);
  };

  return (
    <div className="relative flex items-center justify-center">
      {isOpen && (
        <div 
          ref={pickerRef}
          className="absolute bottom-full mb-4 right-0 tablet:-right-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-zinc-900/95 [.light_&]:bg-white/95 backdrop-blur-md border border-zinc-800 [.light_&]:border-zinc-200 shadow-2xl rounded-2xl p-2 flex flex-wrap max-w-[260px] min-[360px]:max-w-max min-[360px]:flex-nowrap gap-1">
            {ALLOWED_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={(e) => handleSend(e, emoji)}
                className="w-11 h-11 flex-shrink-0 flex items-center justify-center text-xl tablet:text-2xl hover:bg-zinc-800 [.light_&]:hover:bg-zinc-100 rounded-xl transition-transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                title={emoji}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        ref={buttonRef}
        onClick={handleToggle}
        disabled={onCooldown}
        title="Send Reaction"
        className={cn(
          "w-11 h-11 tablet:w-auto tablet:h-auto flex items-center justify-center transition-colors focus:outline-none pr-1 tablet:pr-0 relative",
          onCooldown 
            ? "text-zinc-600 [.light_&]:text-zinc-400 cursor-not-allowed" 
            : "text-white [.light_&]:text-zinc-600 hover:text-teal-400 [.light_&]:hover:text-teal-500"
        )}
      >
        <Smile className="w-6 h-6 tablet:w-5 tablet:h-5" />
        {/* Cooldown visual indicator ring */}
        {onCooldown && (
          <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none opacity-50">
             <circle 
                cx="50%" cy="50%" r="42%" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeDasharray="100" 
                className="animate-[dash_2s_linear_forwards]"
                style={{ strokeDashoffset: -100 }}
             />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes dash {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 100; }
        }
      `}</style>
    </div>
  );
}
