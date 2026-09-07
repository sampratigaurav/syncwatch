
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2025-02-27 - Accessible Interactive Menus
**Learning:** Custom popup menus and dropdowns that only toggle visibility without ARIA states leave screen reader users unaware of the popup's presence or their selection. If multiple identical components are rendered on the page, static ID attributes can cause accessibility conflicts for aria-controls.
**Action:** Always add `aria-expanded` and `aria-controls` to menu toggle buttons, and use `role="menu"` with `role="menuitemradio"` and `aria-checked` for selectable list options to provide explicit semantic context. When linking popovers via `id`, prefer using React's `useId()` to guarantee uniqueness across component instances.
