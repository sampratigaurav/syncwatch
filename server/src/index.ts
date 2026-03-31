import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { roomRouter } from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';
import { startRoomCleanup } from './rooms/RoomManager';

const app = express();
const server = createServer(app);

// Trust the first proxy hop so req.ip / socket.handshake.address reflect the real client IP
app.set('trust proxy', 1);

const buildAllowedOrigins = (): Set<string> => {
  const origins = new Set<string>([
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://syncwatch-eosin.vercel.app',
  ]);
  const envOrigin = process.env.CLIENT_ORIGIN;
  if (envOrigin) origins.add(envOrigin);
  return origins;
};

const ALLOWED_ORIGINS = buildAllowedOrigins();

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Reject requests with no origin in production to prevent CSRF via non-browser clients
    if (!origin) {
      const isDev = process.env.NODE_ENV !== 'production';
      return callback(null, isDev);
    }

    if (ALLOWED_ORIGINS.has(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"]
};

// @ts-ignore - socket.io types don't fully match the function signature but it works
const io = new Server(server, { cors: corsOptions });

// IP-based WebSocket connection rate limiting (max 20 connections per IP per minute)
const MAX_WS_CONNECTIONS_PER_IP = 20;
const WS_WINDOW_MS = 60_000;
const wsConnectionCounts = new Map<string, { count: number; resetAt: number }>();

io.use((socket, next) => {
  // Use the rightmost X-Forwarded-For IP (added by the trusted proxy, not the client)
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  let rawIp: string;
  if (typeof forwarded === 'string') {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean);
    rawIp = ips[ips.length - 1] ?? socket.handshake.address;
  } else {
    rawIp = socket.handshake.address;
  }
  const now = Date.now();
  const entry = wsConnectionCounts.get(rawIp);

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_WS_CONNECTIONS_PER_IP) {
      return next(new Error('Too many connections from this IP'));
    }
    entry.count++;
  } else {
    wsConnectionCounts.set(rawIp, { count: 1, resetAt: now + WS_WINDOW_MS });
  }

  socket.on('disconnect', () => {
    const e = wsConnectionCounts.get(rawIp);
    if (e && Date.now() < e.resetAt) {
      e.count = Math.max(0, e.count - 1);
    }
  });

  next();
});

// HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Security headers (helmet sets X-Content-Type-Options, X-Frame-Options, HSTS, etc.)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));

// Explicit HSTS for production
if (process.env.NODE_ENV === 'production') {
  app.use((_req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/rooms', roomRouter);

// Background GC: cleans up expired, idle entries every 5 minutes.
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of wsConnectionCounts.entries()) {
    if (now > entry.resetAt && entry.count <= 0) {
      wsConnectionCounts.delete(ip);
    }
  }
}, 300_000);

// Start periodic room TTL cleanup (no-op with Redis — TTL is handled natively)
startRoomCleanup();

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now()
  });
});

(async () => {
  const pubClient = createClient({ url: process.env.REDIS_URL });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('Redis pub error:', err));
  subClient.on('error', (err) => console.error('Redis sub error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  setupSocketHandlers(io);

  server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
})();
