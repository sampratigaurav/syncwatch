export interface SubtitleBlock {
  id: string;
  time: string;
  text: string[];
}

export function parseSubtitles(content: string): SubtitleBlock[] {
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

/**
 * Parses "HH:MM:SS.mmm" or "HH:MM:SS,mmm" into total milliseconds.
 */
function parseTimeToMs(timeStr: string): number {
  const parts = timeStr.trim().split(/[:.,]/);
  if (parts.length < 4) return 0; // Invalid format
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  const seconds = parseInt(parts[2], 10) || 0;
  const ms = parseInt(parts[3], 10) || 0;
  return hours * 3600000 + minutes * 60000 + seconds * 1000 + ms;
}

/**
 * Converts milliseconds back to "HH:MM:SS.mmm" format required by WebVTT.
 */
function formatMsToTime(ms: number): string {
  // Ensure we don't go below 0
  const totalMs = Math.max(0, ms);
  const hours = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const milliseconds = totalMs % 1000;
  
  const pad = (num: number, size: number) => num.toString().padStart(size, '0');
  return `${pad(hours, 2)}:${pad(minutes, 2)}:${pad(seconds, 2)}.${pad(milliseconds, 3)}`;
}

/**
 * Shifts the time string "Start --> End" by the specified offset in milliseconds.
 */
export function shiftTime(timeStr: string, offsetMs: number): string {
  if (offsetMs === 0) return timeStr.replace(/,/g, '.');
  
  const parts = timeStr.split('-->');
  if (parts.length !== 2) return timeStr.replace(/,/g, '.');
  
  const startMs = parseTimeToMs(parts[0]);
  const endMs = parseTimeToMs(parts[1]);
  
  const newStart = formatMsToTime(startMs + offsetMs);
  const newEnd = formatMsToTime(endMs + offsetMs);
  
  return `${newStart} --> ${newEnd}`;
}

export function blocksToVttWithOffset(blocks: SubtitleBlock[], offsetMs: number = 0): string {
  let vtt = 'WEBVTT\n\n';
  for (const block of blocks) {
    vtt += `${block.id}\n`;
    vtt += `${shiftTime(block.time, offsetMs)}\n`;
    for (const line of block.text) {
      vtt += `${line}\n`;
    }
    vtt += '\n';
  }
  return vtt;
}
