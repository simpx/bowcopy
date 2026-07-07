---
id: mvp-009-slime-enemy
title: Jumping Slime enemy
status: completed
owner: manager
branch: task/mvp-009-slime-enemy
worktree: /home/simpx/bowbert-workers/mvp-009-slime-enemy
allowed:
  - assets/characters/slime/**
  - assets/enemies/slime/**
  - src/characters/slimeRig.ts
  - src/characters/rigSchema.ts
  - src/render/enemies/SlimeRenderer.ts
  - src/render/enemies/index.ts
  - src/render/characters/layeredCharacterConfig.ts
  - src/sim/enemies/SlimeSystem.ts
  - src/sim/enemies/index.ts
  - refs/generated/slime-*
  - tasks/runs/mvp-009-slime-enemy.result.md
avoid:
  - src/game/scenes/CombatRoomScene.ts
  - src/sim/rooms/**
  - src/audio/**
checks:
  - npm run build
  - python /home/simpx/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/slime
---

# Intent

Create the Slime enemy asset folder and first-pass jumping behavior prototype. Use locked references `refs/asset-crops/enemies/slime_large_reference.png` and `refs/asset-crops/enemies/slime_gameplay_reference.png`.

# Done When

- `assets/characters/slime/` is self-contained with references, `brief.md`, `rig.json`, `tuning.html`, accepted or planned `base.png`, and comparison if art is accepted.
- The rig describes Bowbert runtime slime motion: idle wobble, jump squash, airborne stretch, landing squash, hit/death deformation, and optional split notes.
- `SlimeSystem.ts` models a periodic jump loop with readable phases and collision/hit handling, or a well-scoped prototype if full combat integration is blocked.
- `SlimeRenderer.ts` previews the jump/squash motion using runtime deformation rather than sprite sheets.
- The listed checks pass or failures are explained.

# Notes

Do not implement splitting unless the base jump loop is stable. Record split behavior as follow-up if needed.
