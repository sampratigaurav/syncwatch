## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-16 - Zustand Subscriptions in Hidden Components
**Learning:** Components that early return `null` based on a visibility prop (like `StatsForNerds`) still execute their Zustand hooks (e.g., `useRoomStore`) on every store update. This causes hidden components to silently re-render on frequent state changes (like `latencyMs`), wasting CPU cycles.
**Action:** Instead of passing visibility props, completely unmount components that subscribe to frequently updating stores using conditional rendering at the parent level (e.g., `{isVisible && <Component />}`). Avoid applying this to components that do not re-render rapidly (e.g., `ProfileModal`).
