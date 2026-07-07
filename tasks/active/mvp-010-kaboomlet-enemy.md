---
id: mvp-010-kaboomlet-enemy
title: Kaboomlet bomb enemy
status: active
owner: worker-mvp-010
branch: task/mvp-010-kaboomlet-enemy
worktree: /home/simpx/bowbert-workers/mvp-010-kaboomlet-enemy
allowed:
  - assets/characters/kaboomlet/**
  - assets/enemies/kaboomlet/**
  - src/characters/kaboomletRig.ts
  - src/characters/rigSchema.ts
  - src/render/enemies/KaboomletRenderer.ts
  - src/render/enemies/index.ts
  - src/render/characters/layeredCharacterConfig.ts
  - src/sim/enemies/KaboomletSystem.ts
  - src/sim/enemies/index.ts
  - refs/generated/kaboomlet-*
  - tasks/runs/mvp-010-kaboomlet-enemy.result.md
avoid:
  - src/game/scenes/CombatRoomScene.ts
  - src/sim/rooms/**
  - src/audio/**
checks:
  - npm run build
  - python /home/simpx/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/kaboomlet
---

# Intent

Create the Kaboomlet bomb enemy asset folder and first-pass armed/explosion prototype. Use locked reference `refs/asset-crops/enemies/kaboomlet_reference.png`.

# Done When

- `assets/characters/kaboomlet/` is self-contained with references, `brief.md`, `rig.json`, `tuning.html`, accepted or planned `base.png`, and comparison if art is accepted.
- The rig captures idle bounce, chase wobble, armed flashing, explosion anticipation, hit/death, shadow, hitbox, and VFX parameters.
- `KaboomletSystem.ts` models chase, armed countdown, explosion event, arrow-hit interaction, and range data, or a well-scoped prototype if full integration is blocked.
- `KaboomletRenderer.ts` previews armed flashing and explosion anticipation with runtime VFX.
- The listed checks pass or failures are explained.

# Notes

Keep explosion damage integration local to the prototype. Do not rework player health, room spawn selection, or global combat orchestration in this task.
