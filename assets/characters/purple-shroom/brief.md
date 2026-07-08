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
  - Fine tune purple spore cadence and room placement during later gameplay passes.
---

# Purple Shroom

Role: purple mushroom variant that shares the red shroom behavior but uses a purple body, purple spore projectile, and purple comet trail.

Visual target:
- Use the accepted purple mushroom body from the existing Bowbert runtime.
- Preserve the simple doodle silhouette: purple cap, pale stem/body, bold black outline, embedded white eye sockets.
- Runtime owns the black changing gaze and dizzy spiral expression.

Decomposition:
- base: fixed purple mushroom body with baked white eye sockets.
- projectiles: one reusable purple spore core in `projectiles/spore.png`.
- runtime: black pupils, dizzy spiral gaze during release, squash/stretch, charge glow, and purple comet trail.

Prompt packets:
- Target: `base.png`
  - Inputs: `source/reference-01.png`, `source/reference-01-source.png`
  - Layer contract: fixed purple shroom body with baked eye whites; runtime adds black gaze.
  - Generation prompt: top-down doodle roguelike purple mushroom enemy, bold black outline, purple cap, pale rounded body, blank white embedded eye sockets, clean transparent background, readable mobile-game shapes.
  - Boundary notes: keep spores, trails, hit particles, and black changing gaze out of the base image.
  - Acceptance checks: silhouette matches the locked reference, eye whites are clean, no baked black pupils, transparent PNG, readable at mobile scale.
- Target: `projectiles/spore.png`
  - Inputs: `source/reference-01.png`, `source/reference-01-source.png`
  - Layer contract: reusable purple spore core only; runtime draws trail and movement.
  - Generation prompt: purple spore projectile core for a doodle mobile roguelike, bold black outline, simple purple organic seed shape, transparent background, clean readable shape.
  - Boundary notes: no trail, smoke cloud, impact particles, or body fragments.
  - Acceptance checks: transparent PNG, strong outline, usable as a small projectile, no noisy interior artifacts.
