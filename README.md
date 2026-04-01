<div align="center">

<br />

<img src="client/public/favicon.svg" width="72" height="72" alt="SyncWatch logo" />

<h1>SyncWatch</h1>

<p>
  <strong>Watch together. Stay in sync. Zero uploads.</strong><br />
  A real-time, peer-to-peer synchronized watch party — your video never leaves your device.
</p>

<p>
  <a href="https://syncwatch-eosin.vercel.app"><img src="https://img.shields.io/badge/Live-Demo-1D9E75?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/Socket.IO-4.x-010101?style=for-the-badge&logo=socket.io&logoColor=white" alt="Socket.IO" />
  <img src="https://img.shields.io/badge/Redis-Backed-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge" alt="MIT License" />
</p>

<br />

![SyncWatch Hero](https://syncwatch-eosin.vercel.app/preview.png)

</div>

---

## ✨ What is SyncWatch?

SyncWatch is a **zero-upload watch party platform**. Instead of streaming video through a server, everyone loads their own local copy of the same file. SyncWatch acts as an ultra-low-latency **signaling relay** — broadcasting play, pause, and seek commands in real time to keep all viewers perfectly in sync.

> "A shared remote control over the internet for your local video player."

No CDN. No encoding. No legal grey areas. Just sync.

---

## 🎯 Key Features

| Feature | Description |
|---|---|
| **Zero-Upload Sync** | Watch any file — even 4K — instantly. Media never hits the network. |
| **Sub-Second Sync** | Custom drift-correction loop keeps all viewers within ≤500 ms of the host. |
| **File Verification** | SHA-256 multi-chunk hashing via Web Worker confirms everyone has the same file before playback starts. |
| **Host Authority + Delegation** | The room host controls playback by default. Optionally grant control to everyone or selected participants. |
| **Room PIN Protection** | Lock rooms with a 4–8 character PIN, stored as a PBKDF2 hash server-side. |
| **Real-Time Chat** | Built-in chat panel with system messages and emoji reactions. |
| **Voice Chat** | WebRTC peer-to-peer voice with speaking indicators and mute controls. |
| **Subtitle Sync** | Load `.srt` or `.vtt` subtitles — toggle and track changes sync across all viewers. |
| **Smart Buffering** | If any participant buffers, the room auto-pauses and resumes when everyone is ready. |
| **Reconnection Grace** | 30-second reconnect window with cryptographic token-based role reclamation. |
| **Emoji Reactions** | Floating animated emoji overlay during playback. |
| **Chrome Extension** | Watch YouTube together via the companion browser extension. |
| **Light / Dark Mode** | Full theme toggle, persisted in `localStorage`. |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Browser (Alice)                  │
│  ┌───────────────┐   File: movie.mp4 (local)         │
│  │  VideoPlayer  │   Hash: SHA-256 of 3 chunks       │
│  │  (HTML5 <vid>)│                                   │
│  └──────┬────────┘                                   │
│         │ play/pause/seek events                     │
│  ┌──────▼────────┐                                   │
│  │  useVideoSync │ ──── Socket.IO ────►              │
│  └───────────────┘                   │               │
└──────────────────────────────────────┼───────────────┘
                                       │
                             ┌─────────▼──────────┐
                             │   SyncWatch Server  │
                             │  (Express + Socket) │
                             │   Redis-backed room │
                             │   state & pub/sub   │
                             └─────────┬──────────┘
                                       │
┌──────────────────────────────────────┼───────────────┐
│                     Browser (Bob)    │               │
│  ┌──────────────┐   ◄───────────────┘               │
│  │ useDriftCorr │  playback_broadcast                │
│  └──────┬───────┘                                   │
│  ┌──────▼────────┐                                   │
│  │  VideoPlayer  │   File: movie.mp4 (local)         │
│  └───────────────┘                                   │
└──────────────────────────────────────────────────────┘
```

### Sync Engine

```
Host emits    → playback_event { action, currentTime, timestamp }
Server        → validates authority → broadcasts to room
Viewers apply → echo-suppressed via isApplyingRemoteEvent flag
Drift check   → every 5s host emits sync_check; viewers correct if |Δt| > 500ms
Latency comp  → targetTime + latencyMs / 2000 (half RTT offset)
```

---

## 🛠️ Tech Stack

### Frontend (`/client`)
| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| State | Zustand v5 |
| Realtime | Socket.IO Client v4 |
| Routing | React Router v7 |
| Hashing | Web Worker + SubtleCrypto SHA-256 |
| Voice | WebRTC + Web Audio API |

### Backend (`/server`)
| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 20 |
| Framework | Express v5 |
| Realtime | Socket.IO v4 |
| Language | TypeScript |
| State Store | Redis (TTL-based room GC) |
| Pub/Sub | `@socket.io/redis-adapter` |
| Security | Helmet, CORS whitelist, rate limiting, PBKDF2 PINs |

### Chrome Extension (`/extension`)
| Layer | Technology |
|---|---|
| Build | Vite + @crxjs/vite-plugin |
| UI | React 18 + inline styles |
| Player | YouTube DOM adapter (MAIN world) |
| Messaging | Chrome extension message bus |

### Infrastructure
| Component | Platform |
|---|---|
| Frontend | Vercel |
| Backend | Render (free tier) |
| Database | Redis (Upstash or Render Redis) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js **v20+**
- npm **v10+**
- Redis instance (local or remote)

### 1. Clone & Install

```bash
git clone https://github.com/sampratigaurav/syncwatch.git
cd syncwatch
npm install
```

### 2. Configure Environment

```bash
# server/.env (create this file)
PORT=3001
REDIS_URL=redis://localhost:6379
CLIENT_ORIGIN=http://localhost:5174
NODE_ENV=development
```

### 3. Run Locally

```bash
# Boot both client + server concurrently
npm run dev
```

| Service | URL |
|---|---|
| Client | `http://localhost:5174` |
| Server | `http://localhost:3001` |
| Health | `http://localhost:3001/health` |

---

## 🌍 Deployment

### Backend → Render

1. Create a **Web Service** on [Render](https://render.com)
2. Set the following:

| Setting | Value |
|---|---|
| Build Command | `npm install && npm run build:server` |
| Start Command | `npm run start:server` |
| `CLIENT_ORIGIN` env | `https://your-app.vercel.app` |
| `REDIS_URL` env | Your Redis connection string |

### Frontend → Vercel

1. Import repository at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `client`
3. Set **Framework Preset** to `Vite`
4. Add env variable:

```
VITE_SERVER_URL=https://your-render-backend.onrender.com
```

### Chrome Extension

```bash
cd extension
npm install
npm run build          # Generates dist/ + icons
```

Load the `dist/` folder as an **unpacked extension** in `chrome://extensions`.

---

## 📁 Project Structure

```
syncwatch/
├── client/                        # React frontend (Vite)
│   └── src/
│       ├── components/            # UI components
│       │   ├── VideoPlayer.tsx    # HTML5 <video> wrapper + custom controls
│       │   ├── Chat.tsx           # Real-time chat panel
│       │   ├── ParticipantList.tsx
│       │   ├── VoiceChat.tsx      # WebRTC voice
│       │   ├── ReactionOverlay.tsx
│       │   └── SubtitleLoader.tsx
│       ├── hooks/
│       │   ├── useVideoSync.ts    # Core sync logic + echo suppression
│       │   ├── useDriftCorrection.ts
│       │   ├── useSocket.ts       # Socket.IO connection management
│       │   ├── useFileVerify.ts   # Web Worker file hashing
│       │   └── useVoiceChat.ts    # WebRTC peer connections
│       ├── pages/
│       │   ├── Home.tsx           # Create / join room
│       │   ├── WaitingRoom.tsx    # File selection + verification
│       │   └── Room.tsx           # Active watch room
│       ├── store/
│       │   └── roomStore.ts       # Zustand global state
│       └── lib/
│           ├── hashFile.ts        # Web Worker (multi-chunk SHA-256)
│           └── config.ts          # Server URL config
│
├── server/
│   └── src/
│       ├── rooms/
│       │   └── RoomManager.ts     # Redis CRUD + TTL management
│       ├── socket/
│       │   └── handlers.ts        # All Socket.IO event handlers
│       └── routes/
│           └── rooms.ts           # REST endpoints
│
├── shared/
│   ├── types.ts                   # Shared TypeScript interfaces
│   └── socketEvents.ts            # Typed event name constants
│
└── extension/                     # Chrome extension (YouTube sync)
    └── src/
        ├── background/            # Service worker + socket relay
        ├── content/               # Bridge + keep-alive port
        ├── page/                  # YouTube player adapter (MAIN world)
        └── popup/                 # Extension UI (React)
```

---

## 🔐 Security

SyncWatch is built with production security in mind:

- **CORS whitelist** — only known origins may connect via HTTP and WebSocket
- **Helmet** — sets `X-Content-Type-Options`, `X-Frame-Options`, CSP, and HSTS headers
- **PBKDF2 room PINs** — passwords are never stored in plaintext; 100,000 iterations with a random salt
- **IP-based rate limiting** — WebSocket connections (20/min/IP), room creation (10/min/IP), PIN attempts (5/min/IP), and chat (5 messages / 3s)
- **Server-side authority** — the server validates that only the current host (or delegated controllers) can emit playback events; viewers cannot fake host commands
- **Reconnect tokens** — cryptographic 32-byte random tokens are issued on join and consumed on reconnect to prevent nickname-based role hijacking
- **Payload validation** — all incoming socket payloads are validated for type, length, and format before processing
- **HTTPS enforcement** — HTTP requests are 301-redirected to HTTPS in production

---

## 🧠 How File Verification Works

```
1. Host picks file  →  Web Worker reads 3 × 2 MB chunks (start, middle, end)
                        + 8-byte file size encoding
                        →  SHA-256(concatenated)  →  hexdigest

2. Host emits       →  file_verified { hash, size, name }

3. Server stores    →  room.fileHash = hash (single source of truth)

4. Viewer picks file → Same hashing algorithm in their Web Worker
                       → Emits file_verified to server

5. Server compares  →  match  → emit file_match  → viewer.status = 'ready'
                       mismatch → emit file_mismatch → prompt re-selection

6. Room is ready    →  all participants.status === 'ready'
```

Hashing runs entirely **off the main thread** via a Web Worker — even a 10 GB file does not freeze the UI.

---

## 📡 Socket Event Reference

### Client → Server

| Event | Payload | Description |
|---|---|---|
| `join_room` | `{ roomId, nickname, password?, reconnectToken? }` | Join or rejoin a room |
| `file_verified` | `{ hash, size, name }` | Submit file verification |
| `playback_event` | `{ action, currentTime, timestamp, subtitleState? }` | Host playback command |
| `buffering_state` | `{ isBuffering }` | Report buffer stall |
| `set_control_policy` | `{ policy, controllerIds }` | Change who can control |
| `chat_message` | `{ text }` | Send chat message |
| `send_reaction` | `{ emoji }` | Send floating emoji |
| `voice_join` / `voice_leave` | — | Join/leave voice channel |
| `webrtc_offer/answer/ice_candidate` | WebRTC signaling | Voice peer negotiation |
| `ping` | `{ sentAt }` | Latency measurement |

### Server → Client

| Event | Payload | Description |
|---|---|---|
| `room_state` | Full room snapshot | Sent on join |
| `playback_broadcast` | `{ action, currentTime, timestamp }` | Relayed playback event |
| `participant_update` | `Participant` | Single participant state change |
| `file_match` / `file_mismatch` | — | File verification result |
| `chat_broadcast` | `ChatMessage` | New chat message |
| `force_pause` / `resume_allowed` | — | Buffering coordination |
| `control_policy_update` | `{ policy, controllerIds }` | Policy changed by host |
| `reconnect_token` | `{ token }` | Issued after successful join |
| `host_left` | — | Host disconnected (30s GC pending) |
| `pong` | `{ sentAt }` | Latency reply |

---

## 🔭 Roadmap

- [x] Core sync engine (play / pause / seek / drift correction)
- [x] File verification (multi-chunk SHA-256, Web Worker)
- [x] Room PIN protection (PBKDF2)
- [x] Control policy (host-only / everyone / selected)
- [x] Voice chat (WebRTC P2P)
- [x] Subtitle sync (.srt / .vtt)
- [x] Emoji reactions (floating overlay)
- [x] Chrome Extension (YouTube sync)
- [x] Redis-backed horizontal scaling
- [ ] Host transfer (pass the remote)
- [ ] Latency-aware seek offset (RTT compensation per viewer)
- [ ] Mobile-responsive layout improvements
- [ ] Persistent nicknames (no auth required)
- [ ] Subtitle track selection sync
- [ ] Room history / replay (post-MVP)

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
npm run dev          # Start dev servers
# ... make your changes ...
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
# Open a Pull Request
```

Please follow the existing code style (TypeScript strict, no `any`, single-responsibility components).

---

## 💛 Support

SyncWatch is free and open source. If it made your movie night better, you can support the project:

- ☕ [Ko-fi](https://ko-fi.com/sampratigaurav)
- 🇮🇳 UPI (India): `sampratigaurav123@okaxis`

---

## 📄 License

MIT © [Samprati Gaurav](https://github.com/sampratigaurav)

---

<div align="center">
  <sub>Built with ❤️ by Samprati Gaurav &nbsp;·&nbsp; <a href="https://syncwatch-eosin.vercel.app">Live Demo</a> &nbsp;·&nbsp; <a href="https://github.com/sampratigaurav/syncwatch/issues">Report a Bug</a></sub>
</div>
