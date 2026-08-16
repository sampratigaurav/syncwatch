## 2024-05-14 - ReactionButton Inline Styles
**Learning:** React components using inline `<style>` tags for animations (e.g. `@keyframes`) inject redundant global styles into the DOM on every render.
**Action:** Always move `@keyframes` and other non-scoped CSS rules from component inline `<style>` blocks to global stylesheets (like `index.css`) to reduce DOM bloat and layout thrashing.
## 2024-05-15 - Zustand useRoomStore() Default Subscriptions
**Learning:** Components calling `useRoomStore()` without a selector implicitly subscribe to the entire store. Because `latencyMs` updates every 10 seconds via socket pings, *any* component calling `useRoomStore()` re-renders globally every 10 seconds, causing unnecessary layout recalculations and react tree traversal.
**Action:** Always use `useShallow` with an explicit selector for Zustand stores in heavy components (like `Room.tsx` or `VideoPlayer.tsx`) to isolate re-renders to only the properties the component actually consumes.

## 2024-05-16 - Inline React `<style>` Tags Thrashing Layouts
**Learning:** React components (like `VideoPlayer`) using inline `<style>` blocks that contain string interpolation tied to state variables (e.g. `${showControls ? ...}`) cause the browser to re-parse CSS and trigger expensive global layout calculations on every state change.
**Action:** Always move state-dependent styling out of inline `<style>` blocks. Inject CSS custom properties via the `style` prop (e.g., `style={{ '--my-var': ... }}`) and consume them in a static, global stylesheet.

## 2024-05-16 - SonarCloud Quality Gate Button Type
**Learning:** When making frontend optimizations in React components that contain existing `<button>` elements, SonarCloud's "Maintainability Rating on New Code" (rule javascript:S5147) may fail the CI build if the `<button>` elements modified in the diff lack a `type="button"` attribute.
**Action:** When acting as Bolt, ensure that any `<button>` elements within or adjacent to the optimized code block include an explicit `type="button"` attribute to prevent unintended form submissions and satisfy SonarCloud CI requirements.
