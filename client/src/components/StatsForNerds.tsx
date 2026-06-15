import { Activity, Wifi, Clock, Server } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useShallow } from 'zustand/react/shallow';

interface StatsForNerdsProps {
  isVisible: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
}

export function StatsForNerds({ isVisible, videoRef }: StatsForNerdsProps) {
  const { latency, connectionStatus, participants } = useRoomStore(useShallow(state => ({
    latency: state.latencyMs,
    connectionStatus: state.connectionStatus,
    participants: state.participants,
  })));

  if (!isVisible) return null;

  const getLatencyColor = (ms: number) => {
    if (ms < 50) return 'text-emerald-400';
    if (ms < 150) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSyncDrift = () => {
    if (!videoRef.current) return 0;
    const state = useRoomStore.getState();
    const playback = state.playback;
    if (!playback || !playback.isPlaying) return 0;
    
    // Estimate current server time for the video
    const elapsed = (Date.now() - playback.lastUpdatedAt) / 1000;
    const expectedTime = playback.currentTime + elapsed;
    const diff = videoRef.current.currentTime - expectedTime;
    return diff;
  };

  const drift = getSyncDrift();

  return (
    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md border border-zinc-800 rounded-lg p-4 w-72 shadow-2xl z-50 text-xs font-mono text-zinc-300">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-zinc-800">
        <Activity className="w-4 h-4 text-emerald-400" />
        <span className="font-bold text-white tracking-wider">STATS FOR NERDS</span>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-zinc-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>Connection</span>
          </div>
          <span className="capitalize">{connectionStatus}</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-zinc-400">
            <Server className="w-3.5 h-3.5" />
            <span>Server Ping</span>
          </div>
          <span className={getLatencyColor(latency)}>{Math.round(latency)} ms</span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-zinc-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Video Drift</span>
          </div>
          <span className={Math.abs(drift) > 2 ? 'text-red-400' : 'text-zinc-300'}>
            {drift > 0 ? '+' : ''}{(drift * 1000).toFixed(0)} ms
          </span>
        </div>

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-zinc-400">
            <Activity className="w-3.5 h-3.5" />
            <span>Total Peers</span>
          </div>
          <span>{participants.length}</span>
        </div>
      </div>
    </div>
  );
}
