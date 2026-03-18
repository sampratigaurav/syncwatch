# 🎬 SyncWatch

SyncWatch is a real-time, peer-to-peer synchronized video player designed for seamless remote watch parties. 

Instead of uploading massive video files to a server or dealing with complex transcoding pipelines, SyncWatch allows all participants to select their own *local* copy of the same video file. The server acts merely as an ultra-low latency signaling layer to keep everyone's playback, pauses, and seeks perfectly synchronized.

## ✨ Features

- **Zero-Upload Sync**: Watch massive 4K files instantly. No server uploads or downloads required.
- **Client-Side Hashing**: Web Workers verify that everyone has the exact same video file before starting to prevent desyncs.
- **Sub-Second Synchronization**: Custom socket-based drift-correction ensures all viewers are within milliseconds of the host's playback.
- **Authoritative Host Controls**: The Room Host controls playback, pausing, and seeking.
- **Real-Time Chat**: Built-in chat system for room participants.
- **Echo Suppression**: Intelligent remote-event handling prevents bouncing "play/pause" feedback loops between clients.
- **Smart Buffering Detection**: If a participant's local browser buffers, the entire room automatically pauses until they recover.

## 🛠 Tech Stack

SyncWatch is built as a complete TypeScript Monorepo:

- **Frontend (`/client`)**: React 19, TypeScript, Vite, Tailwind CSS v4, Zustand (State Management), Socket.IO Client.
- **Backend (`/server`)**: Node.js, Express, Socket.IO, TypeScript.
- **Shared (`/shared`)**: Shared type definitions and strict socket event contracts.

## 🚀 Quick Start

### Prerequisites
- Node.js (v20+ recommended)
- NPM (v10+)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/sampratigaurav/syncwatch.git
   cd syncwatch
   ```
2. Install dependencies for the entire monorepo:
   ```bash
   npm install
   ```

### Running Locally
You can boot both the frontend and backend development servers concurrently with a single command from the project root:

```bash
npm run dev
```

- The **Client** will be available at `http://localhost:5174`
- The **Server** will run on `http://localhost:3001`

*(Vite is configured to automatically proxy `/api` requests to the local backend during development).*

## 🌍 Deployment

SyncWatch is designed to be deployed for free on Vercel (Frontend) and Render (Backend).

### Backend (Render)
1. Create a new Web Service on Render.
2. Root Directory: (Leave blank, let the monorepo root handle it)
3. Build Command: `npm install && npm run build:server`
4. Start Command: `npm run start:server`
5. **Environment Variables**:
   - `CLIENT_ORIGIN`: Set this to your Vercel URL (e.g., `https://syncwatch-eosin.vercel.app`) to dynamically allow secure Socket.IO CORS connections.

### Frontend (Vercel)
1. Import the repository into Vercel.
2. Root Directory: `client`
3. Framework Preset: `Vite`
4. Build Command: `npm run build`

## 📄 License

This project is licensed under the MIT License.
