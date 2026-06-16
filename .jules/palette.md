
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2026-06-16 - Accessible Subtitle Controls
**Learning:** Fine-grained media controls like subtitle offset buttons (+100ms/-100ms) need explicit aria-labels and aria-live regions for the values, as screen readers don't natively understand their context or announce rapid value changes effectively without them.
**Action:** Always pair interactive adjustment controls with an aria-live region for the value display, and ensure icon-only adjustment buttons have clear aria-labels and visible focus states.
