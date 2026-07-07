---
id: mvp-010-kaboomlet-enemy
status: completed
branch: master
worktree: /home/simpx/bowbert
---

# Summary

- Created `assets/characters/kaboomlet/` with copied locked reference, Bowbert project brief, runtime rig values, and tuning page.
- Added `src/characters/kaboomletRig.ts`.
- Added `KaboomletSystem` with spawn, chase, armed countdown, explosion event, arrow-hit, death, and encounter-cleared phases.
- Added `KaboomletRenderer` with procedural bomb body, runtime eyes, fuse spark, armed flashing, explosion rings, sparks, hit particles, and death particles.
- Kept player-damage wiring out of scope until encounter integration.

# Changed Files

- `assets/characters/kaboomlet/**`
- `src/characters/kaboomletRig.ts`
- `src/sim/enemies/KaboomletSystem.ts`
- `src/sim/enemies/index.ts`
- `src/render/enemies/KaboomletRenderer.ts`
- `src/render/enemies/index.ts`
- `tasks/runs/mvp-010-kaboomlet-enemy.result.md`

# Checks

- `npm run build`: passed.
- `python /home/simpx/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/kaboomlet`: passed.

# Follow-up Tasks

- Generate and accept clean `base.png` from `source/reference-01.png`.
- Wire explosion damage and SFX when Kaboomlet is added to room encounters.

# Blocked / Needs Decision

- None.
