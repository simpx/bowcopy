---
status: playtested
kind: projectile
projectContext: bowbert
lockedReference: source/dart-goober-reference.png
sourceReferences:
  - source/dart-goober-reference.png
openItems:
  - Runtime enemy dart remains procedural; no bitmap projectile base is required yet.
  - If a future video crop isolates the dart projectile, add it under source/ and compare against this runtime shape.
---

# Enemy Dart Projectile

Role: goober-family enemy-fired dart projectile used by Dart Goober and Dart Tri Goober.

Note: Spooper Gooper uses the separate `../black-ink/` projectile visual style.

Visual target:
- Match the Dart Goober green/yellow/red attack language.
- Keep the dart compact and readable at gameplay scale.
- Runtime owns green trail and wall/player impact rings.

Decomposition:
- projectile body: procedural rectangles and triangles in `EnemyDartProjectileRenderer`.
- trail: runtime green line segments.
- impact: runtime wall/player rings with distinct colors.
- audio: hit feedback comes from the shared combat SFX layer.

Prompt packets:
- Target: runtime enemy dart visual
  - Inputs: `source/dart-goober-reference.png`
  - Layer contract: projectile body only; trail, wall impact, and player impact are runtime VFX.
  - Generation prompt: compact enemy dart for a doodle mobile roguelike, dark green shaft, pale green highlight, small red tip, green fletching, bold readable silhouette, transparent runtime-friendly shape.
  - Boundary notes: do not bake trail, hit rings, Dart Goober body, player, or room background into the projectile.
  - Acceptance checks: readable at gameplay scale, points along +X in local renderer space, wall/player impacts preview correctly.

Runtime evidence:
- `src/render/projectiles/EnemyDartProjectileRenderer.ts`: authoritative body, trail, and impact renderer.
- `src/sim/projectiles/EnemyDartProjectileSystem.ts`: authoritative TTL, hit radius, trail length, and bounds behavior.
- `src/sim/enemies/DartGooberSystem.ts`: authoritative Dart Goober fire speed, damage, and muzzle distance.
