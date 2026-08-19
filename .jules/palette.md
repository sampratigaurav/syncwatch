
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2024-05-24 - Visually Hidden Tooltips Keyboard Accessibility
**Learning:** In Tailwind-based UIs, tooltips or elements visually hidden with `opacity-0 group-hover:opacity-100` must have a corresponding focus equivalent (like `focus-visible:opacity-100` or `group-focus-within:opacity-100`) to be accessible via keyboard navigation.
**Action:** Always ensure any group-hover interactive tooltips include a `group-focus-within` to maintain keyboard focus parity.
