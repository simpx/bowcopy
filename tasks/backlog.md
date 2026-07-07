# Backlog

## Active MVP Tasks

- [x] `mvp-001-project-scaffold`: create Phaser + TypeScript + Vite base. Merged from `task/mvp-001-project-scaffold`.
- [x] `mvp-002-prototype-video-crops`: prepare temporary runtime crops from video references. Merged from `task/mvp-002-prototype-video-crops`.
- [x] `mvp-003-mobile-input`: implement mobile dual-joystick and desktop debug input. Merged from `task/mvp-003-mobile-input`.
- [x] `mvp-004-room-visuals-state`: implement single reference-style combat room, doors, decorations, room state. Merged from `task/mvp-004-room-visuals-state`.
- [x] `mvp-005-player-bow-combat`: implement Bowbert, bow visuals, arrows, player damage/dodge basics. Merged from `task/mvp-005-player-bow-combat`.
- [x] `mvp-006-dart-goober-ai`: implement Dart Goober spawn, AI, darts, hit/death. Merged from `task/mvp-006-dart-goober-ai`.
- [x] `mvp-007-feedback-hud-smoke`: implement required feedback, hearts HUD, smoke checks. Merged from `task/mvp-007-feedback-hud-smoke`.
- [x] `mvp-008-dart-tri-goober`: create and prototype the Dart Tri Goober variant. Completed on `master`.
- [x] `mvp-009-slime-enemy`: create and prototype the jumping Slime enemy. Completed on `master`.
- [x] `mvp-010-kaboomlet-enemy`: create and prototype the Kaboomlet bomb enemy. Completed on `master`.
- [x] `mvp-011-spooper-gooper`: create and prototype the Spooper Gooper ghost enemy. Completed on `master`.

## Later

- Add multiple room templates and generated room graph.
- Integrate approved new enemy prototypes into encounter/room selection.
- Generate and accept final `base.png` art for Dart Tri Goober, Slime, Kaboomlet, and Spooper Gooper.
- Add wizard room and sigils.
- Replace `assets/prototype-video-crops/` with original recreated assets before release.

## Worker Instructions

Each worker should create a worktree from `master`, switch to the listed `task/<task-id>` branch inside that worktree, implement only the assigned task, write `tasks/runs/<task-id>.result.md`, run checks, and commit locally.
