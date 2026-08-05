## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-14 - Optimize Zustand Store Subscriptions via Conditional Mounting
**Learning:** Returning `null` early inside a component (e.g., `StatsForNerds`) based on a visibility prop does NOT prevent Zustand hooks (like `useRoomStore`) from executing and evaluating their selectors on every store update. In real-time apps where the store updates frequently (e.g., latency pings every 10s), this causes unnecessary CPU overhead for hidden components.
**Action:** For hidden components that subscribe to frequently updating global stores, always conditionally mount them at the parent level (`{show && <Component />}`) rather than passing a visibility prop and hiding them internally. This completely unmounts the component and unsubscribes it from the store.
