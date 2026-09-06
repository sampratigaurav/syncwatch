
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2025-01-20 - Add ARIA labels to Profile Modal icon buttons
**Learning:** Icon-only buttons and image-only buttons (like avatar selectors) in the `ProfileModal` component were completely inaccessible to screen readers. Adding `aria-label` to the button and `aria-hidden="true"` to the decorative icon inside is a crucial and reusable pattern.
**Action:** Always ensure icon-only interactive elements have proper `aria-label`s and that their internal SVGs/images are hidden from screen readers.
