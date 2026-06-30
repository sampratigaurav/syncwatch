import express from 'express';
import './firebase'; // Initialize Firebase Admin SDK
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { roomRouter } from './routes/rooms';
import { userRouter } from './routes/users';
import { friendRouter } from './routes/friends';
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
    } else if (origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
};

const io = new Server(server, { cors: corsOptions });
app.set('io', io);

io.engine.use((req: any, res: any, next: any) => {
  Object.setPrototypeOf(req, app.request);
  req.app = app;
  req.res = res;
  req.connection = req.connection || req.socket;
  next();
});

// IP-based WebSocket connection rate limiting (max 20 connections per IP per minute)
const MAX_WS_CONNECTIONS_PER_IP = 20;
const WS_WINDOW_MS = 60_000;
const wsConnectionCounts = new Map<string, { count: number; resetAt: number }>();

io.use((socket, next) => {
  const req = socket.request as any;
  const rawIp = req.ip || socket.handshake.address;
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
      const host = req.hostname;
      // Mitigate Open Redirect (SonarCloud tssecurity:S5146)
      if (
        host === 'syncwatch.samprati.dev' || 
        host === 'api.syncwatch.samprati.dev' || 
        host === 'syncwatch-eosin.vercel.app'
      ) {
        try {
          // Use URL parser to strictly extract the pathname and search query.
          // This removes any protocol/host malicious injection from req.originalUrl.
          const parsedUrl = new URL(req.originalUrl, `https://${host}`);
          const strictRelativePath = parsedUrl.pathname + parsedUrl.search;
          return res.redirect(301, `https://${host}${strictRelativePath}`);
        } catch (error) {
          // Fallback if URL parsing fails
          return res.redirect(301, `https://${host}/`);
        }
      }
      return res.status(400).send('Bad Request: Invalid Host');
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

// DEBUG LOGGING
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

app.use('/api/rooms', roomRouter);
app.use('/api/users', userRouter);
app.use('/api/friends', friendRouter);

import { logger } from './utils/logger';

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

let pubClient: ReturnType<typeof createClient>;
let subClient: ReturnType<typeof createClient>;

(async () => {
  pubClient = createClient({ url: process.env.REDIS_URL });
  subClient = pubClient.duplicate();

  pubClient.on('error', (err) => logger.error('Redis pub error:', err));
  subClient.on('error', (err) => logger.error('Redis sub error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);

  io.adapter(createAdapter(pubClient, subClient));

  setupSocketHandlers(io);

  server.listen(Number(PORT), '0.0.0.0', () => {
    logger.info(`Server listening on ${PORT} (0.0.0.0)`);
  });
})();

// Graceful Shutdown implementation
const gracefulShutdown = async (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  server.close(() => {
    logger.info('HTTP server closed.');
  });
  
  // Close all socket connections
  io.disconnectSockets(true);
  
  try {
    if (pubClient?.isOpen) await pubClient.quit();
    if (subClient?.isOpen) await subClient.quit();
    logger.info('Redis clients disconnected.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during Redis disconnection:', err);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
