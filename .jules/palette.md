
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2024-08-25 - Prevent Redundant Icon Announcements
**Learning:** When adding an `aria-label` to a parent link or button that contains an icon component (like `<Github />`), the inner SVG must be explicitly hidden from the accessibility tree using `aria-hidden="true"`, otherwise screen readers may attempt to announce both the parent label and the child element.
**Action:** Always verify icon components receive `aria-hidden="true"` when their parent element provides the accessible name via `aria-label`.

## 2024-08-25 - Playwright Strict Mode Violations
**Learning:** Using generic attribute locators (like `page.locator('a[href="..."]')`) in Playwright scripts can lead to strict mode violations if the same link appears in multiple places (e.g., both the header and footer).
**Action:** Prefer semantic locators like `page.get_by_role("link", name="...")` to uniquely target elements based on their accessible names, which also verifies the accessibility implementation.
