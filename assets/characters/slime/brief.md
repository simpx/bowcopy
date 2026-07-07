---
status: rigged
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/reference-02.png
  - source/video-child-gameplay-reference.jpg
  - source/video-parent-swarm-reference.jpg
openItems:
  - Confirm whether this folder should be renamed to `slime-child` after runtime integration.
  - Integrate as the child spawned by `slime-parent` death.
---

# Slime

Role:
- Child slime enemy spawned by `slime-parent`.

Behavior:
- Small hopper enemy: idle wobble, pre-jump squash, airborne stretch, landing squash, then short recovery.
- Low health, faster and smaller than the parent. The parent splits into several of these on death.

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Do not invent unconfirmed props, limbs, pose changes, or material changes.

Source:
- `source/reference-01.png`
- `source/reference-02.png`
- `source/video-child-gameplay-reference.jpg`
- `source/video-parent-swarm-reference.jpg`

Decomposition:
- base.png: generated fixed child slime body.
- attachments/: only independently positioned art such as eyes, weapon, shell, hat, or props.
- projectiles/: reusable projectile cores, no baked trails.
- vfx/: runtime trail/particle notes if separate assets are needed.
- runtime: child gaze, squash/stretch, jump arc, landing squash, hit/death timing, tiny landing particles.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`
- `source/reference-02.png`

Mode: image-to-image, high reference fidelity.

Layer contract:
- Fixed child slime body base with eye whites/sockets and small mobile-readable silhouette.
- Runtime owns black gaze, jump squash/stretch, landing squash, hit deformation, and spawn/death particles.

Generation prompt:
> Transparent-background Bowbert project top-down doodle enemy sprite matching the locked reference. Preserve exact silhouette, posture, thick black outline, simple color blocking, focal face/eye features, and scale relationship. Create a clean reusable base layer for Bowbert runtime squash/stretch, bob, tilt, hit, and expression overlays.

Boundary notes:
> Single centered child slime sprite, transparent background, clean edges, Bowbert doodle style, enough crop padding for squash/stretch.

Acceptance checks:
- Silhouette and palette match the locked reference.
- Runtime-changing parts are separated when practical.
- Transparent PNG, tight crop with enough room for protrusions.

### projectiles/<name>.png

Inputs:
- TODO

Mode: image-to-image when a projectile/effect reference exists.

Layer contract:
- No projectile asset is currently needed for child slime.
- Runtime owns jump motion, landing particles, and hit/death particles.

Generation prompt:
> TODO

Boundary notes:
> Transparent background, clean edges, centered reusable asset only if a later effect core is requested.

Acceptance checks:
- TODO

Runtime rig notes:
- use procedural hopper motion instead of frame animation.
- motion fields: idleWobble, preJumpSquash, airStretch, landingSquash, jumpHeight, jumpDurationMs, recoverMs.
- behavior fields: spawnedBy, hp, speed profile, contactDamage.
- runtime preview should show idle, pre-jump, airborne, landing, hit, and death deformation.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
