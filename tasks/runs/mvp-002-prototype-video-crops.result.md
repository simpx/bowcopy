---
id: mvp-002-prototype-video-crops
status: complete
branch: task/mvp-002-prototype-video-crops
worker: worker-mvp-002
updated: 2026-07-05
---

# Result

## Summary

- Added temporary runtime-ready prototype video crops under `assets/prototype-video-crops/`.
- Covered Bowbert, bow/arrow, Dart Goober, hearts, room pieces, and decor pieces with stable descriptive filenames.
- Added `assets/prototype-video-crops/README.md` with source policy and intended loader keys.
- Did not create `src/assets` files because this worktree has no `src/assets` scaffold.

## Created assets

- `player/bowbert-with-bow.png`
- `player/bowbert-gameplay-facing-right.png`
- `weapons/bow-relaxed.png`
- `weapons/bow-aiming.png`
- `weapons/bow-full-draw.png`
- `weapons/arrow-projectile.png`
- `enemies/dart-goober-body.png`
- `enemies/dart-goober-pair-scale-reference.png`
- `ui/heart-full.png`
- `ui/heart-row-five.png`
- `rooms/forest-room-bounds-wide.png`
- `rooms/forest-floor-swatch.png`
- `rooms/forest-east-door-edge.png`
- `rooms/forest-wall-south-segment.png`
- `decorations/crate-barrel.png`
- `decorations/floor-scuff-red.png`
- `decorations/mushroom-purple.png`
- `decorations/stone-block-large.png`
- `decorations/stone-patch.png`
- `decorations/stone-pebble.png`

## Intended manifest keys

Because `src/assets` is absent, these keys should be used when the scaffold is added:

- `prototype.bowbert.withBow`
- `prototype.bowbert.gameplayFacingRight`
- `prototype.weapon.bow.relaxed`
- `prototype.weapon.bow.aiming`
- `prototype.weapon.bow.fullDraw`
- `prototype.weapon.arrow.projectile`
- `prototype.enemy.dartGoober.body`
- `prototype.enemy.dartGoober.pairScaleReference`
- `prototype.ui.heart.full`
- `prototype.ui.heart.rowFive`
- `prototype.room.forest.boundsWide`
- `prototype.room.forest.floorSwatch`
- `prototype.room.forest.eastDoorEdge`
- `prototype.room.forest.wallSouthSegment`
- `prototype.decor.crateBarrel`
- `prototype.decor.floorScuffRed`
- `prototype.decor.mushroomPurple`
- `prototype.decor.stoneBlockLarge`
- `prototype.decor.stonePatch`
- `prototype.decor.stonePebble`

## Checks

- `npm run build`: skipped; `package.json` is absent, so the project scaffold/build script is not available in this worktree.

## Follow-up tasks

- Add a `src/assets` key module or manifest once the project scaffold exists.
