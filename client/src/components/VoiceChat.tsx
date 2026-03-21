import { Mic, MicOff, PhoneOff, AlertCircle } from 'lucide-react';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export function VoiceChat() {
  const { 
    isInVoice,
    isMuted,
    voiceParticipants,
    permissionDenied,
    joinVoice,
    leaveVoice,
    toggleMute,
    remoteStreams
  } = useVoiceChat();

  const [confirmLeave, setConfirmLeave] = useState(false);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  // Manage hidden audio elements for remote streams
  useEffect(() => {
    if (!audioContainerRef.current) return;
    
    // Clear existing audio elements
    audioContainerRef.current.innerHTML = '';
    
    // Create new audio elements for each stream
    remoteStreams.forEach((stream, targetId) => {
      const audio = document.createElement('audio');
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.volume = 1.0;
      audio.dataset.targetId = targetId;
      audioContainerRef.current?.appendChild(audio);
    });
  }, [remoteStreams]);

  if (permissionDenied) {
    return (
      <div className="flex flex-col gap-3 py-4 px-3 bg-red-950/20 border-l-2 border-red-500/50 rounded-r-md">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Microphone access denied</span>
        </div>
        <p className="text-xs text-red-400/70">
          Allow microphone access in your browser settings to use voice chat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col relative w-full pt-1 pb-4">
      {/* Hidden container for audio tags */}
      <div ref={audioContainerRef} className="hidden" aria-hidden="true" />
      
      <div className="flex items-center gap-2 mb-3 px-3">
        <Mic className="w-4 h-4 text-zinc-400" />
        <h3 className="text-sm font-medium text-zinc-200">Voice</h3>
        {isInVoice && voiceParticipants.length > 0 && (
          <span className="text-xs text-zinc-500 font-medium">
            ({voiceParticipants.length})
          </span>
        )}
      </div>

      {!isInVoice ? (
        <div className="px-3">
          <button
            onClick={joinVoice}
            className={cn(
               "w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md",
               "border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800/80 transition-colors",
               "text-sm font-medium text-zinc-300 hover:text-white"
            )}
          >
            <Mic className="w-4 h-4" />
            Join Voice
          </button>
          <p className="text-center text-[11px] text-zinc-500 mt-2">
            Talk while you watch
          </p>
        </div>
      ) : (
        <div className="flex flex-col px-3">
          {/* Participant List inside Voice */}
          <div className="space-y-3 mb-4 max-h-[140px] overflow-y-auto shrink-0 pr-1">
            {voiceParticipants.map((p) => {
              const bgHash = p.nickname.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
              const colors = [
                'bg-blue-500/20 text-blue-400', 
                'bg-purple-500/20 text-purple-400', 
                'bg-green-500/20 text-green-400', 
                'bg-amber-500/20 text-amber-400', 
                'bg-rose-500/20 text-rose-400'
              ];
              const gradientColor = colors[bgHash % colors.length];

              return (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="relative">
                    <div 
                      className={cn(
                         "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold uppercase relative z-10",
                         gradientColor,
                         p.isSpeaking && !p.isMuted && "ring-2 ring-teal-500 ring-offset-2 ring-offset-zinc-950 transition-all duration-300"
                      )}
                    >
                      {p.nickname.slice(0, 2)}
                    </div>
                    {/* Muted overlay icon on avatar */}
                    {p.isMuted && (
                      <div className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-[2px] z-20">
                        <MicOff className="w-[10px] h-[10px] text-red-400" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="text-sm font-medium text-zinc-200 truncate">
                      {p.nickname}
                    </span>
                    {p.isMuted && (
                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                        Muted
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/5">
            <button
              onClick={toggleMute}
              className={cn(
                 "flex-1 flex items-center justify-center gap-2 py-2 rounded-md transition-colors min-w-[44px]",
                 isMuted 
                    ? "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20" 
                    : "bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20"
              )}
            >
              {isMuted ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span className="text-sm font-medium text-red-500">Muted</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span className="text-sm font-medium text-teal-500">Unmuted</span>
                </>
              )}
            </button>
            
            {confirmLeave ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    leaveVoice();
                    setConfirmLeave(false);
                  }}
                  className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirmLeave(false)}
                  className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmLeave(true)}
                title="Leave Voice"
                className="w-[44px] h-[40px] flex items-center justify-center border border-zinc-800 bg-zinc-900/50 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 rounded-md transition-colors text-zinc-400 shrink-0"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
