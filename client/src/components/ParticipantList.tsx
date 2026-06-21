import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { socket } from '../hooks/useSocket';
import { Wifi, WifiOff, Gamepad2, Crown, MicOff, Check, Loader2 } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

const getGradient = (name: string) => {
  const colors = [
    "from-teal-400 to-emerald-500",
    "from-indigo-400 to-cyan-400",
    "from-pink-400 to-rose-500",
    "from-amber-400 to-orange-500",
    "from-violet-400 to-fuchsia-500"
  ];
  const charCode = name.charCodeAt(0) || 0;
  return colors[charCode % colors.length];
};

export default function ParticipantList({ variant = 'default' }: { variant?: 'default' | 'waiting-room' }) {
  const { participants, controlPolicy, controllerIds } = useRoomStore(useShallow(state => ({
    participants: state.participants,
    controlPolicy: state.controlPolicy,
    controllerIds: state.controllerIds
  })));
  // ⚡ Bolt: Use specific selector to prevent re-rendering when other WebRTC state (e.g. localStream) changes
  const voiceParticipants = useWebRTC(state => state.voiceParticipants);

  const isWaitingRoom = variant === 'waiting-room';

  const emptyState = participants.length === 0 && (
    <div className="p-4 text-center text-sm text-zinc-500">It's quiet in here...</div>
  );

  const horizontalChips = isWaitingRoom && (
    <div className="flex tablet:hidden overflow-x-auto gap-3 py-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      {emptyState}
      <AnimatePresence mode="popLayout">
      {participants.map(p => {
         const isHost = p.role === 'host';
         let hasControl = false;
         if (controlPolicy === 'everyone') hasControl = true;
         if (controlPolicy === 'selected') hasControl = isHost || controllerIds.includes(p.id);
         if (controlPolicy === 'host_only') hasControl = isHost;
         const vp = voiceParticipants.find(v => v.id === p.id);

         return (
           <motion.div 
             layout
             initial={{ opacity: 0, scale: 0.8 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.8 }}
             key={`chip-${p.id}`} 
             className="flex-shrink-0 flex items-center bg-zinc-800/80 rounded-full pr-4 pl-1.5 py-1.5 border border-zinc-700 shadow-sm relative"
           >
             <div className="relative">
               <div className={clsx(
                 "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase transition-all bg-gradient-to-br shadow-inner",
                 getGradient(p.nickname),
                 vp?.isSpeaking ? "ring-2 ring-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" : ""
               )}>
                 {p.nickname.substring(0,1).toUpperCase()}
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
            </motion.div>
          );
       })}
       </AnimatePresence>
    </div>
  );

  return (
    <div className={clsx("bg-zinc-900 border border-zinc-800 rounded-xl w-full shadow-lg", isWaitingRoom ? "max-w-full p-4" : "max-w-sm overflow-hidden")}>
      <div className={clsx("bg-zinc-950/50 px-4 py-3 border-b border-zinc-800", isWaitingRoom && "hidden")}>
        <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-wider">In this room</h3>
      </div>
      {horizontalChips}
      <div className={clsx("p-2 space-y-1", isWaitingRoom && "hidden tablet:block")}>
        {emptyState}
        <AnimatePresence mode="popLayout">
        {participants.map((p) => {
          const isMe = p.id === socket.id;
          const isHost = p.role === 'host';
          
          let hasControl = false;
          if (controlPolicy === 'everyone') hasControl = true;
          if (controlPolicy === 'selected') hasControl = isHost || controllerIds.includes(p.id);
          if (controlPolicy === 'host_only') hasControl = isHost;

          const vp = voiceParticipants.find(v => v.id === p.id);

          return (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              key={p.id} 
              className="flex items-center justify-between p-2 rounded-lg bg-transparent hover:bg-zinc-800/30 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className={clsx(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all bg-gradient-to-br shadow-inner text-white font-bold text-lg uppercase",
                    getGradient(p.nickname),
                    vp?.isSpeaking ? "ring-2 ring-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]" : ""
                  )}>
                    {p.nickname.substring(0,1)}
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
                    {vp && vp.isMuted && (
                      <MicOff className="w-[14px] h-[14px] text-red-500 ml-2" />
                    )}
                    {vp && vp.isSpeaking && !vp.isMuted && (
                      <div className="flex items-center gap-[2px] h-3 ml-2 flex-shrink-0">
                        <div className="w-1 h-1.5 bg-teal-400 rounded-full animate-[pulse_0.8s_ease-in-out_infinite]" />
                        <div className="w-1 h-2.5 bg-teal-400 rounded-full animate-[pulse_0.8s_ease-in-out_0.2s_infinite]" />
                        <div className="w-1 h-1.5 bg-teal-400 rounded-full animate-[pulse_0.8s_ease-in-out_0.4s_infinite]" />
                      </div>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 capitalize">{p.role}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 px-2">
                {isWaitingRoom && (
                  p.status === 'ready' ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-zinc-800/50 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1.5 rounded-md border border-zinc-700/50">
                      <Loader2 className="w-3 h-3 animate-spin" /> Waiting
                    </span>
                  )
                )}
                <div className="flex flex-col items-end">
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
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </div>
  );
}
