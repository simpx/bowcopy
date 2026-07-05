---
id: mvp-006-dart-goober-ai
title: Dart Goober spawn, AI, darts, death
status: done
owner: worker-mvp-006
branch: task/mvp-006-dart-goober-ai
worktree: /home/simpx/bowbert-workers/mvp-006-dart-goober-ai
allowed:
  - src/sim/enemies/**
  - src/render/enemies/**
  - src/sim/projectiles/**
  - src/render/projectiles/**
  - src/game/**
  - src/assets/**
  - assets/prototype-video-crops/enemies/**
  - tasks/runs/mvp-006-dart-goober-ai.result.md
avoid:
  - src/input/**
  - src/sim/player/**
  - refs/**
checks:
  - npm run build
---

# Intent

Implement the MVP enemy: Dart Goober with delayed spawn, randomized approach movement, stop-and-shoot loop, enemy darts, hit flash, and death pop.

# Done When

- Three Dart Goobers can spawn one by one from room spawn points.
- Spawn has a short pop/particle effect.
- AI picks direction toward player, adds random angle offset, moves briefly, stops, shoots a dart, and repeats.
- Dart Goober has 3 HP and dies after three arrow hits.
- Enemy darts can damage the player through an integration hook.
- Enemy body uses idle bob, walk wobble, shoot anticipation, hit flash, and death particles.

# Notes

Depends on `mvp-001-project-scaffold`. Coordinate with player/projectile interfaces after `mvp-005-player-bow-combat` is available.

# Manager Review

- Merged commit `8ac3532` from `task/mvp-006-dart-goober-ai`.
- Verified scope against the task brief and reviewed enemy simulation, enemy dart simulation, scene wiring, and render lifecycle.
- Passed on `master`: `npm run build`.
