---
id: mvp-004-room-visuals-state
title: Reference-style single combat room
status: active
owner: worker-mvp-004
branch: task/mvp-004-room-visuals-state
worktree:
allowed:
  - src/game/**
  - src/sim/rooms/**
  - src/render/rooms/**
  - src/assets/**
  - assets/prototype-video-crops/rooms/**
  - assets/prototype-video-crops/decorations/**
  - tasks/runs/mvp-004-room-visuals-state.result.md
avoid:
  - src/input/**
  - src/sim/enemies/**
  - src/sim/player/**
  - refs/**
checks:
  - npm run build
---

# Intent

Implement the MVP room: dark green floor, thick dark borders, door/opening shapes, scattered decorations, and room state transitions.

# Done When

- The room visually matches the reference combat rooms closely enough for MVP validation.
- Doors are visibly open before combat, closed during combat, and open/clear after enemies are defeated.
- Decorations are scattered with slight position, rotation, and flip variation.
- Room center trigger can start combat.
- Fixed spawn points are represented as room data.
- The full room is readable in landscape mobile framing.

# Notes

Depends on `mvp-001-project-scaffold`. This task may include placeholder room-state hooks, but should not implement Dart Goober AI.
