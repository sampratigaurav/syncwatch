
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-06-27 - Custom Switch Accessibility
**Learning:** Custom UI switches (like subtitle toggles) must explicitly use `role="switch"` and `aria-checked` rather than relying on visual state alone, to ensure screen reader users understand the component's purpose and state.
**Action:** Always add `role="switch"`, `aria-checked`, descriptive labels (`aria-label`, `title`), and `:focus-visible` styles to custom toggle switches.
