## 2024-05-15 - Unrestricted Express JSON Parser
**Vulnerability:** The global `express.json()` middleware was used without a payload size limit.
**Learning:** This exposes the application to a Denial of Service (DoS) attack. An attacker can send excessively large JSON payloads (e.g., highly nested or massive objects) which consumes excessive CPU and memory during parsing, blocking the Node.js event loop and preventing legitimate requests from being handled.
**Prevention:** Always explicitly define a sane size limit (e.g., `{ limit: '100kb' }`) when configuring body parsing middlewares like `express.json()` and `express.urlencoded()`.
