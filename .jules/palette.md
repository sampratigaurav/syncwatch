
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-07-04 - Keyboard Accessibility for CSS-only Tooltips
**Learning:** When implementing CSS-only tooltips with Tailwind's group-hover, they remain inaccessible to keyboard users.
**Action:** Always add tabIndex={0} to the parent container and pair group-hover styles with group-focus-within to guarantee screen reader and keyboard nav visibility.
