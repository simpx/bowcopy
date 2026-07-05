---
id: mvp-005-player-bow-combat
title: Bowbert movement, bow, arrows, dodge
status: active
owner: worker-mvp-005
branch: task/mvp-005-player-bow-combat
worktree: /home/simpx/bowbert-workers/mvp-005-player-bow-combat
allowed:
  - src/sim/player/**
  - src/sim/projectiles/**
  - src/render/player/**
  - src/render/projectiles/**
  - src/game/**
  - src/assets/**
  - assets/prototype-video-crops/player/**
  - assets/prototype-video-crops/weapons/**
  - tasks/runs/mvp-005-player-bow-combat.result.md
avoid:
  - src/input/**
  - src/sim/enemies/**
  - src/render/enemies/**
  - refs/**
checks:
  - npm run build
---

# Intent

Implement Bowbert as a playable character with movement, right-stick hold-to-fire arrows, automatic draw/release pose, dodge, and required procedural animation.

# Done When

- Bowbert moves from input state and keeps aim/facing direction.
- Holding fire emits arrows at the MVP cadence.
- Each arrow has direction, speed, damage, and a visible trail.
- Bow has relaxed/draw/release visual poses without manual charge.
- Dodge uses movement direction, falls back to facing direction, has cooldown, brief invulnerability, lean/stretch, and ghost afterimages.
- Bowbert has sine-wave idle/walk squash, eyes tracking aim, firing recoil, hit flash/squash hooks.

# Notes

Depends on `mvp-001-project-scaffold` and should integrate with `mvp-003-mobile-input` after merge. Do not implement enemy AI here.
