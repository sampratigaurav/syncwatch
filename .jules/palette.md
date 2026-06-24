
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-06-24 - Custom Toggle Switches & Accessibility
**Learning:** Custom toggle switches (like 'Lock Room') frequently miss critical ARIA roles and keyboard states, making them invisible to screen readers and keyboard users.
**Action:** Always ensure custom switches explicitly use `role="switch"`, an `aria-checked={value}` attribute corresponding to their state, an `aria-label` or `aria-labelledby`, and `:focus-visible` styles for keyboard navigation.
