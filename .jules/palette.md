
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2024-06-15 - Icon-only Link Accessibility
**Learning:** Icon-only anchor links (like social links in headers) often lack accessible names, causing screen readers to read the raw URL which is a poor user experience. Additionally, SVG icons inside these links can be redundantly announced if not hidden.
**Action:** When adding icon-only links, always include both `aria-label` and `title` attributes on the `<a>` tag, and add `aria-hidden="true"` to the inner SVG elements. Also ensure custom components have `:focus-visible` styles for keyboard navigation visibility.
