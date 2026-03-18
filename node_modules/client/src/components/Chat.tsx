import { useState, useRef, useEffect } from 'react';
import { useRoomStore } from '../store/roomStore';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { Send } from 'lucide-react';

export default function Chat() {
  const { chatMessages, nickname } = useRoomStore();
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    
    socket.emit(EVENTS.CHAT_MESSAGE, { text });
    setText('');
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg">
      <div className="bg-zinc-950/50 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">Chat</h3>
      </div>
      
      <div className="flex-grow overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {chatMessages.length === 0 && (
          <div className="flex h-full items-center justify-center text-zinc-600 text-sm">
            Say hello to the room!
          </div>
        )}
        {chatMessages.map(msg => {
          const isSystem = msg.senderId === 'system';
          const isMe = msg.senderNickname === nickname && !isSystem;
          
          if (isSystem) {
            return (
              <div key={msg.id} className="text-center text-xs text-zinc-500 italic py-1">
                {msg.text}
              </div>
            );
          }
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-zinc-500 mb-0.5 px-1">{msg.senderNickname}</span>
              <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm ${isMe ? 'bg-teal-600 text-white rounded-tr-sm' : 'bg-zinc-800 text-zinc-200 rounded-tl-sm'}`}>
                {msg.text}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-3 bg-zinc-950/50 border-t border-zinc-800 flex-shrink-0">
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-full pl-4 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-teal-500 transition-shadow"
          />
          <button 
            type="submit" 
            disabled={!text.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-teal-500 hover:text-teal-400 hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
