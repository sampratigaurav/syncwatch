## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-16 - Conditional Rendering vs Visibility Props with Zustand
**Learning:** Passing visibility props (e.g., `isVisible`) to child components that subscribe to frequently updating Zustand stores (like `latencyMs` in `useRoomStore`) is a performance anti-pattern. The component still subscribes to state changes and re-evaluates hooks on every update, even if it immediately returns `null`.
**Action:** Always conditionally render these components at the parent level (e.g., `{isVisible && <Component />}`) to completely unmount them and prevent unnecessary global re-renders.
## 2024-05-16 - Date.now in Render Phase
**Learning:** Calling `Date.now()` directly in the render phase of a React component creates an impure function and flags the SonarCloud Maintainability Rating. While this can be fixed by hoisting it to a `useState` updated via a `setInterval` effect, doing so may worsen render performance by triggering frequent re-renders.
**Action:** If fixing this lint rule introduces new performance regressions (like forcing continuous re-renders for a component that didn't previously need them), use an `eslint-disable-next-line react-hooks/purity` comment or find a side-effect-free way to calculate the value, rather than blindly shifting to an effect-driven timer pattern.
