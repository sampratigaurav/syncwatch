## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-25 - Hoist Intl.DateTimeFormat for Date Formatting
**Learning:** Calling `new Date().toLocaleDateString()` inline within a React render loop acts as a performance anti-pattern because it implicitly initializes an expensive `Intl.DateTimeFormat` instance every time the component re-renders.
**Action:** Hoist and cache `Intl.DateTimeFormat` initializations outside of components, explicitly wrapping `.format()` arguments in `new Date()` with falsy fallbacks to prevent runtime `RangeError` crashes.
