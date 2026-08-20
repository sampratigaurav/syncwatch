## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-16 - Conditional Rendering vs Early Return with Zustand
**Learning:** Returning `null` early inside a React component doesn't prevent its top-level hooks from running. If a component like `StatsForNerds` is "hidden" via an early return but still calls `useRoomStore`, it will implicitly subscribe to the store and silently execute on every store update (e.g., `latencyMs` ping every 10s), causing invisible but costly react tree evaluations.
**Action:** Always conditionally render components at the parent level (`{isVisible && <Component />}`) rather than passing visibility props and returning `null` internally. This completely unmounts the component and prevents unused hooks from subscribing to rapidly changing global state.
