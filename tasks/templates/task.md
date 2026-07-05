---
id: TASK-ID
title: Short task title
status: active
owner: worker-TASK-ID
branch: task/task-id
worktree:
allowed:
  - path/to/owned/files/**
avoid:
  - path/to/shared/system/**
checks:
  - npm run build
---

# Intent

Write a rough task direction here. Keep this brief.

# Done When

- The task is implemented and usable.
- The listed checks pass or failures are explained.
- Changes stay within the allowed scope.

# Notes

Manager notes only. Workers should put implementation details in `tasks/runs/task-id.result.md`.
