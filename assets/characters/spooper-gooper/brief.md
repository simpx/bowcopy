---
status: reference-locked
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
openItems:
  - Generate or accept `base.png`.
  - Fill confirmed runtime values in `rig.json`.
  - Decide whether ghost attack is contact-only or projectile-based.
---

# Spooper Gooper

Role:
- Bowbert project enemy.

Behavior:
- Ghost enemy: hidden, appear, hover while vulnerable, attack/feint, disappear, then reposition.
- Runtime opacity and hover sell the animation; vulnerability is tied to visible phases.

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Do not invent unconfirmed props, limbs, pose changes, or material changes.

Source:
- `source/reference-01.png`

Decomposition:
- base.png: fixed enemy body.
- attachments/: only independently positioned art such as eyes, weapon, shell, hat, or props.
- projectiles/: reusable projectile cores, no baked trails.
- vfx/: runtime trail/particle notes if separate assets are needed.
- runtime: gaze, squash/stretch, bob, tilt, attack/hit/death timing, projectile origin, particles.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`

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
- use runtime alpha, squash, and hover instead of sprite sheets.
- motion fields: hoverBob, hoverDrift, appearMs, visibleMs, attackAnticipationMs, disappearMs, repositionMs.
- renderer should preview hidden/appearing/hovering/attacking/disappearing states.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
