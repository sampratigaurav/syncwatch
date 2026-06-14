import { useState, useRef, useCallback } from 'react';

interface SubtitleState {
  isLoading: boolean;
  progress: number;
  error: string | null;
}

export const useSmartSubtitles = () => {
  const [state, setState] = useState<SubtitleState>({
    isLoading: false,
    progress: 0,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);

  const fetchSubtitles = useCallback((fileName: string, targetLanguage: string): Promise<string | null> => {
    // Validate the API key on the main thread before spinning up the worker
    const API_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY;
    if (!API_KEY || API_KEY === 'your_api_key_here') {
      setState({ isLoading: false, progress: 0, error: 'OpenSubtitles API key is missing. Add VITE_OPENSUBTITLES_API_KEY to your .env' });
      return Promise.resolve(null);
    }

    setState({ isLoading: true, progress: 0, error: null });

    // Terminate any existing worker
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }

    // IMPORTANT: All network fetches (OpenSubtitles + LibreTranslate) run INSIDE the worker.
    // This keeps the main thread 100% free so Socket.IO heartbeats are never starved,
    // which was causing the host to be reconnected as a viewer.
    return new Promise<string | null>((resolve) => {
      const worker = new Worker(new URL('../lib/subtitleWorker.ts', import.meta.url), { type: 'module' });
      workerRef.current = worker;

      worker.onmessage = (e) => {
        if (e.data.type === 'PROGRESS') {
          setState(s => ({ ...s, progress: e.data.percent }));
        } else if (e.data.type === 'COMPLETE') {
          setState({ isLoading: false, progress: 100, error: null });
          worker.terminate();
          workerRef.current = null;
          
          const blob = new Blob([e.data.vtt], { type: 'text/vtt' });
          const blobUrl = URL.createObjectURL(blob);
          resolve(blobUrl);
        } else if (e.data.type === 'ERROR') {
          setState({ isLoading: false, progress: 0, error: e.data.error });
          worker.terminate();
          workerRef.current = null;
          resolve(null);
        }
      };

      worker.onerror = (err) => {
        console.error('SubtitleWorker crashed:', err);
        setState({ isLoading: false, progress: 0, error: 'Worker error occurred.' });
        worker.terminate();
        workerRef.current = null;
        resolve(null);
      };

      // Pass fileName + apiKey to worker — it handles ALL fetching internally
      worker.postMessage({ fileName, targetLanguage, apiKey: API_KEY });
    });
  }, []);

  const cancelSubtitles = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setState({ isLoading: false, progress: 0, error: null });
  }, []);

  return { ...state, fetchSubtitles, cancelSubtitles };
};
