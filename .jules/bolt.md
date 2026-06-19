## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-18 - Inline Style Tags Cause DOM Bloat
**Learning:** Components dynamically rendering `<style>` tags directly into the component tree (e.g., `VideoPlayer`, `Home`, and `ReactionOverlay`) cause unnecessary layout recalculations and DOM bloat, as the styles are repeatedly parsed by the browser.
**Action:** Move all keyframes and generic selectors (`video::cue`) to the global `index.css` file so the browser evaluates them once during initialization.
