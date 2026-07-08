---
status: playtested
kind: projectile
projectContext: bowbert
lockedReference: source/reference-01.jpg
sourceReferences:
  - source/reference-01.jpg
  - source/reference-02.jpg
openItems:
  - Tune black ink opacity, cloud size, and trail density against real gameplay.
---

# Black Ink Projectile

Role: Spooper Gooper's black ink/smoke projectile.

Visual target:
- Match the video references: a lumpy black ink blob moving with scattered black specks behind it.
- On impact or expiry, read as a dark smoke/ink cloud rather than a green dart hit.
- Keep the core procedural so it can stay sharp at mobile scale.

Decomposition:
- projectile body: runtime blob made from overlapping dark circles/ellipses.
- trail: runtime speck trail, only while moving.
- impact: runtime black cloud with fading white specks.
- audio: player hit feedback comes from the shared combat SFX layer.

Prompt packets:
- Target: runtime black ink projectile visual
  - Inputs: `source/reference-01.jpg`, `source/reference-02.jpg`
  - Layer contract: projectile core, trail, and impact are procedural runtime VFX; no bitmap core is required yet.
  - Generation prompt: compact lumpy black ink projectile for a top-down doodle mobile roguelike, dark smoke body, scattered black speck trail, bold readable silhouette, soft cloud impact, clean runtime-friendly shape.
  - Boundary notes: do not bake Spooper Gooper body, player, room background, or unrelated enemy bullets into the projectile asset.
  - Acceptance checks: readable at gameplay scale, clearly black/smoke-like, distinct from green goober dart, impact cloud previews correctly.

Runtime evidence:
- `src/sim/projectiles/EnemyDartProjectileSystem.ts`: shared projectile movement/collision system with `style: "black-ink"` support.
- `src/render/projectiles/EnemyDartProjectileRenderer.ts`: authoritative blob, speck trail, and smoke impact renderer.
- `src/game/scenes/CombatRoomScene.ts`: Spooper Gooper fires this style when it attacks.
- `playtest/spooper-runtime-projectile.png`: browser screenshot proof that the black ink projectile appears in the Spooper encounter.
