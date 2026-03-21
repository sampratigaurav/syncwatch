import { useRoomStore } from '../store/roomStore';
import { socket } from '../hooks/useSocket';
import { User, Wifi, WifiOff, Gamepad2, Crown } from 'lucide-react';
import clsx from 'clsx';

export default function ParticipantList({ variant = 'default' }: { variant?: 'default' | 'waiting-room' }) {
  const { participants, controlPolicy, controllerIds } = useRoomStore();

  const isWaitingRoom = variant === 'waiting-room';

  const emptyState = participants.length === 0 && (
    <div className="p-4 text-center text-sm text-zinc-500">It's quiet in here...</div>
  );

  const horizontalChips = isWaitingRoom && (
    <div className="flex tablet:hidden overflow-x-auto gap-3 py-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {emptyState}
      {participants.map(p => {
         const isHost = p.role === 'host';
         let hasControl = false;
         if (controlPolicy === 'everyone') hasControl = true;
         if (controlPolicy === 'selected') hasControl = isHost || controllerIds.includes(p.id);
         if (controlPolicy === 'host_only') hasControl = isHost;

         return (
           <div key={`chip-${p.id}`} className="flex-shrink-0 flex items-center bg-zinc-800/80 rounded-full pr-4 pl-1.5 py-1.5 border border-zinc-700 shadow-sm relative">
             <div className="relative">
               <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-300 uppercase tracking-widest">
                 {p.nickname.substring(0,2)}
               </div>
               <div className={clsx(
                 "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-800",
                 p.status === 'ready' ? 'bg-green-500' :
                 p.status === 'buffering' ? 'bg-amber-500' : 
                 p.status === 'disconnected' ? 'bg-red-500' : 'bg-zinc-500'
               )} />
             </div>
             <span className="ml-2.5 text-[13px] font-medium text-white max-w-[80px] truncate tracking-wide">
               {p.nickname.length > 8 ? p.nickname.substring(0, 8) + '…' : p.nickname}
             </span>
             {hasControl && (
               <span className="absolute -top-1 -right-1 text-teal-400 bg-zinc-900 rounded-full p-0.5 shadow-md">
                 {isHost ? <Crown className="w-3 h-3" /> : <Gamepad2 className="w-3 h-3" />}
               </span>
             )}
           </div>
         );
      })}
    </div>
  );

  return (
    <div className={clsx("bg-zinc-900 border border-zinc-800 rounded-xl w-full overflow-hidden shadow-lg", isWaitingRoom ? "max-w-full" : "max-w-sm")}>
      <div className={clsx("bg-zinc-950/50 px-4 py-3 border-b border-zinc-800", isWaitingRoom && "hidden tablet:block")}>
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">In this room</h3>
      </div>
      {horizontalChips}
      <div className={clsx("p-2 space-y-1", isWaitingRoom && "hidden tablet:block")}>
        {emptyState}
        {participants.map((p) => {
          const isMe = p.id === socket.id;
          const isHost = p.role === 'host';
          
          let hasControl = false;
          if (controlPolicy === 'everyone') hasControl = true;
          if (controlPolicy === 'selected') hasControl = isHost || controllerIds.includes(p.id);
          if (controlPolicy === 'host_only') hasControl = isHost;

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
                    {hasControl && (
                       <span className="ml-2 text-teal-500 flex items-center justify-center" title="Has playback control">
                         {isHost ? <Crown className="w-3.5 h-3.5" /> : <Gamepad2 className="w-3.5 h-3.5" />}
                       </span>
                    )}
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
