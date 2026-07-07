---
id: mvp-011-spooper-gooper
title: Spooper Gooper ghost enemy
status: active
owner: worker-mvp-011
branch: task/mvp-011-spooper-gooper
worktree: /home/simpx/bowbert-workers/mvp-011-spooper-gooper
allowed:
  - assets/characters/spooper-gooper/**
  - assets/enemies/spooper_gooper/**
  - src/characters/spooperGooperRig.ts
  - src/characters/rigSchema.ts
  - src/render/enemies/SpooperGooperRenderer.ts
  - src/render/enemies/index.ts
  - src/render/characters/layeredCharacterConfig.ts
  - src/sim/enemies/SpooperGooperSystem.ts
  - src/sim/enemies/index.ts
  - refs/generated/spooper-gooper-*
  - tasks/runs/mvp-011-spooper-gooper.result.md
avoid:
  - src/game/scenes/CombatRoomScene.ts
  - src/sim/rooms/**
  - src/audio/**
checks:
  - npm run build
  - python /home/simpx/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/spooper-gooper
---

# Intent

Create the Spooper Gooper ghost enemy asset folder and first-pass appear/disappear behavior prototype. Use locked reference `refs/asset-crops/enemies/spooper_gooper_reference.png`.

# Done When

- `assets/characters/spooper-gooper/` is self-contained with references, `brief.md`, `rig.json`, `tuning.html`, accepted or planned `base.png`, and comparison if art is accepted.
- The rig captures ghost opacity, hover bob, appear/disappear timing, visible-only vulnerability, attack anticipation, hit/death, and runtime eye/expression needs.
- `SpooperGooperSystem.ts` models hidden, appearing, attacking, disappearing, repositioning, and vulnerable phases, or a well-scoped prototype if full integration is blocked.
- `SpooperGooperRenderer.ts` previews alpha/hover/appear states and any simple projectile/attack cues.
- The listed checks pass or failures are explained.

# Notes

This is the most complex task. Keep implementation local; do not change global room encounter selection unless explicitly needed for a local debug path.
