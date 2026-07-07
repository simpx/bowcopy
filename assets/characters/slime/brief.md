---
status: asset-generated
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/reference-02.png
openItems:
  - Review generated `base.png` against `comparison.png`.
  - Tune exact eye positions, scale, and hitbox after visual approval.
  - Decide whether splitting belongs in a later task.
---

# Slime

Role:
- Bowbert project enemy.

Behavior:
- Hopper enemy: idle wobble, pre-jump squash, airborne stretch, landing squash, then short recovery.
- Splitting is not part of this MVP task; record it as a follow-up after jump timing feels good.

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Do not invent unconfirmed props, limbs, pose changes, or material changes.

Source:
- `source/reference-01.png`
- `source/reference-02.png`

Decomposition:
- base.png: generated fixed enemy body.
- attachments/: only independently positioned art such as eyes, weapon, shell, hat, or props.
- projectiles/: reusable projectile cores, no baked trails.
- vfx/: runtime trail/particle notes if separate assets are needed.
- runtime: gaze, squash/stretch, bob, tilt, attack/hit/death timing, projectile origin, particles.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`
- `source/reference-02.png`

Mode: image-to-image, high reference fidelity.

Positive prompt:
> Transparent-background Bowbert project top-down doodle enemy sprite matching the locked reference. Preserve exact silhouette, posture, thick black outline, simple color blocking, focal face/eye features, and scale relationship. Create a clean reusable base layer for Bowbert runtime squash/stretch, bob, tilt, hit, and expression overlays.

Negative prompt:
> No new props, no extra limbs, no different pose, no camera angle change, no rendered floor, no baked motion trail, no text, no UI, no realistic material drift.

Acceptance checks:
- Silhouette and palette match the locked reference.
- Runtime-changing parts are separated when practical.
- Transparent PNG, tight crop with enough room for protrusions.

### projectiles/<name>.png

Inputs:
- TODO

Mode: image-to-image when a projectile/effect reference exists.

Positive prompt:
> TODO

Negative prompt:
> No background, no UI, no text, no unrelated props.

Acceptance checks:
- TODO

Runtime rig notes:
- use procedural hopper motion instead of frame animation.
- motion fields: idleWobble, preJumpSquash, airStretch, landingSquash, jumpHeight, jumpDurationMs, recoverMs.
- runtime preview should show idle, pre-jump, airborne, landing, hit, and death deformation.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
