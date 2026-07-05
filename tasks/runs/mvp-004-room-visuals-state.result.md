---
id: mvp-004-room-visuals-state
task: tasks/active/mvp-004-room-visuals-state.md
status: complete
branch: task/mvp-004-room-visuals-state
commit: branch-head
---

# Result

## Summary

- Added a data-driven reference combat room with bounds, thick border openings, two door definitions, a center trigger, fixed spawn marker data, floor flecks, and varied decoration placement.
- Added a Phaser room renderer for the dark green floor, heavy dark borders, open/closed door visuals, spawn marker visuals, trigger marker visuals, and decor crop placement with scale/rotation/flip variation.
- Added `CombatRoomScene` with a scripted placeholder probe that enters the center trigger, starts the combat room state, then clears it; this exercises `open -> combat -> cleared` without adding input, player combat, enemy AI, or new refs.
- Kept `PlaceholderScene.ts` untouched and registered it after `CombatRoomScene` so the incoming `mvp-003-mobile-input` work can be reconciled without losing its scene/debug changes. The room scene is registered first because this task needs the MVP room to be the active first screen.

## Changed Files

- `src/game/scenes/CombatRoomScene.ts`
- `src/game/scenes/index.ts`
- `src/render/rooms/CombatRoomRenderer.ts`
- `src/render/rooms/index.ts`
- `src/sim/rooms/combatRoom.ts`
- `src/sim/rooms/index.ts`
- `tasks/runs/mvp-004-room-visuals-state.result.md`

## Checks

- `npm ci` - passed; required because this worktree did not have `node_modules`.
- `npm run build` - passed. Vite reports the existing large Phaser bundle warning.
- Browser smoke via `npx playwright screenshot` at 960x540 - passed for open, combat, and cleared timings. Verified the room renders nonblank, combat closes east/south exits, and cleared opens them again. Screenshots were written under `/tmp/bowbert-room-*.png`.

## Follow-up Tasks

- After `mvp-003-mobile-input` merges, move or share any useful touch overlay/debug wiring from `PlaceholderScene` into `CombatRoomScene` without adding gameplay input in this task branch.
