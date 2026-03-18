import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomRouter } from './routes/rooms';
import { setupSocketHandlers } from './socket/handlers';

const app = express();
const server = createServer(app);

const ALLOWED_ORIGINS = [
  process.env.CLIENT_ORIGIN,
  'http://localhost:5174',
  'http://localhost:5173'
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST"]
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
