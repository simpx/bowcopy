---
id: mvp-005-player-bow-combat
status: complete
branch: task/mvp-005-player-bow-combat
---

# Result

## Scope

- Added Bowbert player simulation for input-driven movement, aim/facing, hold-to-fire cadence, bow draw/release state, dodge cooldown, dodge invulnerability, recoil, and hit feedback hooks.
- Added projectile simulation for arrows with direction, speed, damage, trail history, lifetime, and boundary-hit events.
- Added Phaser renderers for Bowbert, bow pose swaps, eye aim tracking, sine idle/walk squash, dodge lean/stretch, ghost afterimages, arrows, trails, and impact flashes.
- Wired `CombatRoomScene` to desktop/touch input, player/projectile updates, arrow fire events, and player-driven combat trigger activation.
- Stayed within the task allow list; did not edit `src/input/**`, enemy systems, or `refs/**`.

## Checks

- `npm ci` to install missing lockfile dependencies in the worktree.
- `npm run build` passed.
- `npm run preview -- --host 127.0.0.1 --port 4173` plus `curl -I http://127.0.0.1:4173/` returned `200 OK`.
- Headless Chromium screenshot smoke check loaded the combat room, Bowbert, bow, trigger markers, and touch overlay. Chromium emitted DBus warnings in headless mode, but exited successfully and wrote the screenshot; the temporary screenshot was removed after inspection.

## Follow-up tasks

- Enemy collision should consume arrow hit hooks once enemy systems exist.
