import React, { useState, useRef, useEffect } from 'react';
import { Subtitles, X, Upload, Wand2, Loader2 } from 'lucide-react';
import { useRoomStore } from '../store/roomStore';
import { useWebRTC } from '../hooks/useWebRTC';
import { useSmartSubtitles } from '../hooks/useSmartSubtitles';

interface SubtitleLoaderProps {
  onSubtitleLoaded: (blobUrl: string) => void;
  onSubtitleCleared: () => void;
}

export default function SubtitleLoader({ onSubtitleLoaded, onSubtitleCleared }: SubtitleLoaderProps) {
  const [filename, setFilename] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string>('en');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const videoFileName = useRoomStore(state => state.fileName);
  const { fetchSubtitles, isLoading, progress, error: smartError } = useSmartSubtitles();

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

      let vttContent = content;

      if (ext === 'srt') {
        // Convert SRT to VTT natively
        vttContent = 'WEBVTT\n\n' + content.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
      }

      const blob = new Blob([vttContent], { type: 'text/vtt' });
      const url = URL.createObjectURL(blob);
      
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      setCurrentUrl(url);

      setFilename(file.name);
      onSubtitleLoaded(url);

      const role = useRoomStore.getState().role;
      if (role === 'host') {
        useWebRTC.getState().sendSubtitlePayload(vttContent);
      }
    };

    reader.onerror = () => {
      setError('Could not parse subtitle file. Try a different file.');
    };

    reader.readAsText(file);
  };

  const handleClear = () => {
    setFilename(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onSubtitleCleared();
    if (currentUrl) {
      URL.revokeObjectURL(currentUrl);
      setCurrentUrl(null);
    }
    const role = useRoomStore.getState().role;
    if (role === 'host') {
      useWebRTC.getState().sendSubtitlePayload('');
    }
  };
  
  const handleMagicSubtitles = async () => {
    if (!videoFileName) {
      setError("No video file loaded.");
      return;
    }
    
    setError(null);
    const blobUrl = await fetchSubtitles(videoFileName, targetLanguage);
    if (blobUrl) {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      setCurrentUrl(blobUrl);
      setFilename(`[Magic] ${targetLanguage.toUpperCase()}`);
      onSubtitleLoaded(blobUrl);
      
      // Send payload if host? No, architecture says host/viewers fetch their own.
      // Wait, we need to read the blob content and send if host, OR simply don't send via WebRTC.
      // The instructions say: "DON'T sync subtitles via Socket.IO: Keep to the architecture. The host fetches/translates their subtitles, and viewers click the button to fetch/translate their own. Do not stream subtitle text through the Node server."
      // BUT for manual upload, we currently send via WebRTC. We can skip WebRTC for magic subtitles.
    }
  };

  const truncate = (name: string) => name.length > 20 ? name.substring(0, 20) + '...' : name;

  useEffect(() => {
    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [currentUrl]);

  return (
    <div className="flex flex-col gap-2 bg-zinc-900/50 [.light_&]:bg-zinc-100/50 rounded-lg p-3 border border-zinc-800 [.light_&]:border-zinc-200">
      <h3 className="text-zinc-400 [.light_&]:text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Subtitles (optional)</h3>
      
      {!filename ? (
        <>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 w-full py-2 bg-zinc-800 hover:bg-zinc-700 [.light_&]:bg-zinc-200 [.light_&]:hover:bg-zinc-300 text-zinc-300 [.light_&]:text-zinc-700 rounded-md transition-colors text-sm font-medium"
          >
            <Upload size={16} />
            Load manually (.srt or .vtt)
          </button>
          
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-800 [.light_&]:border-zinc-200">
            <select 
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
              disabled={isLoading}
              className="bg-zinc-800 [.light_&]:bg-zinc-200 text-zinc-300 [.light_&]:text-zinc-700 text-xs rounded px-2 py-1.5 flex-shrink-0 outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="en">English (Original)</option>
              <option value="hi">Hindi</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
            
            <button 
              onClick={handleMagicSubtitles}
              disabled={isLoading || !videoFileName}
              className="flex-grow flex items-center justify-center gap-1.5 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 rounded transition-colors text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  {progress}%
                </>
              ) : (
                <>
                  <Wand2 size={14} />
                  Magic Subtitles
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
            className="text-teal-500 [.light_&]:text-teal-600 hover:text-white [.light_&]:hover:text-black hover:bg-teal-500/50 [.light_&]:hover:bg-teal-500/20 p-1 rounded transition-colors ml-2 flex-shrink-0"
            title="Remove subtitles"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {(error || smartError) && (
        <p className="text-red-400 [.light_&]:text-red-500 text-xs mt-1 font-medium">{error || smartError}</p>
      )}

      <input 
        type="file"
        ref={fileInputRef}
        accept=".srt,.vtt"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
