---
id: mvp-001-project-scaffold
title: Phaser TypeScript Vite scaffold
status: active
owner: worker-mvp-001
branch: task/mvp-001-project-scaffold
worktree:
allowed:
  - package.json
  - package-lock.json
  - index.html
  - tsconfig.json
  - vite.config.ts
  - src/**
  - public/**
  - tasks/runs/mvp-001-project-scaffold.result.md
avoid:
  - refs/**
  - assets/prototype-video-crops/**
  - docs/**
checks:
  - npm install
  - npm run build
---

# Intent

Create the runnable browser-game base for the MVP using Phaser 3, TypeScript, and Vite. The first screen should boot a landscape-oriented game canvas with a placeholder scene and no gameplay dependencies.

# Done When

- `npm install` and `npm run build` work.
- `npm run dev` serves a Phaser scene without runtime errors.
- The game canvas uses landscape mobile-first scaling and centers/letterboxes cleanly.
- `src/` has a small structure for game bootstrap, scene registration, shared constants, and future modules.
- Changes stay within the allowed scope.

# Notes

This task should land before gameplay implementation tasks are merged. Keep the scaffold minimal; do not implement joystick, combat, enemies, or room logic here.
