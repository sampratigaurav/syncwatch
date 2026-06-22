import type { Instance, Torrent } from 'webtorrent';

class TorrentManager {
  private client: Instance | null = null;
  public activeTorrent: Torrent | null = null;
  private onProgressCb: ((progress: number, speed: number, peers: number) => void) | null = null;
  private onReadyCb: ((torrent: Torrent) => void) | null = null;
  private updateInterval: ReturnType<typeof setInterval> | null = null;

  async getClient(): Promise<Instance> {
    if (!this.client) {
      // Dynamically import WebTorrent to keep the initial bundle small
      const WebTorrent = (await import('webtorrent')).default;
      this.client = new WebTorrent() as Instance;
    }
    return this.client;
  }

  async seed(file: File, onReady: (magnetURI: string) => void): Promise<void> {
    this.cleanup();
    const client = await this.getClient();

    client.seed(file, (torrent: Torrent) => {
      this.activeTorrent = torrent;
      onReady(torrent.magnetURI);
      this.startTracking();
    });
  }

  async download(magnetURI: string, onReady: (torrent: Torrent) => void): Promise<void> {
    this.cleanup();
    this.onReadyCb = onReady;
    const client = await this.getClient();

    client.add(magnetURI, (torrent: Torrent) => {
      this.activeTorrent = torrent;
      if (this.onReadyCb) this.onReadyCb(torrent);
      this.startTracking();
    });
  }

  onProgress(cb: (progress: number, speed: number, peers: number) => void) {
    this.onProgressCb = cb;
  }

  private startTracking() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    this.updateInterval = setInterval(() => {
      if (this.activeTorrent && this.onProgressCb) {
        this.onProgressCb(
          this.activeTorrent.progress,
          this.activeTorrent.downloadSpeed,
          this.activeTorrent.numPeers
        );
      }
    }, 1000);
  }

  renderTo(videoElement: HTMLVideoElement) {
    if (!this.activeTorrent) return;
    const file = this.activeTorrent.files.find((f: any) => f.name.endsWith('.mp4') || f.name.endsWith('.webm') || f.name.endsWith('.mkv'));
    if (file) {
      file.renderTo(videoElement);
    }
  }

  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.activeTorrent) {
      try {
        this.activeTorrent.destroy();
      } catch (e) {
        console.error('Error destroying torrent', e);
      }
      this.activeTorrent = null;
    }
  }

  async destroyClient() {
    this.cleanup();
    if (this.client) {
      return new Promise<void>((resolve) => {
        this.client!.destroy((err) => {
          if (err) console.error('Error destroying WebTorrent client', err);
          this.client = null;
          resolve();
        });
      });
    }
  }
}

export const torrentManager = new TorrentManager();
