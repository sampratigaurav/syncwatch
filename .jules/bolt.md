## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-16 - Zustand primitive selector over array subscription
**Learning:** Components subscribing to a complex array (like `participants`) will re-render whenever any item in that array changes (e.g. `latencyMs` updates). If the component only needs derived scalar values from that array (like `hostName`), it should use a selector that returns just that scalar value.
**Action:** Refactor array subscriptions (`state.participants`) to primitive selectors (e.g. `state.participants.find(p => p.role === 'host')?.nickname`) in heavy components like `VideoPlayer.tsx` to prevent unnecessary re-renders.
