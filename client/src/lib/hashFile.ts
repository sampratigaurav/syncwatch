export {};
/// <reference lib="webworker" />

self.onmessage = async (e: MessageEvent<File>) => {
  const file = e.data;
  if (!file) return;

  try {
    // Hash three 2 MB windows (start, middle, end) plus the file size encoded as 8 bytes.
    // This provides much stronger collision resistance than hashing only the first 1 MB
    // while avoiding loading the entire (potentially multi-GB) file into memory at once.
    const CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB per window

    const readChunk = (start: number, end: number): Promise<Uint8Array> =>
      file.slice(start, end).arrayBuffer().then(buf => new Uint8Array(buf));

    const chunks: Uint8Array[] = [];

    // Beginning
    chunks.push(await readChunk(0, Math.min(CHUNK_SIZE, file.size)));

    // Middle — only when the file is large enough that the middle window
    // cannot overlap with either the beginning or end windows.
    // Requires file.size > 3 * CHUNK_SIZE (6 MB).
    if (file.size > 3 * CHUNK_SIZE) {
      const midStart = Math.floor(file.size / 2) - Math.floor(CHUNK_SIZE / 2);
      chunks.push(await readChunk(midStart, midStart + CHUNK_SIZE));
    }

    // End (only if file is large enough to avoid overlap with beginning)
    if (file.size > CHUNK_SIZE) {
      chunks.push(await readChunk(Math.max(0, file.size - CHUNK_SIZE), file.size));
    }

    // Encode file size as a fixed-width 8-byte little-endian integer so that two files
    // with identical sampled content but different lengths produce different hashes.
    const sizeBytes = new Uint8Array(8);
    const view = new DataView(sizeBytes.buffer);
    view.setBigUint64(0, BigInt(file.size), true);
    chunks.push(sizeBytes);

    // Concatenate all chunks and compute a single SHA-256 digest
    const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', combined);
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
