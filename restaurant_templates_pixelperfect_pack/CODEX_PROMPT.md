# CODEX MASTER PROMPT — PIXEL-PERFECT TEMPLATE IMPLEMENTATION

You are implementing one of the templates contained in this folder.

## Absolute objective
Reproduce `reference/reference.png` as faithfully as technically possible. This is NOT a redesign, interpretation, modernization, or approximation. The reference is the source of truth.

## Before coding
1. Read the template `README.md`.
2. Read `spec/layout-spec.json` and `spec/asset-manifest.json`.
3. Inspect `reference/reference.png` at its native 864 × 1821 dimensions.
4. Inspect the natural dimensions and aspect ratios of every asset you intend to use.
5. Make a section-by-section implementation plan. Do not start by coding the whole page.

## Dynamic restaurant photography
Menu, gallery, venue and other content photography shown in the reference is sample content. Use Tango Reservas restaurant-provided images in those exact visual slots. Do NOT bake reference food/gallery photographs into CSS or production assets.

## Asset distortion is forbidden
Never use:
- `object-fit: fill`
- `background-size: 100% 100%` on decorative assets
- `transform: scaleX(...)` or `scaleY(...)`
- arbitrary width AND height that changes an image aspect ratio

Every image keeps its natural aspect ratio. Patterns repeat rather than stretch.

## First-pass viewport
Implement and validate FIRST at exactly 864 CSS pixels wide, matching the reference geometry. Do not work on responsive behavior until this version visually matches.

## Required workflow
Implement one section at a time:
1. header/nav
2. hero
3. menu/featured content
4. intermediate feature/category sections
5. booking/forms
6. delivery/order CTA
7. gallery
8. contact/map
9. footer

After EACH section:
- launch the app
- capture a browser screenshot at the reference width
- compare it with `reference/reference.png`
- create/use a 50/50 overlay or visual diff
- correct geometry before moving on

## Visual priority
Fix differences in this order:
1. section Y positions/heights
2. container widths and column geometry
3. large image slots
4. large decorative assets/backgrounds
5. typography size/line-height/weight
6. spacing
7. borders/radii
8. micro-decoration

## No creative freedom
Do not invent margins, colors, asset placements, section order, backgrounds or visual treatments. Do not make something "cleaner" or "more modern". Copy the reference.

## Functional UI
Reservation/order forms must remain real functional HTML controls wired to Tango Reservas. Style and position them to match the reference; do not replace them with a screenshot.

## Completion criteria
Do not finish merely because TypeScript/build/QA passes. Before reporting completion:
- run typecheck/build/QA
- capture final screenshot
- compare against the reference
- inspect every asset for distortion
- verify no sample restaurant photography is hardcoded
- report any remaining visual differences explicitly

If the visual result still obviously differs from the reference, continue iterating.
