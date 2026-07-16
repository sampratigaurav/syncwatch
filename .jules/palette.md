
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-07-16 - Video Player Subtitle Switch Accessibility
**Learning:** Custom toggle switches in the video player menu (like subtitles) were lacking appropriate ARIA roles and states, causing screen readers to miss their purpose and current state. They also lacked keyboard focus indicators.
**Action:** When implementing custom toggles, always use `role="switch"`, `aria-checked`, provide descriptive labels (`aria-label`, `title`), and ensure visible focus states (`focus-visible:ring-2`).
