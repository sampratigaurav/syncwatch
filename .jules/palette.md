
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-18 - Contextual Feedback for Disabled Collaborative Controls
**Learning:** In synchronized features, disabling controls (like video play/pause or seek) for viewers without providing context makes it unclear whether the app is broken or if it's a deliberate permission restriction.
**Action:** For synchronized and collaborative features, always provide contextual tooltips (`title`) and `aria-label`s on elements disabled due to role or permission restrictions, explaining why they are disabled (e.g., "You don't have permission to control playback").
