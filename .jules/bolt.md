## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-16 - Conditional Mounting vs Early Returns for Zustand Consumers
**Learning:** Components that subscribe to frequently updating Zustand stores (like `useRoomStore` which updates `latencyMs` every 10 seconds via pings) still evaluate hooks and cause React tree traversal even if they early return `null` via an `isVisible` prop. This causes unnecessary background re-renders.
**Action:** When a component is heavy or subscribes to frequently updating global state, completely unmount it at the parent level using conditional rendering (e.g., `{isVisible && <Component />}`) rather than passing a visibility prop and early returning inside the component.
