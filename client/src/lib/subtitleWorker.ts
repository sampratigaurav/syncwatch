import { parseSubtitles } from './subtitleUtils';

async function fetchSrtFromOpenSubtitles(fileName: string, apiKey: string): Promise<string> {
  const cleanFileName = fileName.replace(/\.[^/.]+$/, "").replace(/[.\-_]/g, ' ');

  const searchUrl = new URL('https://api.opensubtitles.com/api/v1/subtitles');
  searchUrl.searchParams.append('query', cleanFileName);
  searchUrl.searchParams.append('languages', 'en');
  searchUrl.searchParams.append('order_by', 'download_count');
  searchUrl.searchParams.append('order_direction', 'desc');

  const searchRes = await fetch(searchUrl.toString(), {
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
    }
  });

  if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.statusText}`);
  const searchData = await searchRes.json();

  if (!searchData.data || searchData.data.length === 0) {
    throw new Error('No subtitles found for this file.');
  }

  const fileId = searchData.data[0].attributes.files[0].file_id;

  const downloadRes = await fetch('https://api.opensubtitles.com/api/v1/download', {
    method: 'POST',
    headers: {
      'Api-Key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({ file_id: fileId })
  });

  if (!downloadRes.ok) throw new Error(`Download failed: ${downloadRes.statusText}`);
  const downloadData = await downloadRes.json();

  const fileLink = downloadData.link;
  if (!fileLink) throw new Error('Could not get file download link.');

  const srtRes = await fetch(fileLink);
  if (!srtRes.ok) throw new Error(`Failed to fetch SRT content: ${srtRes.statusText}`);

  return await srtRes.text();
}

self.onmessage = async (e: MessageEvent) => {
  const { srtContent, fileName, apiKey } = e.data;

  try {
    let rawSrt: string;

    if (srtContent) {
      rawSrt = srtContent;
    } else if (fileName && apiKey) {
      rawSrt = await fetchSrtFromOpenSubtitles(fileName, apiKey);
    } else {
      self.postMessage({ type: 'ERROR', error: 'No content or filename provided.' });
      return;
    }

    self.postMessage({ type: 'PROGRESS', percent: 50 });
    
    // Parse to blocks and return directly to main thread
    const blocks = parseSubtitles(rawSrt);
    self.postMessage({ type: 'COMPLETE', blocks });

  } catch (err: any) {
    self.postMessage({ type: 'ERROR', error: err.message || 'Worker error occurred.' });
  }
};
