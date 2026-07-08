---
status: runtime-integrated
kind: combat-room-theme
projectContext: bowbert
runtimeTheme: stone
sharedKit: ../room-theme-kit.json
sourceReferences:
  - ../../prototype-video-crops/decorations/stone-block-large.png
  - ../../prototype-video-crops/decorations/stone-patch.png
openItems: []
---

# Stone Room

Role: normal combat room biased toward stone props and heavier enemies.

Visual target:
- Reuse the same room silhouette as the forest room.
- Shift the floor slightly cooler and reduce the warm wood feel.
- Add multiple stone clusters while keeping the floor marks sparse.

Runtime:
- Renderer and dungeon metadata are loaded through `src/data/roomThemeKit.ts`.
- Preferred enemies: Dart Tri Goober, parent Slime, and child Slime.
- Door decorations use stone clusters when a door points to a stone room.
