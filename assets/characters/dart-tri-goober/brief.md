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
  - Integrate as a room variant after the visual is approved.
---

# Dart Tri Goober

Role:
- Enemy: ranged wooden mask goober.

Behavior:
- Ranged Dart Goober variant: short move bursts, face the player, charge a muzzle glow, then fire a dart.
- MVP implementation should reuse Dart Goober timing and only swap art, rig, and renderer.

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Do not invent unconfirmed props, limbs, pose changes, or material changes.

Source:
- `source/reference-01.png`

Decomposition:
- base.png: fixed goober body/mask with baked sockets/whites as needed.
- attachments/eyes: runtime cut-ellipse pupils/expressions.
- projectiles/dart.png: optional reusable dart projectile core.
- runtime: angry/aim/hit gaze, idle/walk bob, walk squash, velocity tilt, muzzle charge.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`

Mode: image-to-image, high reference fidelity.

Positive prompt:
> Transparent-background Bowbert project enemy body sprite matching the locked goober reference. Preserve the squat mask/body silhouette, thick black outline, simple color blocks, eye sockets/whites, and doodle proportions. Create a clean reusable base layer for runtime embedded-eye expressions.

Negative prompt:
> No new props, no extra limbs, no different pose, no camera angle change, no rendered floor, no baked motion trail, no text, no UI, no realistic material drift.

Acceptance checks:
- Silhouette and palette match the locked goober reference.
- Eye whites/sockets can be baked, but runtime pupils/cut-ellipse expressions remain controllable.
- Dart muzzle/projectile effects are not baked into body art.
- Transparent PNG, tight crop with enough room for feet and side eye protrusions.

### projectiles/dart.png

Inputs:
- TODO: add dart projectile reference when available.

Mode: image-to-image when a projectile reference exists.

Positive prompt:
> Transparent-background Bowbert project dart projectile core, simple doodle shape, thick outline, readable at mobile scale.

Negative prompt:
> No monster body, no trail baked into projectile, no UI, no text, no rendered background.

Acceptance checks:
- Projectile is separate from body and attack charge.
- Runtime can add trail/impact separately.

Runtime rig notes:
- gaze: embedded-eye-pupils, angry-embedded, cut-ellipse default/angry/aim plus alert/scared/hit.
- motion: idleBob 2, walkBob 2, walkSquash 0.065, idleSquash 0.018, hitScaleX 0.08, hitScaleY 0.04, walkTilt 0.05, velocityTilt 0.08.
- attack: anticipation 0.11, chargeShift 5, muzzleX 27, muzzleY -20, muzzleAimY 16, muzzleRadius 9, muzzleScaleBase 0.45, muzzleScaleCharge 0.95, muzzleAlphaBase 0.1, muzzleAlphaCharge 0.45.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
