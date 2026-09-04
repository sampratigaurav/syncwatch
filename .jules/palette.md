
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.
## 2024-09-04 - Accessible Custom Tabs
**Learning:** When building custom tab components with Tailwind, simply using buttons is not enough for screen readers. They need explicit ARIA semantics (role="tablist", role="tab", role="tabpanel") and relationship attributes (aria-controls, aria-labelledby) for users to understand their structure and navigate between the tabs and content.
**Action:** Always include explicit ARIA roles and relationships (tablist/tab/tabpanel, aria-selected, aria-controls) when implementing custom tab navigation.
