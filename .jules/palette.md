
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-24 - Semantic Roles in Custom Selection Grids
**Learning:** When using grids of buttons to allow a single selection (like an avatar picker), simply making them `<button>` elements is insufficient for screen readers. Users don't know it's a single-choice list or which item is currently selected.
**Action:** Always wrap single-selection grids in a container with `role="radiogroup"` and `aria-labelledby`, and give the buttons `role="radio"` and `aria-checked={isSelected}`. Include `focus-visible` styles so keyboard users can track their selection.
