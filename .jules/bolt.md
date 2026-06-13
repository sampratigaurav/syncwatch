## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.
## 2024-05-18 - Zustand useWebRTC Destructuring Re-renders
**Learning:** `VoiceChat` and `ParticipantList` were implicitly subscribing to the entire `useWebRTC` store by destructuring its return value. Because WebRTC peer connection states update frequently during voice calls, this caused constant, unnecessary global re-renders of the UI.
**Action:** Always use specific selectors (`state => state.voiceParticipants`) or `useShallow` with an explicit selector object when extracting properties from the `useWebRTC` store to prevent cascading re-renders.
