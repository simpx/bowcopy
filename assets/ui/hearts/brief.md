---
status: runtime-integrated
kind: hud-widget
projectContext: bowbert
runtimeBridge: ../../../src/data/uiHudKit.ts
runtimeRenderer: ../../../src/ui/HeartsHud.ts
sourceReferences:
  - ../../prototype-video-crops/ui/heart-full.png
  - ../../prototype-video-crops/ui/heart-row-five.png
openItems: []
---

# Hearts HUD

Role: player health display for the top-left combat HUD.

Visual target:
- Simple pink heart with thick black doodle outline.
- Small white highlight near the upper-left lobe.
- Short dark peg/drop shadow below each heart, matching the video crop.
- Slight alternating tilt so the row feels hand-placed.

Runtime behavior:
- Full heart, half heart, and empty heart states are generated from one SVG path.
- Health is snapped to half-heart increments by `PlayerHealth`.
- On damage, the row wiggles and filled hearts briefly flash.
- The center playfield remains clear on desktop and mobile.

Layer contract:
- Heart art is SVG/runtime DOM, not a baked sprite sheet.
- `rig.json` owns the shape paths, colors, sizes, fill rules, and motion timing.
- `src/ui/HeartsHud.ts` owns DOM creation and health-state updates.
