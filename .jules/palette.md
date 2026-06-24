
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-18 - Custom Toggle Switches Accessibility
**Learning:** For custom toggle switches constructed from native elements (e.g. `button`), `role="switch"` and `aria-checked` are necessary to provide correct screen reader semantics. Native `<input type="checkbox">` elements have this implicitly, but custom HTML representations require it explicitly. Furthermore, missing `focus-visible` styles can make keyboard navigation difficult.
**Action:** Always add `role="switch"` and `aria-checked` attributes to any custom toggle components, along with clear `focus-visible` states. Ensure it has `aria-label` or `title` as well.
