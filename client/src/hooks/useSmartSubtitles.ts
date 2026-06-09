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

  const fetchSubtitles = useCallback(async (fileName: string, targetLanguage: string): Promise<string | null> => {
    setState({ isLoading: true, progress: 0, error: null });

    try {
      const API_KEY = import.meta.env.VITE_OPENSUBTITLES_API_KEY;
      if (!API_KEY || API_KEY === 'your_api_key_here') {
        throw new Error('OpenSubtitles API key is missing. Add VITE_OPENSUBTITLES_API_KEY to your .env');
      }

      // 1. Search for English subtitle
      setState(s => ({ ...s, progress: 5 }));
      const cleanFileName = fileName.replace(/\.[^/.]+$/, ""); // remove extension
      const searchUrl = new URL('https://api.opensubtitles.com/api/v1/subtitles');
      searchUrl.searchParams.append('query', cleanFileName);
      searchUrl.searchParams.append('languages', 'en');
      searchUrl.searchParams.append('order_by', 'download_count');
      searchUrl.searchParams.append('order_direction', 'desc');

      const searchRes = await fetch(searchUrl.toString(), {
        headers: {
          'Api-Key': API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'SyncWatch v1'
        }
      });

      if (!searchRes.ok) {
        throw new Error('Failed to search OpenSubtitles.');
      }

      const searchData = await searchRes.json();
      if (!searchData.data || searchData.data.length === 0) {
        throw new Error('No subtitles found for this video.');
      }

      // Pick the best match file ID
      const bestMatch = searchData.data[0];
      const fileId = bestMatch.attributes.files[0].file_id;

      setState(s => ({ ...s, progress: 10 }));

      // 2. Request download link
      const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
        method: 'POST',
        headers: {
          'Api-Key': API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'SyncWatch v1',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ file_id: fileId })
      });

      if (!downloadRes.ok) {
        throw new Error('Failed to request subtitle download link.');
      }

      const downloadData = await downloadRes.json();
      const srtLink = downloadData.link;

      setState(s => ({ ...s, progress: 15 }));

      // 3. Download the actual .srt text
      const srtRes = await fetch(srtLink);
      if (!srtRes.ok) {
        throw new Error('Failed to download subtitle file.');
      }
      
      const srtContent = await srtRes.text();

      // 4. Pass to Web Worker for processing
      return new Promise<string | null>((resolve) => {
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        const worker = new Worker(new URL('../lib/subtitleWorker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        worker.onmessage = (e) => {
          if (e.data.type === 'PROGRESS') {
            // Worker progress is from 5 to 100, we map to overall progress (15 to 100)
            const overallProgress = 15 + Math.floor((e.data.percent / 100) * 85);
            setState(s => ({ ...s, progress: overallProgress }));
          } else if (e.data.type === 'COMPLETE') {
            setState({ isLoading: false, progress: 100, error: null });
            worker.terminate();
            workerRef.current = null;
            resolve(e.data.blobUrl);
          } else if (e.data.type === 'ERROR') {
            setState({ isLoading: false, progress: 0, error: e.data.error });
            worker.terminate();
            workerRef.current = null;
            resolve(null); // resolve null so we don't crash the UI, but show error
          }
        };

        worker.onerror = () => {
          setState({ isLoading: false, progress: 0, error: 'Worker error occurred.' });
          worker.terminate();
          workerRef.current = null;
          resolve(null);
        };

        worker.postMessage({
          srtContent,
          targetLanguage
        });
      });

    } catch (err: any) {
      console.error(err);
      setState({ isLoading: false, progress: 0, error: err.message || 'An unknown error occurred.' });
      return null;
    }
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
