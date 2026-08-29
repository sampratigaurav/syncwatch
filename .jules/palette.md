
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-08-29 - Interactive Div Accessibility
**Learning:** When using arbitrary `div` elements as interactive buttons (like the 'My Code Banner' card), they completely lack semantic meaning, keyboard accessibility, and screen reader announcements by default, making them invisible to non-mouse users.
**Action:** Always add `role="button"`, `tabIndex={0}`, an `aria-label`, and an `onKeyDown` handler (for Enter/Space keys) when turning non-interactive elements into clickable actions, and ensure focus indicators are present.
