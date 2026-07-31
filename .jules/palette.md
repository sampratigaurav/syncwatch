
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-07-31 - Improved External Icon-Only Links Accessibility
**Learning:** External links that only contain icons (like the GitHub social link) are often ignored by screen readers if they lack descriptive text, causing confusion for users navigating via keyboard or assistive technologies. Additionally, standard focus outlines are sometimes difficult to see against dark backgrounds.
**Action:** When adding icon-only external links, always include both descriptive `aria-label` and `title` attributes. Furthermore, add `aria-hidden="true"` to the inner icon element to prevent redundant screen reader announcements. Finally, ensure visible focus styles (e.g., `focus-visible:ring-2`) are applied for keyboard navigation.
