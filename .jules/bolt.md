## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.

## 2026-08-28 - Conditional Rendering and High-Frequency Store Subscriptions
**Learning:** Components that subscribe to high-frequency state updates (like `useRoomStore` listening to 10s websocket pings for latency) via hooks will continue to execute and re-render in the background even if they early return `null` internally (e.g., `if (!isVisible) return null;`). This wastes CPU cycles on React tree traversal and hook execution.
**Action:** Always conditionally render components that subscribe to high-frequency store updates at the parent level (`{isVisible && <Component />}`) rather than internally handling visibility state. This ensures the component is completely unmounted and its hooks are not executed when hidden.

## 2026-09-05 - Direct Selector Primitive Extraction vs Array Selection
**Learning:** Selecting an entire array object (e.g., `state.participants`) in a Zustand store selector causes subscribed components to re-render whenever any property within any array element updates (such as peer `latencyMs` from 10s websocket pings), even when wrapped in `useShallow`.
**Action:** Extract specific primitive properties (such as `hostName` via `.find()` or `participantCount` via `.length`) directly inside the Zustand selector instead of selecting the full array and computing primitives locally in component code.

## 2026-10-22 - Conditional Rendering and AnimatePresence\n**Learning:** Components conditionally returning `null` inside themselves (rather than being conditionally rendered by their parent) will not trigger `<AnimatePresence>` exit animations, because Framer Motion relies on the component unmounting from the React tree.\n**Action:** For `<AnimatePresence>` exit animations to work correctly, always conditionally render the target component from its parent (`{isVisible && <Component />}`).
## 2026-10-22 - React Anti-Pattern: Zustand .getState() in Render\n**Learning:** Reading `useRoomStore.getState()` directly inside the React render phase is an anti-pattern. It breaks function purity, bypasses React's reactivity, and can lead to tearing.\n**Action:** Always use standard Zustand hooks with selectors (`useRoomStore(state => ...)`) to read data during render. Zustand will automatically bail out of re-rendering if the selected value (especially primitives or joined strings) has not changed.
