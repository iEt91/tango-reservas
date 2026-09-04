# Restaurant Templates — Pixel-Perfect Pack

This pack contains **11 independent template folders**. Each template includes its own reference image, individually separated PNG assets, manifest, colors and layout guide.

## Critical content rule

Photos shown inside menu cards, galleries and similar content areas are examples from the visual reference. They are not production assets. Tango Reservas must supply the restaurant's own images while preserving the reference's exact slot geometry and crop behavior.

## How to install

Copy the template folders into the project's template/reference workspace without renaming their internal files. Point Codex to this folder and use `CODEX_PROMPT.md`.

## Fidelity hierarchy

1. `reference/reference.png` — absolute truth
2. `spec/layout-spec.json` — geometry guide
3. `spec/asset-manifest.json` — available isolated assets
4. per-template `README.md`

If any secondary source disagrees with the reference screenshot, the screenshot wins.

## Asset policy

All production assets in each `assets/` directory are individual PNG files. No generated sprite sheet is included.
