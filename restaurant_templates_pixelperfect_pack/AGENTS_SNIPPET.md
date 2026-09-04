## Reference-image template tasks
When implementing a UI from a template reference image:
- The reference screenshot is the absolute visual source of truth.
- Do not reinterpret or creatively improve it.
- Implement at the reference viewport first, then responsive behavior.
- Never distort raster assets; preserve aspect ratio.
- Never use object-fit: fill for reference assets.
- Never use background-size: 100% 100% for decorative images/patterns.
- Repeating patterns repeat; they are not stretched.
- Menu/gallery sample photographs are not template assets; use restaurant-configurable images in the same slots.
- Work section-by-section and validate with browser screenshots/overlay diffs.
- A visual task is not complete merely because it compiles.
