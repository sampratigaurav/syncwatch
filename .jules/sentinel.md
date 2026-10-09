## 2024-05-18 - JSON.stringify DoS Vulnerability
**Vulnerability:** Node.js event-loop blocking (DoS) via synchronous JSON.stringify() on untrusted WebRTC payloads.
**Learning:** Initially attempted to restrict WebRTC payload size by running `JSON.stringify(payload.offer).length`. Code review correctly flagged that an attacker could send a massively nested object, which would block the synchronous event loop and crash the server—the very DoS attack I was trying to prevent.
**Prevention:** Never use `JSON.stringify` to validate the size of unverified user input. Always target specific fields that are expected to be strings (e.g., `payload.offer.sdp`) and check their `.length` directly after verifying their type.
