---
status: reference-locked
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/reference-02.jpg
openItems:
  - Generate or accept `base.png`.
  - Generate side-by-side `comparison.png` after base art is accepted.
  - Tune parent eye positions, jump timing, hitbox, and split spawn count after base art exists.
  - Integrate parent death splitting into the slime runtime system.
---

# Slime Parent

Role:
- Parent slime enemy.

Behavior:
- Large hopper enemy: idle wobble, pre-jump squash, airborne stretch, landing squash, then short recovery.
- On death, split into several child slimes using the existing `slime` child asset.
- Parent should be larger, slower, and tougher than child slimes.

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Use only confirmed props, limbs, pose language, and material language from the locked reference or user brief.
- Preserve the original video's bright cyan body, triangular upper eye/antenna shapes, side round eye sockets, tiny legs, and white burst/card silhouette as reference context.

Source:
- `source/reference-01.png`
- `source/reference-02.jpg`

Decomposition:
- base.png: fixed parent slime body with stable eye whites/sockets.
- attachments/: only independently positioned art such as eyes, weapon, shell, hat, or props.
- projectiles/: none for MVP.
- vfx/: split pop, landing dust, and death split particles are runtime effects.
- runtime: gaze, squash/stretch, jump arc, landing squash, hit/death timing, and child slime spawn burst.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`
- `source/reference-02.jpg`

Mode: image-to-image, high reference fidelity.

Layer contract:
- Fixed parent slime body base with stable eye whites/sockets.
- Runtime owns black gaze/pupils, jump squash/stretch, landing squash, split burst, spawned child slimes, particles, and hit/death timing.
- The existing `slime` folder is the child slime; do not bake child slimes into this base.

Generation prompt:
> Use the image just shown as the visual reference. Create a transparent-background Bowbert parent slime enemy sprite matching the locked reference. Preserve the bright cyan body, triangular upper eye/antenna shapes, side round eye sockets, tiny legs, thick black doodle outline, simple color blocking, and larger parent scale relationship. Create a clean reusable base layer for runtime squash/stretch, bob, jump, hit, death split, and gaze overlays.

Boundary notes:
> Single centered parent slime sprite, transparent background, clean edges, Bowbert doodle style, enough crop padding for antenna/eye protrusions and runtime squash/stretch.

Acceptance checks:
- Silhouette and palette match the locked reference.
- Runtime-changing black gaze/fills are reserved for runtime.
- Child slimes are not baked into the parent body.
- Transparent PNG, tight crop with enough room for protrusions.

### projectiles/<name>.png

Inputs:
- none for MVP

Mode: no bitmap projectile planned.

Layer contract:
- Parent slime does not own a projectile in MVP.
- Runtime owns jump arc, split burst, landing particles, and spawned child slime instances.

Generation prompt:
> No projectile generation needed for MVP.

Boundary notes:
> Keep split, dust, and landing feedback procedural unless a later effect core is requested.

Acceptance checks:
- No projectile file is required before parent slime runtime integration.

Runtime rig notes:
- use hopper/slime precedent with procedural motion fields instead of frame animation.
- motion fields: idleWobble, idleBob, preJumpSquash, airStretch, landingSquash, hitScaleX, hitScaleY, jumpHeight, jumpDurationMs, recoverMs.
- behavior fields: splitOnDeath, childId, childCount, childSpawnRadius, parentHp, contactDamage.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
