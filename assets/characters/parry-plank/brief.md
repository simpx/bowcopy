---
status: brief
kind: enemy
projectContext: bowbert
lockedReference: null
sourceReferences: []
openItems:
  - Concept art candidates needed in source/; lock one reference to advance.
  - Decide reflected-arrow visual (v1 reuses the enemy dart projectile; a dedicated bounced-arrow look is a later polish).
  - Tune parry window / recover window / reflect damage after integration.
---

# Parry Plank

Role:
- Anti-ranged zone-denial enemy: a living wooden plank that punishes careless shooting by bouncing arrows straight back.

Behavior (new `parry` pattern):
- drift: slow sideways shuffle, no threat.
- brace (telegraph ~0.4s): plants feet, squashes down, edge begins to glow — the "stop shooting now" beat.
- parry (~1.2s): turns broadside with a shiver; any arrow that hits is consumed and fired back along its incoming path as an enemy projectile that damages Bowbert. The plank takes no damage while parrying.
- recover (~1.5s): stance drops, fully vulnerable — the punish window.

Integration notes (kit contract fits as-is):
- `EnemyKit.update()` already receives the arrow list and returns consumed arrow ids — parry consumes arrows there.
- Reflection reuses `services.enemyDarts` (EnemyDartProjectileSystem) with reversed velocity; no new projectile system.
- New sim system `src/sim/enemies` parry pattern; kit `src/game/enemies/parryPlankKit.ts`; encounter kind `parry-plank`.

Visual target (pre-reference direction; final target set after lock):
- A weathered wooden plank/board standing upright on stubby legs, thick doodle outline, wood grain and a knot or two; family resemblance to the goober wood palette.
- Readable stance change: broadside-on when parrying (wider silhouette), edge glow.

Decomposition:
- base.png: plank body with baked blank white eye sockets (round pair), transparent background.
- Runtime eyes: standard template (angry during parry, hit on damage, default otherwise); sockets fitted by tools/fit_eyes.py — zero hand eye work expected.
- Runtime motion: walk shuffle wobble, brace squash, parry broadside stretch + shiver, hit wobble. No sprite sheets.
- Runtime VFX: edge glow (chargeGlow pattern from goober/shroom kits), reflect impact burst (particleBurst styles), recover dust.

Reuse plan (checked assets/index.json):
- Projectile: enemy dart system + renderer (reflected arrows).
- Particles: HOUSE_BURST_STYLE via particleBurst.
- Eyes: standard template, no new expressions.

Image generation prompt packets:

### concept candidates (text-to-image, pre-lock)

Generation prompt:
> Transparent-background top-down doodle game sprite: a grumpy living wooden plank enemy standing upright on two stubby dark legs. Weathered board with visible grain and one knot, thick black outline, simple flat color blocking in warm browns, two large blank white eye sockets baked into the upper board, no pupils. Bowbert project doodle style, mobile-readable silhouette, single centered character, clean edges.

Acceptance checks:
- Solid pure-white empty eye sockets, closed outlines, not touching other white regions (fit_eyes must be able to segment them).
- No baked pupils, no baked glow, no motion smears; upright stable pose.
- Thick outline and palette consistent with the goober wood family.
