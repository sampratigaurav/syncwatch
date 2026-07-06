
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-07-06 - Added Missing ARIA Labels to Icon-Only Buttons
**Learning:** Icon-only buttons without `aria-label` attributes are completely inaccessible to screen reader users, who hear only 'button' without context. Furthermore, SVG elements inside these buttons should have `aria-hidden="true"` to prevent redundant or confusing announcements.
**Action:** Always add descriptive `aria-label` and `title` attributes to icon-only buttons, and ensure inner SVGs include `aria-hidden="true"`.
