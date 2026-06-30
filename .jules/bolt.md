## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-17 - VideoPlayer Inline Styles
**Learning:** Using dynamic `<style>` tags directly inside React components causes the browser to re-parse and recalculate global styles on every render, leading to layout thrashing and performance degradation.
**Action:** Use conditional classes or data attributes in React components (e.g., `data-controls={true}`) and map them to static CSS rules in a global stylesheet (e.g., `video[data-controls="true"]::cue`) to apply dynamic styles cleanly.
