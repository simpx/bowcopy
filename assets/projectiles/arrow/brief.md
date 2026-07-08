---
status: playtested
kind: projectile
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
openItems:
  - Runtime arrow remains procedural; no bitmap projectile base is required yet.
  - Impact behavior is intentionally quiet against room boundaries per current audio policy.
---

# Arrow Projectile

Role: Bowbert's player-fired arrow projectile.

Visual target:
- Match the prototype arrow crop and current branch-bow visual language.
- Keep the arrow as a small readable runtime shape with warm shaft, yellow head, pale highlight, and light fletching.
- Runtime owns trail and impact rings.

Decomposition:
- projectile body: procedural rectangles and triangles in `ArrowProjectileRenderer`.
- trail: runtime graphics line segments.
- impact: runtime boundary ring and dot.
- audio: release sound comes from the shared combat SFX layer.

Prompt packets:
- Target: runtime arrow visual
  - Inputs: `source/reference-01.png`
  - Layer contract: projectile body only; trail and impact are runtime VFX.
  - Generation prompt: slim hand-drawn arrow projectile for a doodle mobile roguelike, warm wooden shaft, yellow arrowhead, light fletching, bold readable silhouette, transparent runtime-friendly shape.
  - Boundary notes: do not bake trail, hit rings, room impact, player, bow, or enemy body into the projectile.
  - Acceptance checks: readable at gameplay scale, points along +X in local renderer space, trail and impact preview correctly.

Runtime evidence:
- `src/render/projectiles/ArrowProjectileRenderer.ts`: authoritative body, trail, and impact renderer.
- `src/sim/projectiles/ArrowProjectileSystem.ts`: authoritative TTL, trail length, and bounds behavior.
- `src/sim/player/BowbertPlayer.ts`: authoritative fire cadence, speed, damage, and muzzle distance.
