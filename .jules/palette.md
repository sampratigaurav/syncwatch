
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-19 - Accessible Icon-Only External Links
**Learning:** Icon-only external links (like GitHub repository links) without ARIA labels are inaccessible to screen reader users who cannot see the visual icon. Furthermore, omitting `aria-hidden="true"` on the inner SVG icon can cause redundant or confusing announcements, and missing focus-visible styling hinders keyboard navigation.
**Action:** Always add descriptive `aria-label` and `title` attributes to icon-only links, apply `aria-hidden="true"` to the inner SVG, and ensure visible focus states are styled appropriately using `focus-visible`.
