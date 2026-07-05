---
id: mvp-002-prototype-video-crops
title: Prepare temporary runtime video-crop assets
status: active
owner: worker-mvp-002
branch: task/mvp-002-prototype-video-crops
worktree: /home/simpx/bowbert-workers/mvp-002-prototype-video-crops
allowed:
  - assets/prototype-video-crops/**
  - src/assets/**
  - tasks/runs/mvp-002-prototype-video-crops.result.md
avoid:
  - refs/**
  - src/game/**
  - src/input/**
  - src/sim/**
checks:
  - npm run build
---

# Intent

Prepare the temporary runtime assets needed by the MVP from the existing reference crops and/or the locally available captured video frames. These are prototype assets only, used to validate the 1:1-feeling replica.

# Done When

- `assets/prototype-video-crops/` contains runtime-ready images for Bowbert, bow/arrow, Dart Goober, hearts, and room/decor pieces.
- Asset filenames are stable and descriptive.
- A manifest or asset-key module exists under `src/assets/` if the scaffold is available; otherwise document the intended keys in the result file.
- No full video, subtitle, or raw capture dump is committed.
- Checks pass or the missing scaffold dependency is explained.

# Notes

Use `refs/asset-crops/` as visual guidance. Keep these assets isolated so they can be replaced by original art later.
