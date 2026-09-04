# 14-cevicheria-peruana

This folder is a pixel-accurate implementation package for Codex.

## Source of truth

`reference/reference.png` is the **absolute visual source of truth**. Assets help reproduce it, but if an asset conflicts with the reference, the reference wins.

## Dynamic restaurant images

The reference may show sample food, menu, venue, hero or gallery photography. Those photographs are **not template assets**. In Tango Reservas they must come from the restaurant's configurable content. Keep the exact image slots, crop behavior and geometry shown by the reference, but use the restaurant's images.

## Asset folders

- `assets/icons/`: small symbols and badges (35)
- `assets/ui/`: buttons, fields and controls (7)
- `assets/dividers/`: horizontal separators and repeated rules (12)
- `assets/panels/`: larger reusable frames/panels (1)
- `assets/ornaments/`: decorative motifs and larger flourishes (8)

Every asset is an individual PNG. There are no production sprite sheets in this folder.

## Mandatory implementation rules

1. Implement first at **864 × 1821 reference geometry**. Responsive work comes only after the reference-width version matches.
2. Never stretch an asset non-uniformly. Preserve intrinsic aspect ratio.
3. Never use `object-fit: fill`, `background-size: 100% 100%`, `scaleX()` or `scaleY()` to force an asset into place.
4. Patterns repeat; they do not stretch.
5. Use `reference/reference.png` for screenshot comparison after each section.
6. Do not use the reference image itself as the webpage background. Rebuild the page.
7. Do not bake the sample menu/gallery photography into the template.
8. Functional forms and Tango Reservas data must remain real HTML/UI, positioned and styled to match the reference.
9. Stop only when structural visual differences are negligible.

## Specs

- `spec/asset-manifest.json`: every asset, its dimensions, category and original source position.
- `spec/layout-spec.json`: reference dimensions, detected horizontal section guides and implementation rules.
- `spec/colors.json`: dominant reference colors extracted from the source image.

Use the root `CODEX_PROMPT.md` for the full implementation workflow.
