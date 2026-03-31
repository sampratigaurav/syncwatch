# SyncWatch Chrome Extension

Watch YouTube in perfect sync with friends — no downloads, no DRM bypass.
Only play/pause/seek signals are relayed through the SyncWatch server.

## Installation

### Prerequisites
- Node.js 18+
- npm 9+

### Build & Load

```bash
# 1. Navigate to the extension folder
cd extension

# 2. Install dependencies
npm install

# 3. Build (also generates icons)
npm run build
```

4. Open `chrome://extensions` in Chrome
5. Enable **Developer mode** (top-right toggle)
6. Click **Load unpacked**
7. Select the `dist/` folder inside `extension/`
8. Pin the **SyncWatch** icon in the Chrome toolbar

### Usage

1. Navigate to any YouTube video (e.g. `https://www.youtube.com/watch?v=...`)
2. Click the SyncWatch icon in the toolbar
3. Enter your nickname
4. **Create Room** (you become the host) — share the room code with friends
5. Friends open the **same YouTube video**, click the icon, enter the code → **Join**
6. Press Play on the host tab — everyone's player follows in sync

### Watching together

- The **host** controls playback. Play, pause, and seek are broadcast to all viewers.
- **Viewers** have their player automatically adjusted to match the host.
- A drift-correction check runs every 5 seconds to keep everyone within 500 ms.
- The room code is 6 hex characters (e.g. `A3F8C2`). Share it however you like.

### Development

```bash
# Watch mode — rebuilds on file change
npm run dev
```

Then reload the extension from `chrome://extensions` after each build.

### Architecture

| Context | File | World | Purpose |
|---------|------|-------|---------|
| Service Worker | `src/background/index.ts` | — | Socket.io connection, room state, message routing |
| Content Script | `src/content/index.ts` | Isolated | Bridge between page and background; keep-alive port |
| Page Script | `src/page/index.ts` | MAIN | YouTube player control, event detection |
| Popup | `src/popup/App.tsx` | — | Create/join room UI, participant list |

Message flow:
```
YouTube Player (MAIN)
    ↕ window.postMessage (source validated)
Content Script (Isolated)
    ↕ chrome.runtime.sendMessage / chrome.tabs.sendMessage
Background Service Worker
    ↕ Socket.io (WebSocket)
SyncWatch Server
```

### Test checklist

| # | Test | Expected |
|---|------|----------|
| 1 | Extension loads | No errors in chrome://extensions |
| 2 | Service worker | No errors in background console |
| 3 | Icon shows | Visible in toolbar |
| 4 | Popup opens | No crash |
| 5 | YouTube detection | "YouTube video detected ✓" on watch page |
| 6 | Non-YouTube tab | "Navigate to a YouTube video first" |
| 7 | Nickname persists | Pre-filled after reopen |
| 8 | Create Room | Room code shown |
| 9 | Copy button | Code copied, "Copied!" shown |
| 10 | Second profile joins | Code input → join succeeds |
| 11 | Participant list | Both users visible |
| 12 | Host plays | Viewer plays |
| 13 | Host pauses | Viewer pauses |
| 14 | Host seeks | Viewer jumps |
| 15 | 30-second drift | Both within 500 ms |
| 16 | Viewer navigates | No crash, graceful handling |
| 17 | Close/reopen popup | State preserved |
| 18 | Leave room | Returns to idle state |
