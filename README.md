<div align="center">

<br />

<img src="client/public/logo.png" width="128" alt="SyncWatch logo" />

<h1>SyncWatch</h1>

<p>
  <strong>Watch together. In perfect sync.</strong><br />
  A premium, real-time, zero-upload watch party experience — right from your browser.
</p>

<p>
  <a href="https://syncwatch-eosin.vercel.app"><img src="https://img.shields.io/badge/Live-Demo-1D9E75?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 19" />
  <a href="./ARCHITECTURE.md"><img src="https://img.shields.io/badge/Architecture-Docs-010101?style=for-the-badge&logo=readthedocs&logoColor=white" alt="Architecture" /></a>
</p>

<br />

![SyncWatch Hero](https://syncwatch-eosin.vercel.app/preview.png)

</div>

---

## ✨ Tired of counting down "3... 2... 1... press play"?

Say hello to **SyncWatch**. 

SyncWatch is a beautifully designed, lightning-fast web app that lets you watch local video files with your friends in absolute perfect sync. 

There are **zero uploads**, no massive video files hogging your bandwidth, and absolutely no legal grey areas. You just pick a local video file on your computer, your friends pick the same file on theirs, and SyncWatch handles the rest. 

It acts like an incredibly fast, sub-second shared remote control. When you pause to grab popcorn, the movie pauses for everyone else. When you seek back to catch a missed joke, everyone travels back in time with you.

---

## 📸 Gallery

<div align="center">
  <img src="client/public/screenshots/home.png" alt="SyncWatch Home Screen" width="800" style="border-radius: 12px; margin-bottom: 20px;" />
  <br />
  <img src="client/public/screenshots/room.png" alt="SyncWatch Room" width="800" style="border-radius: 12px;" />
</div>

---

## 🍿 The Premium Experience

We obsessed over every detail to make SyncWatch feel like magic. 

- 🏎️ **Zero-Upload Sync:** Watch any file — even massive 4K rips — instantly. Your media never leaves your computer.
- ⏱️ **Sub-Second Magic:** Our custom drift-correction engine keeps everyone within a blink of an eye (≤500ms) of the host. 
- 🧠 **Smart Quality Agnostic:** Got a 4K copy while your friend has 1080p? No problem. Our acoustic fingerprinting lets you sync different encodings of the same video seamlessly.
- 💬 **Real-Time Banter:** Built in chat, floating emoji reactions, and live typing indicators.
- 🎙️ **Voice Chat Built-in:** Crisp WebRTC peer-to-peer voice chat so you can hear your friends laugh in real time. 
- 🔒 **Secure Rooms:** Lock your watch party with a PIN to keep crashers out.
- 🎥 **YouTube Extension:** Don't have local files? Grab our Chrome Extension to sync YouTube videos directly on the YouTube website!

---

## 🚀 Quick Start (Be watching in 60 seconds)

### What you need:
- Node.js installed on your machine.
- A local or cloud Redis instance.

### Run it locally:

```bash
# 1. Grab the code
git clone https://github.com/sampratigaurav/syncwatch.git
cd syncwatch

# 2. Install dependencies
npm install

# 3. Create a .env in the server folder
# (Point REDIS_URL to your redis instance)
echo "PORT=3001
REDIS_URL=redis://localhost:6379
CLIENT_ORIGIN=http://localhost:5174" > server/.env

# 4. Boot it up!
npm run dev
```

Boom. You're live. Head over to `http://localhost:5174` and start a room.

---

## 🤓 For the Hardcore Engineers

Are you wondering how we calculate Perceptual Sync using an RMS Energy Web Worker? Want to see the Socket.IO event reference table? Intrigued by how we achieve frame-perfect playback pausing through RTT Latency Compensation?

We moved all the juicy technical details into a dedicated architecture doc so we wouldn't scare away the normal folks.

👉 **[Dive into the ARCHITECTURE.md 🏗️](./ARCHITECTURE.md)**

---

## 🌍 Deploying to Production

You can deploy SyncWatch to the web completely for free. 
- **Frontend:** Works perfectly on Vercel or Netlify (Make sure to set `VITE_SERVER_URL` to your backend).
- **Backend:** Deploy the Node.js Express server to Render (Free Tier) or Railway.
- **Database:** Spin up a free Redis database on Upstash.

*Need detailed deployment steps? [Read the guide in the Architecture docs](./ARCHITECTURE.md).*

---

## 💛 Support the Project

SyncWatch is 100% free and open source. If it made your movie nights a little less chaotic and a lot more fun, please consider supporting the project:

- ⭐ **Star this repository** (It genuinely helps so much!)
- ☕ [Buy me a Coffee on Ko-fi](https://ko-fi.com/sampratigaurav)
- 🇮🇳 UPI (India): `sampratigaurav123@okaxis`

<br />

<div align="center">
  <sub>Built with ❤️ by Samprati Gaurav &nbsp;·&nbsp; <a href="https://syncwatch-eosin.vercel.app">Live Demo</a> &nbsp;·&nbsp; <a href="https://github.com/sampratigaurav/syncwatch/issues">Report a Bug</a></sub>
</div>
