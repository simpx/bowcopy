---
status: runtime-integrated
kind: combat-room-theme
projectContext: bowbert
runtimeTheme: wood
sharedKit: ../room-theme-kit.json
sourceReferences:
  - ../../prototype-video-crops/rooms/forest-room-bounds-wide.png
  - ../../prototype-video-crops/rooms/forest-floor-swatch.png
openItems: []
---

# Forest Room

Role: default normal combat room with green floor, wood stumps, scattered grass marks, stones, and a few mushrooms.

Visual target:
- Match the reference forest room's simple dark-green floor and heavy dark border.
- Use sparse V/W/split grass strokes, tiny dashes, occasional pebble marks, red scuffs, wood stumps, stones, and small mushrooms.
- Keep the room readable behind mobile combat and avoid dense texture.

Runtime:
- Current `RoomTheme` name: `wood`.
- Renderer and dungeon metadata are loaded through `src/data/roomThemeKit.ts`.
- Preferred enemies: Dart Goober and Kaboomlet.
- Door decorations use stumps and small stones when a door points to another forest/wood room.
