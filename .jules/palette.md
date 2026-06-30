
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-07-02 - Testing Authenticated Components with Playwright
**Learning:** Some components (like `FriendsSidebar`) conditionally render based on authentication state (e.g. `firebaseUid` in Zustand store). Standard Playwright scripts navigating to `/` often fail to verify these states if auth mocking is complex.
**Action:** When visually verifying frontend components that depend on authentication or complex global state, create a temporary test entry point (e.g. `test.html` and `test-main.tsx`) that mounts the isolated component and injects the required mock state directly (`useRoomStore.setState(...)`). Verify this test page with Playwright and clean up the files afterward.
