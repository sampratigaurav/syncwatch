import { useRoomStore } from '../store/roomStore';
import { socket } from '../hooks/useSocket';
import { User, Wifi, WifiOff } from 'lucide-react';
import clsx from 'clsx';

export default function ParticipantList() {
  const { participants } = useRoomStore();

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden">
      <div className="bg-zinc-950/50 px-4 py-3 border-b border-zinc-800">
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">In this room</h3>
      </div>
      <div className="p-2 space-y-1">
        {participants.length === 0 && (
          <div className="p-4 text-center text-sm text-zinc-500">It's quiet in here...</div>
        )}
        {participants.map((p) => {
          const isMe = p.id === socket.id;
          return (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-transparent hover:bg-zinc-800/30 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                    <User className="w-5 h-5 text-zinc-400" />
                  </div>
                  <div className={clsx(
                    "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-zinc-900",
                    p.status === 'ready' ? 'bg-green-500' :
                    p.status === 'buffering' ? 'bg-amber-500' : 
                    p.status === 'disconnected' ? 'bg-red-500' : 'bg-zinc-500'
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white flex items-center">
                    {p.nickname} {isMe && <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded ml-2">YOU</span>}
                  </p>
                  <p className="text-xs text-zinc-500 capitalize">{p.role}</p>
                </div>
              </div>
              
              <div className="flex flex-col items-end px-2">
                {p.status === 'disconnected' ? (
                  <WifiOff className="w-4 h-4 text-red-500 opacity-80" />
                ) : (
                  <div className="flex items-center text-[10px] font-mono text-zinc-500 bg-zinc-950 px-1.5 py-0.5 rounded">
                    <Wifi className="w-3 h-3 mr-1 text-teal-600/70" />
                    {p.latencyMs}ms
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
