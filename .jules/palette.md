
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-07-03 - Keyboard Accessible Tooltips and Hover States
**Learning:** Tooltip hover states using CSS `group-hover` must also include `group-focus-within` to be accessible via keyboard. Additionally, the trigger element must have `tabIndex={0}` or be inherently focusable.
**Action:** Always pair `group-hover` with `group-focus-within` for tooltips, and ensure the interactive element is properly focusable.
