
## 2024-05-18 - Improved Custom Toggle Switches Accessibility
**Learning:** Custom UI toggle switches designed with standard `<button>` tags and `div` elements often lack semantic meaning, causing screen readers to misinterpret their state and function. Standard generic buttons used as toggles fail to communicate their "on/off" or "checked/unchecked" status to assistive technologies.
**Action:** When creating custom toggle switches (like "Lock room" or "Grant Control"), always explicitly set `role="switch"` and use `aria-checked={true/false}`. Pair these with descriptive `aria-label` and `title` attributes. Additionally, always add explicit `:focus-visible` styles (`focus-visible:ring-2`) since custom components usually strip native browser focus outlines, breaking keyboard navigation visibility.

## 2026-09-02 - Custom Video Player Menu Accessibility
**Learning:** Custom popover menus in the video player control bar (like playback speed and subtitles) lacked the necessary ARIA attributes to communicate their state and connection to screen readers, making navigation opaque.
**Action:** Always pair custom toggle buttons with `aria-expanded`, `aria-haspopup="menu"`, and `aria-controls="[menu-id]"` to properly link them to their respective popover menus.
