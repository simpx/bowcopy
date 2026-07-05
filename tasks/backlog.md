# Backlog

## Active MVP Tasks

- [x] `mvp-001-project-scaffold`: create Phaser + TypeScript + Vite base. Merged from `task/mvp-001-project-scaffold`.
- [x] `mvp-002-prototype-video-crops`: prepare temporary runtime crops from video references. Merged from `task/mvp-002-prototype-video-crops`.
- [x] `mvp-003-mobile-input`: implement mobile dual-joystick and desktop debug input. Merged from `task/mvp-003-mobile-input`.
- [x] `mvp-004-room-visuals-state`: implement single reference-style combat room, doors, decorations, room state. Merged from `task/mvp-004-room-visuals-state`.
- [x] `mvp-005-player-bow-combat`: implement Bowbert, bow visuals, arrows, player damage/dodge basics. Merged from `task/mvp-005-player-bow-combat`.
- [ ] `mvp-006-dart-goober-ai`: implement Dart Goober spawn, AI, darts, hit/death. Worker running in `/home/simpx/bowbert-workers/mvp-006-dart-goober-ai`.
- [ ] `mvp-007-feedback-hud-smoke`: implement required feedback, hearts HUD, smoke checks.

## Later

- Add Dart Tri Goober as first parameter variant.
- Add multiple room templates and generated room graph.
- Add red/purple shroom enemies.
- Add slime, kaboomlet, and spooper gooper enemies.
- Add wizard room and sigils.
- Replace `assets/prototype-video-crops/` with original recreated assets before release.

## Worker Instructions

Each worker should create a worktree from `master`, switch to the listed `task/<task-id>` branch inside that worktree, implement only the assigned task, write `tasks/runs/<task-id>.result.md`, run checks, and commit locally.
