---
id: mvp-003-mobile-input
title: Mobile dual joystick and desktop debug input
status: active
owner: worker-mvp-003
branch: task/mvp-003-mobile-input
worktree:
allowed:
  - src/input/**
  - src/ui/**
  - src/game/**
  - src/styles/**
  - tasks/runs/mvp-003-mobile-input.result.md
avoid:
  - assets/**
  - refs/**
  - src/sim/enemies/**
  - src/sim/rooms/**
checks:
  - npm run build
---

# Intent

Implement the MVP input layer: mobile left movement joystick, right aim/fire joystick, dodge button, and desktop debug controls.

# Done When

- Left joystick outputs normalized movement vector.
- Right joystick outputs aim vector and `firing` boolean while held.
- Releasing the right joystick stops firing and preserves last facing direction.
- Dodge button emits a dodge action.
- Desktop debug input supports WASD, mouse aim, held left mouse fire, and space dodge.
- Input is exposed as action/state data, not hardcoded directly into combat logic.
- The center playfield remains unobstructed on landscape mobile.

# Notes

Depends on `mvp-001-project-scaffold`. Do not implement player combat or enemy behavior beyond debug visualization needed to verify input.
