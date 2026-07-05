
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-19 - Accessible Icon-Only Buttons
**Learning:** Across the app's sidebars and modals, custom icon-only buttons often lack accessible names (like `aria-label`) and visible focus states, which breaks both screen reader announcements and keyboard navigation visibility.
**Action:** Always provide an explicit `aria-label` (and often a `title` for sighted users) on icon-only `<button>` elements. In addition, append `aria-hidden="true"` to the inner icon element (e.g. `<Users aria-hidden="true" />`) to prevent redundant announcements, and include explicit focus utility classes (e.g., `focus-visible:ring-2`) to ensure focus is always visible during keyboard navigation.
