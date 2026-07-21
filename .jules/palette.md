
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-07-21 - Accessible Interactive Cards
**Learning:** Interactive cards or banners (like the "My Friend Code" section) built as `<div onClick={...}>` fail keyboard navigation and screen reader interactions.
**Action:** Always use semantic `<button type="button">` for interactive cards. Add `w-full text-left` to maintain layout, provide descriptive `aria-label`s, and pair `group-hover` styles with `group-focus-visible` to ensure visual feedback during keyboard navigation.
