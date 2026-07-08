# Bowbert UI Assets

UI assets in this project are mostly runtime-drawn DOM/SVG layers. Keep each visible HUD family in its own folder with a small rig file, preview page, and runtime references.

## Folders

- `hearts/`: player health hearts, half-heart state, empty state, and damage flash/wiggle.
- `sigils/`: wizard-room power-up icon/card set and future reward-choice data.
- `touch-controls/`: mobile joystick, aim zone, and dodge overlay.

## Runtime Contract

- Persistent HUD should stay at the viewport edges and keep the playfield clear.
- DOM/SVG is preferred for health and text-heavy UI because it is crisp on mobile and easy to tune.
- Runtime values should come from each UI folder's `rig.json` through a `src/data/*` bridge.
