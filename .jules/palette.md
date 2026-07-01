
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2024-05-14 - Disabled state clarity for synchronized playback
**Learning:** In synchronized viewing scenarios, standard disabled states for playback controls (like "Skip back 10 seconds") cause confusion if viewers assume their video is broken when they just don't have host control. Tooltips on disabled playback controls are crucial context.
**Action:** Always provide contextual tooltips and aria-labels dynamically on interactive elements when they are disabled due to role/permissions, specifically explaining *why* they cannot be used.
