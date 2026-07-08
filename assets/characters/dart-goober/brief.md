---
status: playtested
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/reference-01-source.png
openItems:
  - Audio remains selected in the shared combat SFX layer rather than this character folder.
  - Balance for dart cadence and encounter density remains a gameplay tuning item.
---

# Dart Goober

Role: base ranged wooden mask enemy that moves around the room, charges, and fires darts at Bowbert.

Visual target:
- Use the accepted Bowbert runtime dart goober body.
- Preserve the doodle wooden mask shape, green leafy top, cyan embedded eye frames, large white eye sockets, and bold black outline.
- Runtime owns the black changing gaze over the fixed eye whites.

Decomposition:
- base: fixed wooden mask body with baked cyan eye frames and white eye sockets.
- runtime: black cut-ellipse gaze, alert/hit/aim expressions, squash/stretch, muzzle glow, and small fire particles.
- projectiles: darts are shared runtime projectiles and are not stored in this character folder yet.

Prompt packets:
- Target: `base.png`
  - Inputs: `source/reference-01.png`, `source/reference-01-source.png`
  - Layer contract: fixed dart goober body with baked cyan eye frames and white eye sockets; runtime draws black changing gaze.
  - Generation prompt: top-down doodle roguelike wooden mask enemy, bold black outline, green leafy crest, brown wood body with simple grain marks, cyan embedded eye frames, blank white slanted eye sockets, clean transparent background, readable mobile-game shape.
  - Boundary notes: keep darts, muzzle glow, hit particles, and black changing gaze out of the body base.
  - Acceptance checks: transparent PNG, body matches accepted runtime silhouette, eye whites are clean, cyan frames are fixed, no baked black eye fill, readable at mobile scale.
