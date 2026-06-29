## 2024-05-24 - Missing Input Validation in Socket Handlers
**Vulnerability:** Several socket event handlers in `server/src/socket/handlers.ts` did not validate that the incoming `payload` object was not null or undefined before attempting to destructure or access its properties (e.g. `const { roomId } = payload;`). A malicious client could easily send a `null` payload and crash the entire Node.js server process, causing a Denial of Service.
**Learning:** Always validate that incoming payloads from clients exist and are of the expected type before accessing their properties, even if you are just destructuring them. Socket.IO passes `null` values directly through to the handlers.
**Prevention:** Implement strict payload validation (or at least `if (!payload) return;`) at the very beginning of every Socket.IO event handler that expects data.

## 2026-06-10 - Server DoS via Unvalidated Object in Password Hash
**Vulnerability:** In `server/src/socket/handlers.ts`, the `EVENTS.JOIN_ROOM` handler extracted `password` from the incoming payload and passed it directly to `crypto.pbkdf2Sync()` without validating its type. If a malicious client sent an object (e.g., `{}`) instead of a string, `pbkdf2Sync` would throw a `TypeError [ERR_INVALID_ARG_TYPE]`, crashing the entire Node.js server.
**Learning:** Any data coming from a Socket.IO payload must have its type explicitly validated before being passed to Node.js standard library functions (especially `crypto` and `fs`), as an unhandled exception will crash the process.
**Prevention:** Always check `typeof param === 'string'` (or the expected type) for destructured properties from external payloads before passing them to native APIs.

## 2024-05-25 - Unvalidated Payload Properties in Socket Handlers
**Vulnerability:** Several Socket.IO event handlers (e.g., PING, VOICE_SPEAKING, WEBRTC_*) accessed payload properties without validating their types. This could lead to a Denial of Service or unhandled errors if malicious clients sent unexpected data types instead of the expected primitives (like objects instead of booleans/strings). PING specifically had a reflection issue where it blindly echoed the entire payload back.
**Learning:** Checking `if (!payload)` is not enough; every individual property expected in a Socket.IO payload must have its type explicitly validated (e.g., `typeof payload.targetId === 'string'`) before use.
**Prevention:** Always use strict `typeof` checks for all destructured or accessed payload properties in socket handlers, and explicitly construct return objects rather than echoing untrusted payloads.
## 2026-06-12 - Server DoS and Reflection via Unvalidated Object in Playback Event
**Vulnerability:** In `server/src/socket/handlers.ts`, the `EVENTS.PLAYBACK_EVENT` handler blindly broadcasted the incoming `payload` object directly via `...payload`. A malicious client could attach arbitrarily large or maliciously crafted properties, which would be reflected to all connected clients. Furthermore, it lacked strict type checking on `payload.action` and `payload.subtitleState`.
**Learning:** Never spread unvalidated socket payloads when broadcasting data. Not only does it invite type injection attacks that pollute internal state, but it enables Reflection DoS, turning the server into an amplifier.
**Prevention:** Always explicitly construct outbound payload objects from strict, type-checked local variables. Never broadcast `...payload` received directly from a client.
## 2024-06-29 - Data Exposure in Room State Broadcasts
**Vulnerability:** Room state was broadcasted to clients in `SET_MAGNET_LINK` handler including the hashed `password` and `passwordSalt`.
**Learning:** Spread operators `...room` can silently expose sensitive fields if we are not explicitly filtering out information that should not be shared with clients, especially when constructing objects to be broadcasted to all users in a room.
**Prevention:** Never use direct spread of backend state objects in Socket.io broadcast payloads if they contain sensitive data. Always construct an explicit object or use `delete` to scrub sensitive fields like `password` and `passwordSalt` before emitting.
