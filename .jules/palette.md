
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-24 - Icon-only Button Accessibility
**Learning:** Icon-only buttons using nested SVGs can cause redundant or unhelpful screen reader announcements if the SVG isn't hidden, and they are frequently missing focus styles in custom designs.
**Action:** For icon-only buttons, always include descriptive `aria-label` and `title` attributes, add `aria-hidden="true"` to the inner icon element (e.g., SVGs), and ensure `:focus-visible` styles are explicitly defined for keyboard users.
