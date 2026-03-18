import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomRouter } from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const server = createServer(app);

const ALLOWED_ORIGIN_PATTERNS = [
  'localhost',
  '127.0.0.1',
  'syncwatch-eosin.vercel.app',
  'vercel.app'
];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (e.g. mobile apps, curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if the origin contains any of our allowed patterns or the env var
    const envOrigin = process.env.CLIENT_ORIGIN || '';
    const isAllowed = ALLOWED_ORIGIN_PATTERNS.some(pattern => origin.includes(pattern)) || 
                     (envOrigin && origin.includes(envOrigin));
                     
    if (isAllowed) {
      callback(null, true);
    } else {
      // Pass false to politely reject CORS without throwing a 500 internal server error
      callback(null, false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"]
};

// @ts-ignore - socket.io types don't fully match the function signature but it works
const io = new Server(server, { cors: corsOptions });

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/rooms', roomRouter);

setupSocketHandlers(io);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
