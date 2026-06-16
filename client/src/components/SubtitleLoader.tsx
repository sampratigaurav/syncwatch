import React, { useState, useRef, useEffect } from 'react';
import { Subtitles, X, Upload, Wand2, Loader2, Minus, Plus } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useSmartSubtitles } from '../hooks/useSmartSubtitles';
import { parseSubtitles, blocksToVttWithOffset, type SubtitleBlock } from '../lib/subtitleUtils';

interface SubtitleLoaderProps {
  onSubtitleLoaded: (blobUrl: string) => void;
  onSubtitleCleared: () => void;
}

export default function SubtitleLoader({ onSubtitleLoaded, onSubtitleCleared }: SubtitleLoaderProps) {
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  
  const [blocks, setBlocks] = useState<SubtitleBlock[] | null>(null);
  const [offsetMs, setOffsetMs] = useState<number>(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const videoFileName = useRoomStore(state => state.fileName);
  const { fetchSubtitles, isLoading, progress } = useSmartSubtitles();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (ext !== 'srt' && ext !== 'vtt') {
      setError('Only .srt and .vtt subtitle files are supported');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const MAX_SUBTITLE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (file.size > MAX_SUBTITLE_SIZE) {
      setError('Subtitle file is too large (max 10 MB)');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const parsedBlocks = parseSubtitles(content);
      setFilename(file.name);
      setOffsetMs(0);
      setBlocks(parsedBlocks);
    };

    reader.onerror = () => {
      setError('Could not parse subtitle file. Try a different file.');
    };

    reader.readAsText(file);
  };

  const handleClear = () => {
    setFilename(null);
    setError(null);
    setBlocks(null);
    setOffsetMs(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onSubtitleCleared();
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      setCurrentUrl(null);
    }
  };
  
  const handleMagicSubtitles = async () => {
    if (!videoFileName) {
      setError("No video file loaded.");
      return;
    }
    
    setError(null);
    const newBlocks = await fetchSubtitles(videoFileName);
    if (newBlocks) {
      setFilename(`[Magic] EN`);
      setOffsetMs(0);
      setBlocks(newBlocks);
    } else {
      setError("Failed to fetch subtitles.");
    }
  };

  // Re-generate VTT blob whenever blocks or offset changes
  useEffect(() => {
    if (!blocks || blocks.length === 0) return;

    const vtt = blocksToVttWithOffset(blocks, offsetMs);
    const blob = new Blob([vtt], { type: 'text/vtt' });
    const url = URL.createObjectURL(blob);
    
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    setCurrentUrl(url);
    onSubtitleLoaded(url);

    // Cleanup function not needed here as we manually revoke when replaced
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks, offsetMs]);

  const truncate = (name: string) => name.length > 20 ? name.substring(0, 20) + '...' : name;

  useEffect(() => {
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [currentUrl]);

  return (
    <div className="flex flex-col gap-2 bg-zinc-900/50 [.light_&]:bg-zinc-100/50 rounded-lg p-3 border border-zinc-800 [.light_&]:border-zinc-200">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-zinc-400 [.light_&]:text-zinc-500 text-xs font-semibold uppercase tracking-wider">Subtitles</h3>
        {blocks && (
          <div className="flex items-center gap-1.5 bg-zinc-800 [.light_&]:bg-zinc-200 rounded px-1.5 py-0.5">
            <button 
              onClick={() => setOffsetMs(o => o - 100)} 
              className="text-zinc-400 hover:text-white [.light_&]:text-zinc-500 [.light_&]:hover:text-black p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded"
              title="-100ms"
              aria-label="Decrease subtitle offset by 100 milliseconds"
            >
              <Minus size={12} />
            </button>
            <span aria-live="polite" className="text-[10px] font-mono text-zinc-300 [.light_&]:text-zinc-600 w-12 text-center">
              {offsetMs > 0 ? '+' : ''}{offsetMs / 1000}s
            </span>
            <button 
              onClick={() => setOffsetMs(o => o + 100)}
              className="text-zinc-400 hover:text-white [.light_&]:text-zinc-500 [.light_&]:hover:text-black p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70 rounded"
              title="+100ms"
              aria-label="Increase subtitle offset by 100 milliseconds"
            >
              <Plus size={12} />
            </button>
          </div>
        )}
      </div>
      
      {!filename ? (
        <>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".srt,.vtt" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 [.light_&]:bg-zinc-200 [.light_&]:hover:bg-zinc-300 text-zinc-300 [.light_&]:text-zinc-700 rounded-md transition-colors text-sm font-medium"
          >
            <Upload size={16} />
            Load manually (.srt or .vtt)
          </button>
          
          <div className="flex items-center mt-2 pt-2 border-t border-zinc-800 [.light_&]:border-zinc-200">
            <button 
              onClick={handleMagicSubtitles}
              disabled={isLoading || !videoFileName}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {progress}%
                </>
              ) : (
                <>
                  <Wand2 size={16} />
                  Fetch Magic Subtitles
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-between bg-teal-500/10 [.light_&]:bg-teal-500/5 border border-teal-500/20 text-teal-400 [.light_&]:text-teal-600 px-3 py-2 rounded-md">
          <div className="flex items-center gap-2 overflow-hidden">
            <Subtitles size={16} className="flex-shrink-0" />
            <span className="text-sm font-medium truncate" title={filename}>{truncate(filename)}</span>
            <span className="text-teal-500 [.light_&]:text-teal-600 font-bold ml-1 text-xs">✓</span>
          </div>
          <button 
            onClick={handleClear}
            className="text-teal-500 [.light_&]:text-teal-600 hover:text-white [.light_&]:hover:text-black hover:bg-teal-500/50 [.light_&]:hover:bg-teal-500/20 p-1 rounded transition-colors ml-2 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/70"
            title="Remove subtitles"
            aria-label="Remove subtitles"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="text-red-400 [.light_&]:text-red-500 text-xs mt-1 bg-red-400/10 p-2 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
