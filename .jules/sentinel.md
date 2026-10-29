## 2024-05-19 - Limit Express JSON parser

**Vulnerability:** Unbounded JSON payload parser in Express.js.
**Learning:** Calling `express.json()` without a configured limit creates a Denial-of-Service (DoS) vector where clients can upload infinitely large JSON requests, crashing the server due to OOM.
**Prevention:** Always specify a limit (e.g. `express.json({ limit: '100kb' })`) when configuring the `express.json` middleware.

## 2024-05-19 - Type injection & DoS in WebRTC event handlers

**Vulnerability:** Weakly validated WebRTC socket inputs allow DoS attacks and type injection.
**Learning:** `typeof payload.offer === 'object'` evaluates to true for an array. Also, without a length check on `sdp` or `candidate`, users can send huge strings to effectively DDoS the room over websockets.
**Prevention:** Use `!Array.isArray(payload.offer)` to exclude arrays, and validate the string lengths of payload properties (e.g., `offer.sdp`, `candidate.candidate`).
## 2024-05-19 - Limit Express JSON parser

**Vulnerability:** Unbounded JSON payload parser in Express.js.
**Learning:** Calling `express.json()` without a configured limit creates a Denial-of-Service (DoS) vector where clients can upload infinitely large JSON requests, crashing the server due to OOM.
**Prevention:** Always specify a limit (e.g. `express.json({ limit: '100kb' })`) when configuring the `express.json` middleware.

## 2024-05-19 - Type injection & DoS in WebRTC event handlers

**Vulnerability:** Weakly validated WebRTC socket inputs allow DoS attacks and type injection.
**Learning:** `typeof payload.offer === 'object'` evaluates to true for an array. Also, without a length check on `sdp` or `candidate`, users can send huge strings to effectively DDoS the room over websockets.
**Prevention:** Use `!Array.isArray(payload.offer)` to exclude arrays, and validate the string lengths of payload properties (e.g., `offer.sdp`, `answer.sdp`, `candidate.candidate`).
