
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-07-24 - Accessible Password Visibility Toggles
**Learning:** Icon-only buttons used for toggling password visibility (like an eye icon) often lack proper screen reader context because they rely entirely on visual cues. Furthermore, the SVG elements themselves can sometimes be read redundantly by screen readers.
**Action:** Always provide an `aria-label` or `title` (e.g., "Show PIN" / "Hide PIN") to icon-only buttons. Additionally, set `aria-hidden="true"` on the internal SVG icons to ensure screen readers only announce the label, preventing repetitive or confusing output. Ensure these buttons also have `focus-visible` styles for keyboard navigation.
