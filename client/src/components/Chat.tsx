import { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { Send } from 'lucide-react';
import { TypingIndicator } from './TypingIndicator';
import { motion, AnimatePresence } from 'framer-motion';

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

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg relative">
      <div className="bg-zinc-950/50 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Chat</h3>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {chatMessages.length === 0 && (
          <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
            Say hello to the room!
          </div>
        )}
        <AnimatePresence initial={false}>
        {chatMessages.map(msg => {
          const isSystem = msg.senderId === 'system';
          const isMe = msg.senderNickname === nickname && !isSystem;
          
          if (isSystem) {
            return (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                key={msg.id} 
                className="text-center text-xs text-zinc-500 italic py-1"
              >
                {msg.text}
              </motion.div>
            );
          }
          
          return (
            <motion.div 
              layout
              initial={{ opacity: 0, y: 10, scale: 0.95, originX: isMe ? 1 : 0 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              key={msg.id} 
              className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
            >
              <span className="text-[10px] text-zinc-500 mb-0.5 px-1">{msg.senderNickname}</span>
              <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                {msg.text}
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
            className="flex flex-col items-start pt-2"
          >
            <div className="bg-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-2">
               <TypingIndicator />
            </div>
            <span className="text-[10px] text-zinc-500 mt-0.5 px-1">
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

      <div className="p-3 bg-zinc-950/50 border-t border-zinc-800 flex-shrink-0">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-full pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-shadow"
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            aria-label="Send message"
            title="Send message"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-teal-500 hover:text-teal-400 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
