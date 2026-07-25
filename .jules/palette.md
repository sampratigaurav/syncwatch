
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-10-27 - Keyboard Accessible CSS Tooltips
**Learning:** CSS-based tooltips that rely solely on `group-hover` for visibility are inaccessible to keyboard-only users navigating via Tab. Adding `tabIndex={0}` to non-semantic elements like `div` causes SonarCloud Quality Gate accessibility failures.
**Action:** When implementing CSS tooltips, always pair `group-hover` with `group-focus-within`. Use natively focusable semantic elements like `<button type="button">` for the parent trigger rather than a `div` to ensure correct screen reader semantics and keyboard navigation support.
