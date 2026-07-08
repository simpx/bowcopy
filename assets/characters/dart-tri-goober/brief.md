---
status: playtested
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
openItems:
  - Tune combat balance and room placement after gameplay balancing.
---

# Dart Tri Goober

Role:
- Enemy: ranged wooden mask goober.

Behavior:
- Ranged Dart Goober variant: short move bursts, face the player, charge a muzzle glow, then fire a dart.
- Runtime implementation reuses Dart Goober timing and swaps art, rig, and renderer in stone/boss rooms.

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

Layer contract:
- Fixed Goober mask/body base with baked slanted white eye sockets.
- Runtime owns black cut-ellipse gaze, muzzle charge, darts, and attack feedback.

Generation prompt:
> Transparent-background Bowbert project enemy body sprite matching the locked goober reference. Preserve the squat mask/body silhouette, thick black outline, simple color blocks, slanted blank white eye sockets, cyan markings, leaf crown, and doodle proportions. Create a clean reusable base layer for runtime embedded-eye expressions.

Boundary notes:
> Single centered character sprite, transparent background, clean edges, Bowbert doodle style, enough crop padding for feet, leaf crown, and runtime eye overlays.

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

Layer contract:
- Reusable dart projectile core when a dedicated dart asset is needed.
- Runtime owns trajectory, trail, impact, and muzzle charge.

Generation prompt:
> Transparent-background Bowbert project dart projectile core, simple doodle shape, thick outline, readable at mobile scale.

Boundary notes:
> Single projectile core, transparent background, clean crop, enough padding for runtime trail and impact layering.

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

Runtime evidence:
- `src/characters/dartTriGooberRig.ts`: points to `assets/characters/dart-tri-goober/base.png` and stores accepted embedded eye placement.
- `src/render/enemies/DartTriGooberRenderer.ts`: renders the accepted PNG base with runtime black cut-ellipse gaze.
- `src/game/scenes/CombatRoomScene.ts`: supports `?encounter=dart-tri-goober` debug previews.
- `playtest/runtime-encounter.png`: browser screenshot proof that the accepted runtime renderer appears in the game scene.
