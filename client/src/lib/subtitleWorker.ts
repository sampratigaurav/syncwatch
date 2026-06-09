// client/src/lib/subtitleWorker.ts

interface SubtitleBlock {
  id: string;
  time: string;
  text: string[];
}

// Simple function to parse SRT content into blocks
function parseSrt(content: string): SubtitleBlock[] {
  // Normalize line endings
  const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  
  const parsedBlocks: SubtitleBlock[] = [];
  
  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    if (lines.length >= 3) {
      parsedBlocks.push({
        id: lines[0].trim(),
        time: lines[1].trim(),
        text: lines.slice(2).map(l => l.trim()).filter(l => l),
      });
    }
  }
  return parsedBlocks;
}

// Convert SRT timestamp (00:00:00,000) to VTT timestamp (00:00:00.000)
function timeToVtt(timeStr: string): string {
  return timeStr.replace(/,/g, '.');
}

/**
 * Translates an array of text lines using a REST API.
 * 
 * To switch to Google Cloud Translation API:
 * 1. Change URL to: `https://translation.googleapis.com/language/translate/v2?key=YOUR_API_KEY`
 * 2. Change payload format:
 *    body: JSON.stringify({ q: lines, target: targetLanguage, source: 'en' })
 * 3. Extract results from `data.data.translations`
 */
async function translateChunk(lines: string[], targetLanguage: string): Promise<string[]> {
  try {
    // Note: This uses a public LibreTranslate instance for demonstration.
    // Public instances often have strict rate limits.
    const res = await fetch('https://translate.argosopentech.com/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: lines,
        source: 'en',
        target: targetLanguage,
        format: 'text'
      })
    });
    
    if (!res.ok) {
      throw new Error(`Translation API error: ${res.status}`);
    }
    
    const data = await res.json();
    if (data.translatedText && Array.isArray(data.translatedText)) {
      return data.translatedText;
    }
    
    // Some endpoints might return a single string if we sent a single element array
    if (typeof data.translatedText === 'string') {
      return [data.translatedText];
    }
    
    return lines; // fallback if parsing fails
  } catch (err) {
    console.error("Translation chunk failed, returning original text.", err);
    return lines; // fallback to English
  }
}

self.onmessage = async (e: MessageEvent) => {
  const { srtContent, targetLanguage } = e.data;
  
  if (!srtContent) {
    self.postMessage({ type: 'ERROR', error: 'No content provided' });
    return;
  }
  
  self.postMessage({ type: 'PROGRESS', percent: 5 });
  
  const blocks = parseSrt(srtContent);
  self.postMessage({ type: 'PROGRESS', percent: 10 });
  
  // If target language is english, we skip translation
  if (!targetLanguage || targetLanguage === 'en') {
    let vtt = 'WEBVTT\n\n';
    blocks.forEach(b => {
      vtt += `${b.id}\n${timeToVtt(b.time)}\n${b.text.join('\n')}\n\n`;
    });
    
    const blob = new Blob([vtt], { type: 'text/vtt' });
    const blobUrl = URL.createObjectURL(blob);
    self.postMessage({ type: 'COMPLETE', blobUrl });
    return;
  }

  // Translation process
  const CHUNK_SIZE = 50; // Translate 50 lines at a time
  
  // Extract all lines to translate while remembering their mappings to blocks
  const allLines: string[] = [];
  const lineToBlockMapping: { blockIndex: number, lineIndex: number }[] = [];
  
  blocks.forEach((block, bIdx) => {
    block.text.forEach((line, lIdx) => {
      allLines.push(line);
      lineToBlockMapping.push({ blockIndex: bIdx, lineIndex: lIdx });
    });
  });
  
  const totalChunks = Math.ceil(allLines.length / CHUNK_SIZE);
  const translatedLines: string[] = new Array(allLines.length);
  
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, allLines.length);
    const chunk = allLines.slice(start, end);
    
    const translatedChunk = await translateChunk(chunk, targetLanguage);
    
    for (let j = 0; j < chunk.length; j++) {
      // If the API didn't return enough lines, fallback to original
      translatedLines[start + j] = translatedChunk[j] || chunk[j];
    }
    
    // Wait 500ms between requests to prevent rate limiting
    if (i < totalChunks - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Progress update (from 10% to 95%)
    const progress = 10 + Math.floor(((i + 1) / totalChunks) * 85);
    self.postMessage({ type: 'PROGRESS', percent: progress });
  }
  
  // Re-assemble into VTT
  let vtt = 'WEBVTT\n\n';

  // Re-implementing re-assembly with safer index mapping
  let currentLineIdx = 0;
  blocks.forEach((block) => {
    vtt += `${block.id}\n${timeToVtt(block.time)}\n`;
    for (let i = 0; i < block.text.length; i++) {
      vtt += `${translatedLines[currentLineIdx]}\n`;
      currentLineIdx++;
    }
    vtt += `\n`;
  });
  
  self.postMessage({ type: 'PROGRESS', percent: 100 });
  
  const blob = new Blob([vtt], { type: 'text/vtt' });
  const blobUrl = URL.createObjectURL(blob);
  
  self.postMessage({ type: 'COMPLETE', blobUrl });
};
