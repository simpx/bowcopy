---
status: playtested
kind: effect
projectContext: bowbert
lockedReference: source/reference-aoe.jpg
sourceReferences:
  - source/reference-aoe.jpg
  - source/reference-radius.jpg
openItems:
  - Tune warning ring timing, blast radius, and debris density after combat balance pass.
  - Select final explosion/fuse sounds after timing is stable.
---

# Kaboomlet Explosion Effect

Role: Kaboomlet's armed warning radius, detonation flash, and debris burst.

Visual target:
- Match the reference's simple red warning radius and chunky white/yellow explosion cloud.
- Keep orange, yellow, and black debris as runtime particles.
- Keep the effect separate from `assets/characters/kaboomlet/base.png`.

Decomposition:
- warning radius: red dashed runtime circle.
- blast cloud: overlapping white/yellow/orange procedural cloud.
- explosion ring: yellow expanding runtime ring.
- debris burst: orange/yellow/black particles emitted from the center.

Layer contract:
- No bitmap explosion core is required for MVP.
- Runtime owns timing, scale, fade, camera shake, damage radius, and particles.
- Character base owns only the bomb body.

Runtime evidence:
- `src/render/enemies/KaboomletRenderer.ts`: authoritative ring and debris particle renderer.
- `src/sim/enemies/KaboomletSystem.ts`: authoritative countdown, damage radius, and explosion duration.
- `src/game/scenes/CombatRoomScene.ts`: handles explosion damage, SFX, feedback, and debug encounter preview.
- `playtest/kaboomlet-runtime-explosion.png`: browser screenshot proof that the effect appears in the Kaboomlet encounter.

Prompt packet:
- Target: optional bitmap blast core
  - Inputs: `source/reference-aoe.jpg`, `source/reference-radius.jpg`
  - Layer contract: reusable centered blast core only, if runtime procedural cloud is later replaced; warning ring and debris remain runtime.
  - Generation prompt: chunky white and yellow explosion cloud for a top-down doodle mobile roguelike, bold soft outline, simple color blocks, readable at mobile scale, transparent background, centered reusable blast core.
  - Boundary notes: do not include Kaboomlet body, enemies, room floor, damage radius ring, UI, or debris trail.
  - Acceptance checks: matches reference color mass, readable at gameplay scale, layers cleanly over runtime radius and particles.
