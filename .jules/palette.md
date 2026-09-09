
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2024-09-09 - Accessible Toggle Buttons
**Learning:** When using aria-expanded for collapsible components like accordion sections or inline edit forms, always ensure the toggle button also includes aria-controls linking to the id of the target container for proper screen reader support.
**Action:** Always pair aria-expanded with aria-controls referencing a valid id.
