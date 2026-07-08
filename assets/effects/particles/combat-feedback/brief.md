---
status: playtested
kind: effect
projectContext: bowbert
sourceReferences: []
openItems:
  - Tune text labels and particle density after mobile readability review.
---

# Combat Feedback Particles

Role: shared combat feedback for hits, enemy death, enemy spawn, dodge, player damage, wall impacts, spore breaks, and room clear.

Visual target:
- Keep feedback readable at mobile scale without becoming louder than characters and projectiles.
- Use simple pulse rings, floating labels, and short-lived colored particles.
- Keep the style consistent with the doodle runtime: chunky, flat colors, no bitmap sprite sheets.

Decomposition:
- pulse rings: runtime circles and room-clear rectangle flash.
- floating labels: runtime text with outline and lift/fade.
- particles: runtime colored dots with gravity and damping.
- room clear: center pulse, large label, border flash, and edge particles.

Layer contract:
- No bitmap effect core is required.
- Runtime owns positions, labels, timing, color, particle count, and fade.
- Character/projectile folders should not duplicate these shared feedback effects.

Runtime evidence:
- `src/render/feedback/CombatFeedbackRenderer.ts`: authoritative pulse, label, particle, and room-clear renderer.
- `src/game/scenes/CombatRoomScene.ts`: calls shared feedback for combat events.
- `playtest/combat-feedback-runtime.png`: browser screenshot proof that the effect appears in the game scene through debug URL `?feedback=combat`.

Prompt packet:
- Target: optional bitmap sparkle core
  - Inputs: none
  - Layer contract: reusable small sparkle/dot core only, if runtime dots are later replaced by bitmap particles.
  - Generation prompt: tiny flat doodle sparkle and dot particles for a top-down mobile roguelike, warm yellow, soft green, cyan, and coral variants, bold readable shape, transparent background.
  - Boundary notes: do not include characters, UI, labels, room floor, or projectile trails.
  - Acceptance checks: readable at small scale, can be recolored or swapped per feedback tone, layers cleanly with runtime labels.
