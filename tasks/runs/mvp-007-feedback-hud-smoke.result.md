---
id: mvp-007-feedback-hud-smoke
status: complete
branch: task/mvp-007-feedback-hud-smoke
---

# Result

- Added a DOM hearts HUD with 3 hearts, damage state updates, and a short flash/wiggle animation on hit.
- Added `CombatFeedbackRenderer` for arrow-wall, arrow-enemy, enemy-death, enemy-spawn, dodge, damage, and room-clear pulses/labels/particles.
- Routed combat events through differentiated camera shake strengths for hit, damage, dodge, and room clear.
- Clamped arrow-wall feedback positions back inside the visible room so edge hits remain readable.

# Checks

- `npm run build` passed.
- Local Vite dev server ran on `http://localhost:4173/` for smoke verification.

# Smoke test

- Desktop Chromium/CDP smoke at 1280x720:
  - Game booted with canvas visible and hearts HUD at `Health: 3 of 3`.
  - Arrow-wall feedback showed a visible `Thunk` label after firing into the left wall.
  - Combat trigger spawned enemies with visible `Pop` spawn feedback.
  - Dodge input showed a visible `Dodge` label/pulse.
  - Automated combat drove the hearts HUD down to `Health: 0 of 3`; enemies cleared and doors/spawn markers moved to the cleared room state.
- Mobile landscape Chromium/CDP smoke at 844x390:
  - Game booted with canvas visible, hearts HUD at `Health: 3 of 3`, and touch overlay displayed.
  - HUD and touch controls stayed readable without covering the central playfield.

# Follow-up tasks

- None.
