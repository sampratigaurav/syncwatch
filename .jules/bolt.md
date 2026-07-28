## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-16 - Zustand Store Subscriptions with Hidden Components
**Learning:** Components that subscribe to frequently updating Zustand stores (like `useRoomStore` which updates `latencyMs` every 10s) will still execute hooks and evaluate on every store update even if they return `null` due to a visibility prop. This causes unnecessary processing.
**Action:** Avoid passing visibility props to components subscribing to frequently updating stores. Instead, conditionally render them at the parent level (e.g., `{isVisible && <Component />}`) so they are completely unmounted and unsubscribe from the store.
