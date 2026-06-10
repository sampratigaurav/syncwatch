## 2026-06-10 - Focus Rings and Aria Setup
**Learning:** Found that icon buttons in SyncWatch often lack explicit `aria-label` attributes and rely on `title` which may not always be optimal for screen reader users or keyboard users needing visible focus rings.
**Action:** When adding or checking buttons in the future, always ensure `focus-visible:ring-2 focus-visible:ring-teal-500` is present for visual keyboard accessibility, and an `aria-label` is used for screen readers.
