## 2023-10-27 - Added ARIA attributes and focus-visible states to Header
**Learning:** Adding explicit `type="button"` to elements triggering modals/dropdowns prevents unintentional form submission behaviors that may occur in certain frameworks, while `aria-expanded` accurately reflects state for screen readers interacting with custom dropdowns.
**Action:** Consistently add `type="button"`, `aria-expanded` (for toggles), and `focus-visible` styling to all custom interactive elements built with basic HTML tags to improve accessibility and keyboard navigation.
