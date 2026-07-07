---
status: asset-generated
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
openItems:
  - Review generated `base.png` with baked slanted white eye sockets and runtime expression preview in `tuning.html`.
  - Tune exact eye positions, scale, and hitbox after visual approval.
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
- base.png: generated fixed goober body/mask with baked slanted white eye sockets, but no baked black gaze fill.
- exports/base-with-baked-pupils.png: rejected first generated candidate kept for comparison.
- exports/base-pupil-erased-v1.png: previous manual cleanup pass kept for rollback/provenance.
- exports/base-eye-whites-slanted-v2.png: accepted slanted-eye-white pass, also mirrored to `base.png`.
- exports/base-round-eye-whites-v3.png: rejected pass where round neutral eye whites lost the original Dart Tri Goober eye silhouette.
- runtime gaze layer: black Dart Goober cut-ellipse expressions over the baked slanted white eye sockets.
- projectiles/dart.png: optional reusable dart projectile core.
- runtime: angry/aim/hit gaze, idle/walk bob, walk squash, velocity tilt, muzzle charge.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`

Mode: image-to-image, high reference fidelity.

Positive prompt:
> Transparent-background Bowbert project enemy body sprite matching the locked goober reference. Preserve the squat mask/body silhouette, thick black outline, simple color blocks, slanted blank white eye sockets, cyan markings, leaf crown, and doodle proportions. Create a clean reusable base layer for runtime embedded-eye expressions.

Negative prompt:
> No black gaze fill inside the white eye sockets, no eyelids, no spirals, no new props, no extra limbs, no different pose, no camera angle change, no rendered floor, no baked motion trail, no text, no UI, no realistic material drift.

Acceptance checks:
- Silhouette and palette match the locked goober reference.
- Slanted white eye sockets are baked into `base.png`.
- Runtime-changing black cut-ellipse gaze is absent from `base.png`.
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
- gaze: embedded-eye-pupils, angry-embedded, Dart Goober cut-ellipse default/angry/aim plus hit.
- motion: idleBob 2, walkBob 2, walkSquash 0.065, idleSquash 0.018, hitScaleX 0.08, hitScaleY 0.04, walkTilt 0.05, velocityTilt 0.08.
- attack: anticipation 0.11, chargeShift 5, muzzleX 27, muzzleY -20, muzzleAimY 16, muzzleRadius 9, muzzleScaleBase 0.45, muzzleScaleCharge 0.95, muzzleAlphaBase 0.1, muzzleAlphaCharge 0.45.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
