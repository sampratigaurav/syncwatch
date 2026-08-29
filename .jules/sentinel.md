## 2025-02-14 - Validation of optional numeric properties
**Vulnerability:** Optional numeric property validation in Socket.IO payloads was relying solely on existence (`!== undefined`) rather than explicitly verifying type and bounds, potentially allowing state corruption or DoS vulnerabilities.
**Learning:** Checking for `!== undefined` on optional properties like `playbackRate` doesn't verify if it's a number, finite, or within reasonable bounds.
**Prevention:** Always use explicit type checking (`typeof value === 'number'`) and `Number.isFinite(value)` for optional numeric fields before storing them in the room state.

## 2025-02-14 - Validation of optional numeric properties
**Vulnerability:** Optional numeric property validation in Socket.IO payloads was relying solely on existence (`!== undefined`) rather than explicitly verifying type and bounds, potentially allowing state corruption or DoS vulnerabilities.
**Learning:** Checking for `!== undefined` on optional properties like `playbackRate` doesn't verify if it's a number, finite, or within reasonable bounds. Furthermore, validation must happen before ANY partial state mutation to avoid data inconsistency.
**Prevention:** Always use explicit type checking (`typeof value === 'number'`) and `Number.isFinite(value)` for optional numeric fields before storing them in the room state, and always validate BEFORE mutation.
