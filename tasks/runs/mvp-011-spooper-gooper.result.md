---
id: mvp-011-spooper-gooper
status: completed
branch: master
worktree: /home/simpx/bowbert
---

# Summary

- Created `assets/characters/spooper-gooper/` with copied locked reference, Bowbert project brief, runtime rig values, and tuning page.
- Added `src/characters/spooperGooperRig.ts`.
- Added `SpooperGooperSystem` with hidden, appearing, hovering, attacking, disappearing, repositioning, visible-only vulnerability, arrow-hit, death, and encounter-cleared phases.
- Added `SpooperGooperRenderer` with procedural ghost body, runtime eyes, alpha/hover animation, appear/vanish particles, hit particles, and death particles.
- Kept attack damage/projectile choice as a follow-up integration decision.

# Changed Files

- `assets/characters/spooper-gooper/**`
- `src/characters/spooperGooperRig.ts`
- `src/sim/enemies/SpooperGooperSystem.ts`
- `src/sim/enemies/index.ts`
- `src/render/enemies/SpooperGooperRenderer.ts`
- `src/render/enemies/index.ts`
- `tasks/runs/mvp-011-spooper-gooper.result.md`

# Checks

- `npm run build`: passed.
- `python /home/simpx/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/spooper-gooper`: passed.

# Follow-up Tasks

- Generate and accept clean `base.png` from `source/reference-01.png`.
- Decide whether Spooper Gooper should deal contact damage or fire a projectile before room integration.

# Blocked / Needs Decision

- None.
