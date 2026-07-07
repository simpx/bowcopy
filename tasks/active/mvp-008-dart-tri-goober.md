---
id: mvp-008-dart-tri-goober
title: Dart Tri Goober variant
status: active
owner: worker-mvp-008
branch: task/mvp-008-dart-tri-goober
worktree: /home/simpx/bowbert-workers/mvp-008-dart-tri-goober
allowed:
  - assets/characters/dart-tri-goober/**
  - assets/enemies/dart_tri_goober/**
  - src/characters/dartTriGooberRig.ts
  - src/characters/rigSchema.ts
  - src/render/enemies/DartTriGooberRenderer.ts
  - src/render/enemies/DartGooberRenderer.ts
  - src/render/enemies/index.ts
  - src/render/characters/layeredCharacterConfig.ts
  - src/sim/enemies/DartGooberSystem.ts
  - src/sim/enemies/index.ts
  - refs/generated/dart-tri-goober-*
  - tasks/runs/mvp-008-dart-tri-goober.result.md
avoid:
  - src/game/scenes/CombatRoomScene.ts
  - src/sim/rooms/**
  - src/audio/**
checks:
  - npm run build
  - python /home/simpx/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/dart-tri-goober
---

# Intent

Create the Dart Tri Goober as the first low-risk enemy variant. Use the locked video crop at `refs/asset-crops/enemies/dart_tri_goober_reference.png`, the Bowbert-specific `$generate2dcharacter` skill, and the existing Dart Goober runtime as the closest precedent.

# Done When

- `assets/characters/dart-tri-goober/` is self-contained with `brief.md`, `rig.json`, `tuning.html`, references, accepted or planned `base.png`, and comparison if art is accepted.
- The asset/rig captures triangular body shape, embedded angry eyes, runtime cut-ellipse gaze, and q-elastic goober motion.
- A prototype implementation exists as either a `DartGooberSystem` variant or isolated renderer/rig files with clear integration notes.
- Shared scene spawning is not wired unless it is trivial and conflict-free.
- The listed checks pass or failures are explained.

# Notes

Prefer extending the existing Dart Goober behavior rather than creating a fully separate AI system. Keep muzzle/projectile/charge visuals runtime-driven.
