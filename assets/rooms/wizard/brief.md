---
status: runtime-integrated
kind: reward-room-theme
projectContext: bowbert
runtimeTheme: wizard
sharedKit: ../room-theme-kit.json
sourceReferences:
  - ../../../refs/keyframes/0885_wizard.jpg
openItems:
  - Final wizard NPC and sigil reward props are not implemented yet.
---

# Wizard Room

Role: non-combat reward room planned for the wizard/sigil loop.

Visual target:
- Preserve the same room language so it feels part of the dungeon.
- Add small magical spark marks and a slightly cooler floor.
- Keep combat markers hidden when the room is already cleared/reward-only.

Runtime:
- Renderer and dungeon metadata are loaded through `src/data/roomThemeKit.ts`.
- Current dungeon setup marks wizard rooms as cleared and enemy-free.
- Door decorations use purple spark marks plus small props when a door points to a wizard room.
