
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-07-24 - Header Keyboard Navigation & Tooltips Accessibility
**Learning:** The "Extension coming soon" tooltip in the header was using a generic `div` with `group-hover`, making it entirely inaccessible to keyboard users, which is a common failure pattern for CSS-only tooltips. Additionally, key interactive elements like the GitHub link and Auth buttons were missing `:focus-visible` outlines.
**Action:** Always replace non-semantic tooltip triggers with `<button type="button">` and explicitly pair `group-hover` with `group-focus-within` for keyboard accessibility. Ensure all interactive header elements (links, dropdowns) have descriptive ARIA labels, `aria-hidden` on icons, and visible `focus-visible` rings.
