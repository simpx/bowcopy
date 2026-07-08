# Bowbert Room Themes

Bowbert rooms are procedural room chunks, not baked map images. The current runtime draws the ground, walls, doors, floor marks, small props, spawn markers, and trigger rings with Phaser graphics.

## Files

- `room-theme-kit.json`: shared room dimensions, palette, floor detail rules, prop placement, door templates, and dungeon DSL.
- `tuning.html`: visual preview for room themes, door states, floor detail density, prop density, spawn markers, and trigger rings.
- `forest/`, `stone/`, `mushroom/`, `wizard/`: per-theme notes and rig data.

## Runtime Contract

- `forest` maps to the current runtime `wood` theme.
- `src/data/roomThemeKit.ts` imports `room-theme-kit.json` for renderer and dungeon runtime use.
- Theme identity is expressed through floor color, procedural grass/dash/scuff marks, small props, and door-side decorations.
- Door count is determined by the dungeon DSL and neighboring rooms.
- Spawn markers and trigger rings are gameplay metadata, not baked floor art.

## Open Items

- Add final wizard props when the NPC/sigil reward loop is ready.
- Add a dedicated boss room package when the boss encounter is locked.
