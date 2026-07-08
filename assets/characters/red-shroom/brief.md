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
  - Fine tune encounter balance and spore cadence during later gameplay passes.
---

# Red Shroom

Role: mushroom enemy that moves briefly, charges, then releases four red spores toward the room diagonals.

Visual target:
- Use the accepted red mushroom body from the existing Bowbert runtime.
- Preserve the simple doodle silhouette: red cap, pale stem/body, bold black outline, embedded white eye sockets.
- Runtime owns the black changing gaze and dizzy spiral expression.

Decomposition:
- base: fixed mushroom body with baked white eye sockets.
- projectiles: one reusable red spore core in `projectiles/spore.png`.
- runtime: black pupils, dizzy spiral gaze during release, squash/stretch, charge glow, and comet trail.

Prompt packets:
- Target: `base.png`
  - Inputs: `source/reference-01.png`
  - Layer contract: fixed red shroom body with baked eye whites; runtime adds black gaze.
  - Generation prompt: top-down doodle roguelike red mushroom enemy, bold black outline, red cap, pale rounded body, blank white embedded eye sockets, clean transparent background, readable mobile-game shapes.
  - Boundary notes: keep spores, trails, hit particles, and black changing gaze out of the base image.
  - Acceptance checks: silhouette matches the locked reference, eye whites are clean, no baked black pupils, transparent PNG, readable at mobile scale.
- Target: `projectiles/spore.png`
  - Inputs: `source/reference-01.png`
  - Layer contract: reusable red spore core only; runtime draws trail and movement.
  - Generation prompt: red spore projectile core for a doodle mobile roguelike, bold black outline, simple red organic seed shape, transparent background, clean readable shape.
  - Boundary notes: no trail, smoke cloud, impact particles, or body fragments.
  - Acceptance checks: transparent PNG, strong outline, usable as a small projectile, no noisy interior artifacts.
