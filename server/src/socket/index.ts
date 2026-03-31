import { Server, Socket } from 'socket.io';
import { registerJoinRoom } from './handlers/joinRoom';
import { registerFileVerify } from './handlers/fileVerify';
import { registerPlayback } from './handlers/playback';
import { registerBuffering } from './handlers/buffering';
import { registerChat } from './handlers/chat';
import { registerVoice } from './handlers/voice';
import { registerReactions } from './handlers/reactions';
import { registerDisconnect } from './handlers/disconnect';

export const setupSocketHandlers = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    registerJoinRoom(io, socket);
    registerFileVerify(io, socket);
    registerPlayback(io, socket);
    registerBuffering(io, socket);
    registerChat(io, socket);
    registerVoice(io, socket);
    registerReactions(io, socket);
    registerDisconnect(io, socket);
  });
};
