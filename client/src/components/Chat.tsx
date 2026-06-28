import { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { Send } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, getGradient } from '../lib/utils';

export default function Chat() {
  const { chatMessages, nickname, participants } = useRoomStore(useShallow(state => ({
    chatMessages: state.chatMessages,
    nickname: state.nickname,
    participants: state.participants
  })));
  const [text, setText] = useState('');
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, typingUsers.size]);

  useEffect(() => {
    const handleTypingStart = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.add(userId);
        return next;
      });
    };

    const handleTypingStop = ({ userId }: { userId: string }) => {
      setTypingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    socket.on(EVENTS.TYPING_START, handleTypingStart);
    socket.on(EVENTS.TYPING_STOP, handleTypingStop);

    return () => {
      socket.off(EVENTS.TYPING_START, handleTypingStart);
      socket.off(EVENTS.TYPING_STOP, handleTypingStop);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    
    socket.emit(EVENTS.TYPING_START);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit(EVENTS.TYPING_STOP);
    }, 2000);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    socket.emit(EVENTS.CHAT_MESSAGE, { text });
    setText('');
    
    socket.emit(EVENTS.TYPING_STOP);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  };

  const formatTime = (timestamp: number) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(new Date(timestamp));
  };

  return (
    <div className="flex flex-col h-full relative">
      <div className="flex-grow overflow-y-auto space-y-1 pb-4" ref={scrollRef}>
        {chatMessages.length === 0 && (
          <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
            Say hello to the room!
          </div>
        )}
        <AnimatePresence initial={false}>
        {chatMessages.map((msg, index) => {
          const isSystem = msg.senderId === 'system';
          
          const prevMsg = index > 0 ? chatMessages[index - 1] : null;
          const isGrouped = prevMsg 
            && !isSystem 
            && prevMsg.senderId === msg.senderId 
            && (msg.timestamp - prevMsg.timestamp) <= 300000; // 5 minutes
          
          if (isSystem) {
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                key={msg.id} 
                className="text-center text-xs text-zinc-500 italic py-2 my-2 border-y border-white/5"
              >
                {msg.text}
              </motion.div>
            );
          }
          
          return (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={msg.id} 
              className={cn(
                "flex items-start px-2 py-0.5 hover:bg-white/[0.02] transition-colors rounded-lg",
                !isGrouped && "mt-3"
              )}
            >
              {!isGrouped ? (
                <div className="flex-shrink-0 w-9 h-9 mr-3 select-none">
                  {msg.avatarUrl ? (
                    <img src={msg.avatarUrl} alt={msg.senderNickname} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className={cn("w-full h-full rounded-full flex items-center justify-center text-sm font-bold text-white uppercase shadow-inner", getGradient(msg.senderNickname))}>
                      {msg.senderNickname.substring(0, 1)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-shrink-0 w-9 mr-3 select-none opacity-0 text-[10px] text-zinc-600 text-right pr-1 pt-1 font-medium group-hover:opacity-100 hover:opacity-100! transition-opacity">
                   {formatTime(msg.timestamp)}
                </div>
              )}
              
              <div className="flex flex-col min-w-0 flex-1">
                {!isGrouped && (
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-zinc-200">{msg.senderNickname}</span>
                    <span className="text-[10px] text-zinc-500 font-medium">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                <div className="text-sm text-zinc-300 leading-relaxed break-words">
                  {msg.text}
                </div>
              </div>
            </motion.div>
          );
        })}
        {typingUsers.size > 0 && (
          <motion.div 
            key="typing-indicator"
            layout
            initial={{ opacity: 0, y: 10, scale: 0.95, originX: 0 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
            className="flex items-center gap-3 px-2 py-2 mt-2"
          >
            <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center">
              <div className="bg-zinc-800 text-zinc-200 rounded-2xl px-3 py-2 flex items-center gap-2">
                 <TypingIndicator />
              </div>
            </div>
            <span className="text-[11px] font-medium text-zinc-500">
               {Array.from(typingUsers)
                  .map(id => participants.find(p => p.id === id)?.nickname)
                  .filter(Boolean)
                  .join(', ')}{' '}
               {typingUsers.size > 1 ? 'are' : 'is'} typing...
            </span>
          </motion.div>
        )}
        </AnimatePresence>
      </div>

      <div className="pt-2 flex-shrink-0 relative">
        <form onSubmit={handleSend} className="relative group">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder="Message room..."
            className="w-full bg-[#141414] border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/50 transition-all shadow-inner"
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            aria-label="Send message"
            title="Send message"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-teal-500 hover:text-teal-400 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
