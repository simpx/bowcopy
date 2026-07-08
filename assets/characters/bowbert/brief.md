---
status: playtested
kind: player
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/reference-02.png
  - source/bow-relaxed-reference.png
  - source/bow-full-draw-reference.png
  - source/bow-aiming-reference.png
openItems:
  - Tune player motion and bow feel during gameplay balancing.
---

# Bowbert

Role:
- Player character.

Behavior:
- Right-stick or mouse aim controls the procedural branch bow around the player.
- Player movement uses runtime squash/stretch, bob, velocity tilt, hit squash, dodge stretch, bow recoil, and dodge afterimages.
- Body stays front-facing while bow, pupils, and recoil react to aim and attack state.

Visual target:
- Match the accepted Bowbert body asset with baked white eye sockets and no baked black pupils.
- Keep the bow as a procedural runtime attachment rather than baking it into the body.
- Preserve large edge-mounted eyes, orange cap, green leaf top, brown lower body, tiny legs, and thick black doodle outline.

Source:
- `source/reference-01.png`: locked gameplay crop with bow.
- `source/reference-02.png`: gameplay facing-right crop.
- `source/bow-relaxed-reference.png`
- `source/bow-full-draw-reference.png`
- `source/bow-aiming-reference.png`

Generated candidates:
- `base.png`: current accepted runtime body, copied from `candidates/bowbert-base-ai-v2-eye-whites.png`.
- `base-source.png`: retained AI source, copied from `candidates/bowbert-base-ai-v2-source.png`.
- `candidates/bowbert-base-ai-v2-eye-whites.png`: previous accepted runtime filename, kept for provenance.
- `candidates/bowbert-base-ai-v2-trimmed.png`: earlier accepted base with baked black pupils before pupil removal.
- `candidates/bowbert-body-skill-v1-trimmed.png`: rejected procedural/body-skill candidate kept for comparison.

Decomposition:
- base.png: fixed player body with baked white eye sockets and stable upright pose.
- attachments/bow: procedural branch bow drawn by runtime canvas.
- attachments/eyes: runtime black pupils over baked white eye sockets.
- projectiles: arrows are runtime projectiles.
- vfx: bow glow, release recoil, hit flash, dodge afterimages, and foot/motion squash are runtime effects.
- runtime: gaze, bow placement, draw/release, walk bob, dodge stretch, hit squash, recoil, velocity tilt.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`
- `source/reference-02.png`

Mode: accepted-generated asset already locked.

Layer contract:
- Fixed Bowbert player body with baked white eye sockets.
- Runtime owns black pupils, bow, arrows, bow glow, aim/release recoil, dodge afterimages, squash/stretch, hit tint, and all motion.

Generation prompt:
> Transparent-background Bowbert player body sprite matching the locked reference. Preserve the orange cap, green leaf top, brown lower body, tiny legs, thick black doodle outline, and large edge-mounted white eye sockets. Create a stable front-facing body base for runtime pupils, procedural bow attachment, squash/stretch, dodge, hit, and aiming overlays.

Boundary notes:
> Single centered player body, transparent background, clean edges, upright front-facing posture, no baked bow, no baked black pupils.

Acceptance checks:
- Body matches accepted Bowbert visual.
- White eye sockets are stable in the base.
- Black pupils and bow are reserved for runtime.
- Transparent PNG, tight crop with enough room for external eyes and runtime squash/stretch.

Runtime evidence:
- `src/characters/bowbertRig.ts`: stores accepted player base, gaze, and motion values.
- `src/render/player/BowbertRenderer.ts`: renders base body, runtime pupils, procedural branch bow, recoil, dodge afterimages, and hit flash.
- `src/game/scenes/CombatRoomScene.ts`: preloads and creates Bowbert player renderer in the combat scene.
- `../../weapons/bow/`: self-contained procedural branch bow asset package with references, rig data, tuning page, and exported preview states.
- `playtest/runtime-encounter.png`: browser screenshot proof that Bowbert appears in the game scene after the runtime base path migration.

Preview notes:
- `tuning.html` should show reference, base, runtime pupils, bow-free body assembly, and copyable rig data.
- Bow draw/release visual remains in the Phaser runtime and procedural bow code.
