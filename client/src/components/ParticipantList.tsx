import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';
import { socket } from '../hooks/useSocket';
import { Wifi, WifiOff, Gamepad2, Crown, MicOff, Check, Loader2, Share2 } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { cn, getGradient } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ParticipantList({ variant = 'default' }: { variant?: 'default' | 'waiting-room' }) {
  const { participants, controlPolicy, controllerIds, isTorrent, torrentHealth } = useRoomStore(useShallow(state => ({
    participants: state.participants,
    controlPolicy: state.controlPolicy,
    controllerIds: state.controllerIds,
    isTorrent: state.isTorrent,
    torrentHealth: state.torrentHealth
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
             className="flex-shrink-0 flex items-center bg-[#141414] rounded-full pr-4 pl-1.5 py-1.5 border border-white/5 shadow-sm relative"
           >
             <div className="relative">
               {p.avatarUrl ? (
                 <img 
                   src={p.avatarUrl} 
                   alt={p.nickname} 
                   className={cn(
                     "w-8 h-8 rounded-full object-cover transition-all",
                     vp?.isSpeaking ? "ring-2 ring-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" : ""
                   )} 
                 />
               ) : (
                 <div className={cn(
                   "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white uppercase transition-all shadow-inner",
                   getGradient(p.nickname),
                   vp?.isSpeaking ? "ring-2 ring-teal-500 shadow-[0_0_8px_rgba(20,184,166,0.5)]" : ""
                 )}>
                   {p.nickname.substring(0,1).toUpperCase()}
                 </div>
               )}
               <div className={cn(
                 "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950",
                 p.status === 'ready' ? 'bg-emerald-500' :
                 p.status === 'buffering' ? 'bg-amber-500' : 
                 p.status === 'disconnected' ? 'bg-red-500' : 'bg-zinc-500'
               )} />
             </div>
             <span className="ml-2.5 text-[13px] font-medium text-zinc-200 max-w-[80px] truncate tracking-wide">
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
    <div className={cn(
      "w-full flex flex-col",
      isWaitingRoom ? "max-w-full p-4 bg-[#0a0a0a] border border-white/5 rounded-2xl shadow-xl" : "overflow-hidden"
    )}>
      <div className={cn("px-4 py-3 flex justify-between items-center", isWaitingRoom && "hidden")}>
        <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-widest">In this room</h3>
        {isTorrent && (
          <div 
            className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider bg-[#141414] px-2 py-1 rounded-md border border-white/5"
            title={torrentHealth ? `${(torrentHealth.speed / 1024 / 1024).toFixed(2)} MB/s` : 'Connecting to swarm...'}
          >
            <Share2 className="w-3.5 h-3.5 text-teal-500" />
            <span className="text-zinc-300">{torrentHealth?.peers || 0} peers</span>
            <div className={cn(
              "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]", 
              (torrentHealth?.peers || 0) > 2 ? "bg-green-500" : (torrentHealth?.peers || 0) > 0 ? "bg-amber-500" : "bg-red-500"
            )} />
          </div>
        )}
      </div>
      {horizontalChips}
      <div className={cn("px-2 space-y-0.5", isWaitingRoom && "hidden tablet:block")}>
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              key={p.id} 
              className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-transparent hover:bg-white/[0.03] transition-colors cursor-default group"
            >
              <div className="flex items-center space-x-3">
                <div className="relative">
                  {p.avatarUrl ? (
                    <img 
                      src={p.avatarUrl} 
                      alt={p.nickname} 
                      className={cn(
                        "w-9 h-9 rounded-full object-cover transition-all shadow-sm",
                        vp?.isSpeaking ? "ring-2 ring-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]" : ""
                      )} 
                    />
                  ) : (
                    <div className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center transition-all bg-gradient-to-br shadow-inner text-white font-bold text-[15px] uppercase",
                      getGradient(p.nickname),
                      vp?.isSpeaking ? "ring-2 ring-teal-500 shadow-[0_0_15px_rgba(20,184,166,0.5)]" : ""
                    )}>
                      {p.nickname.substring(0,1)}
                    </div>
                  )}
                  <div className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0a0a0a] group-hover:border-[#101010] transition-colors",
                    p.status === 'ready' ? 'bg-emerald-500' :
                    p.status === 'buffering' ? 'bg-amber-500' : 
                    p.status === 'disconnected' ? 'bg-red-500' : 'bg-zinc-500'
                  )} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-zinc-200 flex items-center">
                    {p.nickname} {isMe && <span className="bg-white/10 text-zinc-300 text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded ml-2 uppercase">You</span>}
                    {hasControl && (
                       <span className="ml-2 text-teal-500 flex items-center justify-center bg-teal-500/10 p-0.5 rounded" title="Has playback control">
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
                  <p className="text-[11px] text-zinc-500 font-medium capitalize mt-0.5">{p.role}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 pl-2">
                {isWaitingRoom && (
                  p.status === 'ready' ? (
                    <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 bg-white/5 text-zinc-400 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border border-white/5">
                      <Loader2 className="w-3 h-3 animate-spin" /> Waiting
                    </span>
                  )
                )}
                <div className="flex flex-col items-end">
                  {p.status === 'disconnected' ? (
                    <WifiOff className="w-4 h-4 text-red-500 opacity-80" />
                  ) : (
                    <div className="flex items-center text-[9px] font-bold tracking-wider text-zinc-500 group-hover:bg-white/5 bg-transparent transition-colors px-1.5 py-0.5 rounded">
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
