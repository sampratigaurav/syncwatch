import { useRoomStore } from '../store/roomStore';
import { Activity, Clock } from 'lucide-react';
import clsx from 'clsx';

export default function SyncStatus() {
  const { latencyMs, playback } = useRoomStore();
  
  // Color coding latency
  const latencyColor = 
    latencyMs < 200 ? 'text-teal-400' : 
    latencyMs < 500 ? 'text-amber-400' : 'text-red-400';

  let syncTime = '';
  if (playback && playback.lastUpdatedAt) {
    const d = new Date(playback.lastUpdatedAt);
    syncTime = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
  }

  return (
    <div className="flex items-center space-x-4 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2">
      <div className="flex items-center space-x-2">
        <Activity className={clsx("w-4 h-4", latencyColor)} />
        <span className="text-xs font-mono text-zinc-400">Ping: </span>
        <span className={clsx("text-xs font-mono font-medium", latencyColor)}>{latencyMs}ms</span>
      </div>
      
      <div className="w-px h-4 bg-zinc-800"></div>
      
      <div className="flex items-center space-x-2">
        <Clock className="w-4 h-4 text-zinc-500" />
        <span className="text-xs font-mono text-zinc-400">Last Sync: </span>
        <span className="text-xs font-mono font-medium text-zinc-300">{syncTime || '--:--:--'}</span>
      </div>
    </div>
  );
}
