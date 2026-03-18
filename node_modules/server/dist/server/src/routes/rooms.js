"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomRouter = void 0;
const express_1 = require("express");
const RoomManager_1 = require("../rooms/RoomManager");
exports.roomRouter = (0, express_1.Router)();
exports.roomRouter.post('/', (req, res) => {
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    (0, RoomManager_1.createRoom)(roomId);
    res.json({ roomId });
});
exports.roomRouter.get('/:id/exists', (req, res) => {
    const { id } = req.params;
    const exists = RoomManager_1.rooms.has(id);
    res.json({ exists });
});
