"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const rooms_1 = require("./routes/rooms");
const handlers_1 = require("./socket/handlers");
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_ORIGIN || "*",
        methods: ["GET", "POST"]
    }
});
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/rooms', rooms_1.roomRouter);
(0, handlers_1.setupSocketHandlers)(io);
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});
