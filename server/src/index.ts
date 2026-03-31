import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomRouter } from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const server = createServer(app);

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

// Fix 9: HTTPS enforcement in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(301, `https://${req.header('host')}${req.url}`);
    }
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
}

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/rooms', roomRouter);

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: Date.now() 
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
