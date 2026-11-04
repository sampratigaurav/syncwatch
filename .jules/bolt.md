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

## 2026-10-12 - Re-rendering Arrays Inside Zustand Selectors
**Learning:** While extracting primitive properties inside `useShallow` works for booleans or strings, returning a mapped array (even of primitives) still breaks referential equality (since `map` always returns a new array reference). Components will still re-render on every state update, even if the extracted array contents are identical.
**Action:** For localized array iterations (like mapping `typingUsers` to display names), avoid subscribing the parent component to the full global array. Instead, extract the mapping logic into a small sub-component (`ActiveTypingIndicator`), and fetch the array using `useStore.getState().array` inside that sub-component's render body to avoid any React subscription overhead entirely (if reactivity is driven by parent props like `typingUsers`).
