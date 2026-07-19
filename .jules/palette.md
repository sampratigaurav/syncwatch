
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-26 - Missing ARIA Labels on Icon-Only Modal Buttons
**Learning:** Icon-only buttons in modals (like Close, Copy Link, Change PIN, Delete Room) without `aria-label` attributes are completely inaccessible to screen reader users, who will just hear "button" without context. Additionally, omitting `:focus-visible` styles on these elements makes keyboard navigation extremely difficult.
**Action:** Always add descriptive `aria-label` attributes and explicit `:focus-visible` styles (e.g. `focus-visible:ring-2`) to icon-only interactive elements to ensure full accessibility and keyboard navigability.
