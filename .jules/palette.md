
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-08-02 - Accessible Tooltips and Icon Links
**Learning:** CSS-only tooltips relying on `group-hover:opacity-100` are completely invisible to keyboard navigation if the trigger element is a generic `div`. Additionally, icon-only external links frequently lack descriptive names for screen readers.
**Action:** Always use natively focusable elements like `<button type="button">` for tooltip triggers and pair `group-hover:opacity-100` with `group-focus-within:opacity-100`. Ensure icon-only links include `aria-label`, `title`, and set `aria-hidden="true"` on the SVG.
