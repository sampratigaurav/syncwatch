## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.

## 2024-05-16 - Zustand Subscriptions and Visibility Props
**Learning:** Passing a visibility prop to conditionally return `null` inside a component that subscribes to a frequently updating Zustand store (like `useRoomStore`) still causes the component to execute its hooks on every store update.
**Action:** Conditionally render components subscribing to Zustand stores at the parent level (e.g., `{isVisible && <Component />}`) to completely unmount them and prevent unnecessary hook executions when hidden.
