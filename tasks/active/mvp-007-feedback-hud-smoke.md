---
id: mvp-007-feedback-hud-smoke
title: MVP feedback, hearts HUD, smoke verification
status: active
owner: worker-mvp-007
branch: task/mvp-007-feedback-hud-smoke
worktree:
allowed:
  - src/render/feedback/**
  - src/ui/**
  - src/game/**
  - src/styles/**
  - src/assets/**
  - assets/prototype-video-crops/ui/**
  - tasks/runs/mvp-007-feedback-hud-smoke.result.md
avoid:
  - refs/**
checks:
  - npm run build
---

# Intent

Add the baseline feedback layer required by the MVP and verify the whole MVP loop on desktop/mobile-sized viewports.

# Done When

- Hearts HUD is visible and damage flashes/wiggles hearts.
- Arrow-wall, arrow-enemy, enemy-death, enemy-spawn, dodge, and room-clear feedback are present.
- Camera shake has different strengths for hit, damage, dodge, and room clear.
- Room clear has a short celebratory pulse or particles.
- A smoke-test note in the result file reports desktop and mobile-landscape behavior.
- Any missing checks or unresolved integration issues are documented clearly.

# Notes

This task should run after the scaffold and core gameplay tasks are merged. Keep feedback systems parameterized so future enemies can reuse them.
