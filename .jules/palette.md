
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-18 - Improved Subtitle Toggle Button Accessibility
**Learning:** Adding explicit semantic accessibility attributes (`role="switch"`, `aria-checked`, `aria-label`, `title`) and keyboard focus styling (`focus-visible:ring-2`) to non-standard toggle buttons ensures proper support for screen readers and keyboard navigation users.
**Action:** Always check custom interactive elements for missing roles and ARIA attributes to ensure they comply with accessibility standards.
