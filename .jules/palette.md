
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2024-08-09 - Accessible Header Icons and Dropdowns
**Learning:** Icon-only external links (like GitHub) and complex custom dropdown triggers require careful ARIA state management (`aria-expanded`, `aria-haspopup`) and focus rings (`focus-visible:ring-2`) to remain usable for screen readers and keyboard navigators.
**Action:** Always verify that interactive elements lacking visible text labels have descriptive `aria-label` attributes and that stateful UI components announce their expanded/collapsed state to assistive technologies.
