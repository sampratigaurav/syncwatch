export {};
/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;
  if (!file) return;

  try {
    const CHUNK_SIZE = 1024 * 1024; // 1MB
    const slice = file.slice(0, CHUNK_SIZE);
    const buffer = await slice.arrayBuffer();
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    self.postMessage({
      hash: hashHex,
      size: file.size,
      name: file.name
    });
  } catch (error: any) {
    self.postMessage({ error: error.message || 'Hash computation failed' });
  }
};
