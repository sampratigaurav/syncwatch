# 🏗️ SyncWatch Architecture & Internals

Welcome to the technical deep-dive of SyncWatch. This document outlines the system architecture, real-time sync mechanisms, security model, and codebase structure. If you're looking to contribute or understand how SyncWatch achieves sub-second peer-to-peer synchronization, you're in the right place!

---

## 🏗️ System Architecture

```text
┌──────────────────────────────────────────────────────┐
│                     Browser (Alice)                  │
│  ┌───────────────┐   File: movie.mp4 (local)         │
│  │  VideoPlayer  │   Hash: Perceptual Audio          │
│  │  (HTML5 <vid>)│   Fingerprint (RMS Energy Bins)   │
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

The core synchronization loop relies on a lightweight signaling server and aggressive client-side drift correction:

```text
Host emits    → playback_event { action, currentTime, timestamp }
Server        → validates authority → broadcasts to room
Viewers apply → echo-suppressed via isApplyingRemoteEvent flag
Drift check   → every 5s host emits sync_check; viewers correct if |Δt| > 500ms
Latency comp  → Frame-perfect pause sync delays local playback by half RTT (latencyMs / 2)
```

---

## 🧠 How Perceptual Sync (File Verification) Works

To support different encodings and qualities of the same video (e.g., 4K vs 1080p), SyncWatch uses an acoustic fingerprinting system instead of strict cryptographic hashing.

1. **Host picks file:** Web Audio API decodes the first 10MB of the audio track. A Web Worker calculates RMS energy across 100ms bins, yielding an array of ~100 floats (Acoustic Fingerprint).
2. **Host emits:** Caches fingerprint locally, broadcasts it directly to peers via WebRTC Data Channels, and sends a dummy 'file_verified' hash to trick the server into a 'ready' state.
3. **Viewer picks file:** Computes their own local acoustic fingerprint.
4. **Viewer compares:** Receives the host's fingerprint via WebRTC. A Web Worker runs a Pearson Correlation (requires > 0.85 match).
5. **Server compares:** If the local Web Worker approves, the viewer sends the identical dummy hash to the server. The server sees a 100% hash match and sets `viewer.status = 'ready'`.
6. **Room is ready:** Once all `participants.status === 'ready'`, playback can begin.

If the first 10MB of the file lacks the `moov` atom (making it undecodable), the system gracefully falls back to passing the `file.size` over WebRTC and ensuring viewers are within a ±5% size tolerance. Analysis runs entirely **off the main thread** via a Web Worker — even a 10 GB file does not freeze the UI.

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
| Perceptual Sync | Web Worker + Web Audio API |
| P2P Transport | WebRTC + RTCDataChannel + Web Audio API |

### Backend (`/server`)
| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 20 |
| Framework | Express v5 |
| Realtime | Socket.IO v4 |
| Language | TypeScript |
| State Store | Redis (TTL-based room GC) |
| Pub/Sub | `@socket.io/redis-adapter` |
| Security | Helmet, CORS whitelist, PBKDF2 PINs |

### Chrome Extension (`/extension`)
| Layer | Technology |
|---|---|
| Build | Vite + @crxjs/vite-plugin |
| UI | React 18 + inline styles |
| Player | YouTube DOM adapter (MAIN world) |
| Messaging | Chrome extension message bus |

---

## 🔐 Security Model

SyncWatch is built with production security in mind:

- **CORS whitelist** — only known origins may connect via HTTP and WebSocket.
- **Helmet** — sets `X-Content-Type-Options`, `X-Frame-Options`, CSP, and HSTS headers.
- **PBKDF2 room PINs** — passwords are never stored in plaintext; 100,000 iterations with a random salt.
- **IP-based rate limiting** — WebSocket connections (20/min/IP), room creation (10/min/IP), PIN attempts (5/min/IP), and chat (5 messages / 3s).
- **Server-side authority** — the server validates that only the current host (or delegated controllers) can emit playback events; viewers cannot fake host commands.
- **Reconnect tokens** — cryptographic 32-byte random tokens are issued on join and consumed on reconnect to prevent nickname-based role hijacking.
- **Payload validation** — all incoming socket payloads are validated for type, length, and format before processing.

---

## 📁 Project Structure

```text
syncwatch/
├── client/                        # React frontend (Vite)
│   └── src/
│       ├── components/            # UI components (VideoPlayer, Chat, etc.)
│       ├── hooks/                 # Core sync logic & Socket management
│       ├── pages/                 # Routing pages (Home, Room, WaitingRoom)
│       ├── store/                 # Zustand global state
│       └── lib/                   # Web Workers & Utilities
│
├── server/
│   └── src/
│       ├── rooms/                 # Redis CRUD + TTL management
│       ├── socket/                # Socket.IO event handlers
│       └── routes/                # REST endpoints
│
├── shared/
│   ├── types.ts                   # Shared TypeScript interfaces
│   └── socketEvents.ts            # Typed event name constants
│
└── extension/                     # Chrome extension (YouTube sync)
    └── src/
        ├── background/            # Service worker + socket relay
        ├── content/               # Bridge + keep-alive port
        ├── page/                  # YouTube player adapter
        └── popup/                 # Extension UI
```

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
| `pong` | `{ sentAt }` | Latency reply |
