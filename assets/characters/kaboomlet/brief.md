---
status: rigged
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/video-approach-contact-reference.jpg
  - source/video-explosion-aoe-reference.jpg
  - source/video-explosion-radius-reference.jpg
openItems:
  - Tune exact explosion radius, countdown timing, and player damage after game integration.
  - Select fuse/explosion sounds after gameplay timing is stable.
---

# Kaboomlet

Role:
- Bowbert project enemy.

Behavior:
- Bomb enemy: chase the player, enter armed countdown when close, keep chasing during the countdown, then self-detonate.
- Death also detonates it. The explosion damages the player and enemies, so the player can use Kaboomlet as an AoE tool.
- Explosion radius and warning ring follow the original video reference frames.

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Do not invent unconfirmed props, limbs, pose changes, or material changes.

Source:
- `source/reference-01.png`
- `source/video-approach-contact-reference.jpg`
- `source/video-explosion-aoe-reference.jpg`
- `source/video-explosion-radius-reference.jpg`

Decomposition:
- base.png: generated fixed enemy body.
- attachments/: only independently positioned art such as eyes, weapon, shell, hat, or props.
- projectiles/: reusable projectile cores, no baked trails.
- vfx/: explosion warning ring, blast flash, debris, sparks, and red/orange particle burst are runtime effects.
- runtime: gaze, armed flashing, chase wobble, countdown pulse, death detonation, AoE damage, squash/stretch, hit/death timing.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`

Mode: image-to-image, high reference fidelity.

Layer contract:
- Fixed bomb body base with stable outline, fuse, star, eye whites, and face mark.
- Runtime owns black gaze fills, armed flashing, fuse spark, countdown pulse, warning radius, explosion rings, sparks, debris, and damage timing.

Generation prompt:
> Transparent-background Bowbert project top-down doodle enemy sprite matching the locked reference. Preserve exact silhouette, posture, thick black outline, simple color blocking, focal face/eye features, and scale relationship. Create a clean reusable base layer for Bowbert runtime squash/stretch, bob, tilt, hit, and expression overlays.

Boundary notes:
> Single centered bomb enemy sprite, transparent background, clean edges, Bowbert doodle style, enough crop padding for fuse/star protrusions and runtime explosion overlays.

Acceptance checks:
- Silhouette and palette match the locked reference.
- Runtime-changing parts are separated when practical.
- Transparent PNG, tight crop with enough room for protrusions.

### projectiles/<name>.png

Inputs:
- TODO

Mode: image-to-image when a projectile/effect reference exists.

Layer contract:
- Runtime explosion VFX is procedural first.
- If an effect core is generated later, it must be a reusable blast/spark core only.

Generation prompt:
> TODO

Boundary notes:
> Transparent background, clean edges, centered reusable effect core, enough padding for runtime scaling and fade.

Acceptance checks:
- TODO

Runtime rig notes:
- use runtime armed flashing, fuse spark, warning ring, and explosion anticipation instead of sprite sheets.
- motion fields: idleBob, idleSquash, chaseWobble, armedPulse, explosionAnticipation, hitScaleX, hitScaleY.
- behavior fields: armDistance, armedCountdownMs, keepChasingWhileArmed, deathExplosion, explosionRadius, enemyDamage, playerDamage.
- vfx fields: warning ring, explosion rings, sparks, debris color palette, blast radius, countdown flash.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
