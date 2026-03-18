import { useRoomStore } from '../store/roomStore';
import { socket } from '../hooks/useSocket';
import { EVENTS } from '../../../shared/socketEvents';
import { Crown, Users, UserPlus } from 'lucide-react';
import type { ControlPolicy } from '../../../shared/types';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function ControlPolicySelector() {
  const { role, controlPolicy, controllerIds, participants, nickname } = useRoomStore();
  
  if (role !== 'host') return null;

  const handlePolicyChange = (policy: ControlPolicy) => {
    socket.emit(EVENTS.SET_CONTROL_POLICY, { policy, controllerIds });
  };

  const toggleParticipant = (targetId: string) => {
    const newControllerIds = controllerIds.includes(targetId)
      ? controllerIds.filter(id => id !== targetId)
      : [...controllerIds, targetId];
    socket.emit(EVENTS.SET_CONTROL_POLICY, { policy: 'selected', controllerIds: newControllerIds });
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <h3 className="text-white/90 text-sm font-semibold tracking-wide uppercase">Control Policy</h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        
        {/* Host Only */}
        <button
          onClick={() => handlePolicyChange('host_only')}
          className={cn(
            "flex flex-col items-center p-4 rounded-xl border transition-all duration-300",
            controlPolicy === 'host_only' 
              ? "bg-teal-500/10 border-teal-500 text-teal-400" 
              : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700"
          )}
        >
          <Crown className="w-6 h-6 mb-2" />
          <span className="font-semibold text-sm text-white mb-1">Host only</span>
          <span className="text-xs text-center opacity-70">Only you control playback</span>
        </button>

        {/* Everyone */}
        <button
          onClick={() => handlePolicyChange('everyone')}
          className={cn(
            "flex flex-col items-center p-4 rounded-xl border transition-all duration-300",
            controlPolicy === 'everyone' 
              ? "bg-teal-500/10 border-teal-500 text-teal-400" 
              : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700"
          )}
        >
          <Users className="w-6 h-6 mb-2" />
          <span className="font-semibold text-sm text-white mb-1">Everyone</span>
          <span className="text-xs text-center opacity-70">All participants can control</span>
        </button>

        {/* Selected */}
        <button
          onClick={() => handlePolicyChange('selected')}
          className={cn(
            "flex flex-col items-center p-4 rounded-xl border transition-all duration-300",
            controlPolicy === 'selected' 
              ? "bg-teal-500/10 border-teal-500 text-teal-400" 
              : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700"
          )}
        >
          <UserPlus className="w-6 h-6 mb-2" />
          <span className="font-semibold text-sm text-white mb-1">Choose who</span>
          <span className="text-xs text-center opacity-70">Select specific people</span>
        </button>
      </div>

      {/* Participant Selection List */}
      {controlPolicy === 'selected' && (
        <div className="mt-2 flex flex-col gap-2 p-4 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
          <p className="text-xs text-zinc-500 font-medium mb-1">Select participants to grant control:</p>
          
          {/* Host representation */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/20">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-500 font-bold text-sm">
                {nickname.substring(0,2).toUpperCase()}
              </div>
              <span className="text-white text-sm font-medium">{nickname} (You)</span>
            </div>
            <span className="text-xs font-semibold px-2 py-1 bg-teal-500/20 text-teal-400 rounded uppercase tracking-wider">Host</span>
          </div>

          {participants.filter(p => p.role !== 'host').length === 0 && (
             <div className="text-center p-4 text-xs text-zinc-600">No other participants joined yet.</div>
          )}

          {participants.filter(p => p.role !== 'host').map(p => {
             const canControl = controllerIds.includes(p.id);
             return (
               <div key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 font-bold text-sm">
                      {p.nickname.substring(0,2).toUpperCase()}
                    </div>
                    <span className="text-zinc-200 text-sm font-medium">{p.nickname}</span>
                  </div>
                  
                  <button 
                    onClick={() => toggleParticipant(p.id)}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none",
                      canControl ? "bg-teal-500" : "bg-zinc-700"
                    )}
                  >
                    <span 
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        canControl ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
               </div>
             )
          })}
        </div>
      )}
    </div>
  );
}
