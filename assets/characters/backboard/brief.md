---
status: playtested
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/candidate-02.png
openItems:
  - 2026-07-10 用户完整通关验证(标题→7房→boss→结算),手感确认无问题。
  - INTEGRATED (kit + workbench slot + /?encounter=backboard). Review aids: cell click fires a real arrow; 强制招架 button. Status stays rigged pending human workbench review.
  - Decide reflected-arrow visual (v1 reuses the enemy dart projectile; a dedicated bounced-arrow look is a later polish).
  - Tune parry window / recover window / reflect damage after integration.
---

# Backboard

Role:
- Anti-ranged zone-denial enemy: a living wooden plank that punishes careless shooting by bouncing arrows straight back.

Behavior (new `parry` pattern) — a fixed, learnable rhythm; state reads come from eyes + effects only (project principle, 2026-07-08):

| state | duration | deformation | eyes | VFX |
| --- | --- | --- | --- | --- |
| drift | ~2–3s | slow shuffle wobble | default | none |
| brace | ~0.4s | plant + squash down | aim (slit, locked on) | edge glow ramps up |
| parry | ~1.2s | broadside stretch + shiver, faces Bowbert | angry (slanted lids) | edge glow full; sparks on each reflected arrow |
| recover | ~1.5s | sag, slow rebound | dizzy | glow dies, dust puff |

- Arrows hitting during parry are consumed and fired back along their incoming path as enemy projectiles; the plank takes no damage while parrying. Arrows during drift/brace/recover damage it normally.

Integration notes (kit contract fits as-is):
- `EnemyKit.update()` already receives the arrow list and returns consumed arrow ids — parry consumes arrows there.
- Reflection reuses `services.enemyDarts` (EnemyDartProjectileSystem) with reversed velocity; no new projectile system.
- New sim system `src/sim/enemies` parry pattern; kit `src/game/enemies/backboardKit.ts`; encounter kind `backboard`.

Visual target (pre-reference direction; final target set after lock):
- A weathered wooden plank/board standing upright on stubby legs, thick doodle outline, wood grain and a knot or two; family resemblance to the goober wood palette.
- Neutral, innocent resting face (round sockets) — the parry 'face change' to angry lids is the strongest state signal, so the base must NOT bake anger in.

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
