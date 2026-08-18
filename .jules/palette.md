
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-08-18 - Improved Custom Dropdowns Accessibility
**Learning:** Custom UI dropdowns and interactive list menus designed with `div` containers and standard `<button>` tags often lack semantic meaning and proper keyboard accessibility. The absence of roles (`menu`, `menuitem`), state attributes (`aria-expanded`, `aria-haspopup`), and visible focus indicators severely hampers screen reader compatibility and keyboard navigation.
**Action:** When creating custom dropdowns, ensure the toggle button has `aria-expanded` and `aria-haspopup="menu"`. The dropdown container must use `role="menu"` and items within should use `role="menuitem"`. Additionally, explicitly add `focus-visible` classes to all interactive elements to support robust keyboard navigation.
