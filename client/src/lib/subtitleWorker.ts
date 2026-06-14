// client/src/lib/subtitleWorker.ts
// ALL network operations run here in the worker thread so the main thread's
// Socket.IO heartbeat is NEVER starved by slow API calls.

interface SubtitleBlock {
  id: string;
  time: string;
  text: string[];
}

function parseSubtitles(content: string): SubtitleBlock[] {
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const parsedBlocks: SubtitleBlock[] = [];
  
  if (blocks[0] && blocks[0].trim().toUpperCase().startsWith('WEBVTT')) {
    blocks.shift();
  }

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    
    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }

    if (timeLineIdx !== -1) {
      parsedBlocks.push({
        id: timeLineIdx > 0 ? lines[0].trim() : '',
        time: lines[timeLineIdx].trim(),
        text: lines.slice(timeLineIdx + 1).map(l => l.trim()).filter(l => l),
      });
    }
  }
  return parsedBlocks;
}

function timeToVtt(timeStr: string): string {
  return timeStr.replace(/,/g, '.');
}

/**
 * Translates an array of text lines using a REST API.
 *
 * To switch to Google Cloud Translation API:
 * 1. Change URL to: `https://translation.googleapis.com/language/translate/v2?key=YOUR_API_KEY`
 * 2. Change payload: body: JSON.stringify({ q: lines, target: targetLanguage, source: 'en' })
 * 3. Extract results from: data.data.translations
 */
async function translateChunk(lines: string[], targetLanguage: string): Promise<string[]> {
  try {
    const res = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: lines, source: 'en', target: targetLanguage, format: 'text' })
    });
    if (!res.ok) throw new Error(`Translation API error: ${res.status}`);
    const data = await res.json();
    if (data.translatedText && Array.isArray(data.translatedText)) return data.translatedText;
    if (typeof data.translatedText === 'string') return [data.translatedText];
    return lines;
  } catch (err) {
    console.error('Translation chunk failed, returning original text.', err);
    return lines;
  }
}

/**
 * Fetches subtitle content from OpenSubtitles entirely inside the worker.
 * Keeps the main thread free so socket heartbeats are never delayed.
 */
async function fetchSrtFromOpenSubtitles(fileName: string, apiKey: string): Promise<string> {
  // Step 1: Search
  self.postMessage({ type: 'PROGRESS', percent: 5 });
  const cleanFileName = fileName.replace(/\.[^/.]+$/, '');
  const searchUrl = new URL('https://api.opensubtitles.com/api/v1/subtitles');
  searchUrl.searchParams.append('query', cleanFileName);
  searchUrl.searchParams.append('languages', 'en');
  searchUrl.searchParams.append('order_by', 'download_count');
  searchUrl.searchParams.append('order_direction', 'desc');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json', 'User-Agent': 'SyncWatch v1' }
  });
  if (!searchRes.ok) throw new Error('Failed to search OpenSubtitles.');
  const searchData = await searchRes.json();
  if (!searchData.data || searchData.data.length === 0) throw new Error('No subtitles found for this video.');

  // Step 2: Get download link
  self.postMessage({ type: 'PROGRESS', percent: 10 });
  const fileId = searchData.data[0].attributes.files[0].file_id;
  const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
    method: 'POST',
    headers: { 'Api-Key': apiKey, 'Content-Type': 'application/json', 'User-Agent': 'SyncWatch v1', 'Accept': 'application/json' },
    body: JSON.stringify({ file_id: fileId })
  });
  if (!downloadRes.ok) throw new Error('Failed to request subtitle download link.');
  const downloadData = await downloadRes.json();

  // Step 3: Download .srt text
  self.postMessage({ type: 'PROGRESS', percent: 15 });
  const srtRes = await fetch(downloadData.link);
  if (!srtRes.ok) throw new Error('Failed to download subtitle file.');
  return srtRes.text();
}

function blocksToVtt(blocks: SubtitleBlock[], translatedLines?: string[]): string {
  let vtt = 'WEBVTT\n\n';
  let lineIdx = 0;
  blocks.forEach(block => {
    vtt += `${block.id}\n${timeToVtt(block.time)}\n`;
    for (let i = 0; i < block.text.length; i++) {
      vtt += `${translatedLines ? (translatedLines[lineIdx] ?? block.text[i]) : block.text[i]}\n`;
      lineIdx++;
    }
    vtt += '\n';
  });
  return vtt;
}

self.onmessage = async (e: MessageEvent) => {
  const { srtContent, fileName, targetLanguage, apiKey } = e.data;

  try {
    let rawSrt: string;

    if (srtContent) {
      // Manual upload path: SRT content already provided by main thread
      rawSrt = srtContent;
    } else if (fileName && apiKey) {
      // Magic subtitle path: fetch everything here inside the worker
      rawSrt = await fetchSrtFromOpenSubtitles(fileName, apiKey);
    } else {
      self.postMessage({ type: 'ERROR', error: 'No content or filename provided.' });
      return;
    }

    self.postMessage({ type: 'PROGRESS', percent: 18 }); // The raw text might be SRT or VTT.
    const blocks = parseSubtitles(rawSrt);

    // English (original) — no translation needed
    if (!targetLanguage || targetLanguage === 'en') {
      const vtt = blocksToVtt(blocks);
      self.postMessage({ type: 'COMPLETE', vtt });
      return;
    }

    // Translation path
    const CHUNK_SIZE = 50;
    const allLines: string[] = [];
    blocks.forEach(block => block.text.forEach(line => allLines.push(line)));
    const totalChunks = Math.ceil(allLines.length / CHUNK_SIZE);
    const translatedLines: string[] = new Array(allLines.length);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, allLines.length);
      const chunk = allLines.slice(start, end);
      const translatedChunk = await translateChunk(chunk, targetLanguage);
      for (let j = 0; j < chunk.length; j++) {
        translatedLines[start + j] = translatedChunk[j] || chunk[j];
      }
      if (i < totalChunks - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      const progress = 18 + Math.floor(((i + 1) / totalChunks) * 77);
      self.postMessage({ type: 'PROGRESS', percent: progress });
    }

    const vtt = blocksToVtt(blocks, translatedLines);
    self.postMessage({ type: 'COMPLETE', vtt });

  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err.message || 'Worker error occurred.' });
  }
};
