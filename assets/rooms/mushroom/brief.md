---
status: runtime-integrated
kind: combat-room-theme
projectContext: bowbert
runtimeTheme: mushroom
sharedKit: ../room-theme-kit.json
sourceReferences:
  - ../../prototype-video-crops/decorations/mushroom-purple.png
  - ../../../refs/asset-crops/effects/red_shroom_spore_gameplay_reference.png
openItems: []
---

# Mushroom Room

Role: normal combat room with more small mushroom props and shroom enemy pressure.

Visual target:
- Keep the same readable green room floor.
- Add noticeably more small mushrooms than other rooms.
- Door decorations should hint at mushroom rooms before the player enters them.

Runtime:
- Renderer and dungeon metadata are loaded through `src/data/roomThemeKit.ts`.
- Preferred enemies: Red Shroom and Purple Shroom.
- Door decorations use clustered mushrooms when a door points to a mushroom room.
