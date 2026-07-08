---
status: runtime-integrated
kind: mobile-control-overlay
projectContext: bowbert
runtimeBridge: ../../../src/data/touchControlsKit.ts
runtimeRenderer: ../../../src/ui/TouchInputOverlay.ts
openItems:
  - Fine tune right-side aim zone after more physical phone testing.
---

# Touch Controls

Role: mobile landscape control overlay for movement, aiming, shooting, and dodge.

Runtime behavior:
- Left joystick controls movement only.
- Right screen aim zone controls aim direction and firing; if it is not touched, the player does not shoot.
- Dodge button emits a dodge action and lives near the right joystick.
- The right joystick visual is passive; the large aim zone receives touches so aiming is easier on phone.

Visual target:
- Low-chrome translucent controls that do not cover the center playfield.
- Large enough targets for phone thumbs.
- Neutral pale ring/stick language with a green dodge button, matching the current Bowbert UI palette.

Layer contract:
- `rig.json` owns sizing, safe-area offsets, colors, dead zone, and compact landscape parameters.
- `src/ui/TouchInputOverlay.ts` owns DOM creation, pointer capture, and input dispatch.
- `tuning.html` previews landscape and portrait layouts without requiring touch hardware.
