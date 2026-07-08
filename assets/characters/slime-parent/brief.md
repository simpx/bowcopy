---
status: playtested
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/reference-02.jpg
openItems:
  - Tune parent jump timing, hitbox, split spawn count, and room density during gameplay balancing.
  - Select dedicated parent jump/split audio when the enemy set moves beyond MVP.
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

Generated candidates:
- `base.png`: promoted from user-approved `exports/base-v3-candidate.png` as the current runtime base.
- `base-source.png`: promoted from `exports/base-v3-green.png` as the retained chroma source.
- `comparison.png`: side-by-side reference/accepted-base review sheet.
- `exports/base-v3-candidate.png`: user-approved current parent candidate; more doodle-like, with blank side eye whites for runtime gaze.
- `exports/base-v3-green.png`: chroma-key source for the approved v3 candidate.
- `exports/base-v4-candidate.png`: extra process candidate, not selected because v3 was accepted.
- `exports/base-v4-green.png`: chroma-key source for the unselected v4 candidate.
- `exports/base-v2-candidate.png`: regenerated Bowbert Studio parent base candidate with blank side eye whites for runtime gaze.
- `exports/base-v2-green.png`: chroma-key source for the regenerated candidate.
- `exports/base-v1-candidate.png`: rejected first pass; side eyes contained baked black pupil fill.

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

Runtime integration:
- `src/characters/slimeParentRig.ts`: parent PNG, gaze, shadow, hitbox, and motion constants.
- `src/sim/enemies/SlimeSystem.ts`: parent role, higher HP/radius, slower jump loop, and death split into child slime instances.
- `src/render/enemies/SlimeRenderer.ts`: shared slime renderer now selects parent or child rig by runtime role.
- `src/game/scenes/CombatRoomScene.ts`: `slime-parent` encounter kind, stone-room routing, and debug preview route.

Playtest evidence:
- `playtest/runtime-encounter.png`: parent slime in a mobile viewport debug encounter.
- `playtest/runtime-split.png`: forced debug split showing child slime spawn after parent death.
