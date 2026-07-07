---
id: mvp-009-slime-enemy
status: completed
branch: master
worktree: /home/simpx/bowbert
---

# Summary

- Created `assets/characters/slime/` with copied locked references, Bowbert project brief, runtime rig values, and tuning page.
- Added `src/characters/slimeRig.ts`.
- Added `SlimeSystem` with spawn, pre-jump squash, jump, landing, recovery, arrow-hit, death, and encounter-cleared phases.
- Added `SlimeRenderer` with procedural slime body, runtime eyes, squash/stretch, air shadow, landing particles, hit particles, and death particles.
- Deferred splitting behavior.

# Changed Files

- `assets/characters/slime/**`
- `src/characters/slimeRig.ts`
- `src/sim/enemies/SlimeSystem.ts`
- `src/sim/enemies/index.ts`
- `src/render/enemies/SlimeRenderer.ts`
- `src/render/enemies/index.ts`
- `tasks/runs/mvp-009-slime-enemy.result.md`

# Checks

- `npm run build`: passed.
- `python /home/simpx/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/slime`: passed.

# Follow-up Tasks

- Generate and accept clean `base.png` from the two locked slime references.
- Decide whether slime splitting belongs before or after encounter integration.

# Blocked / Needs Decision

- None.
