# Bowbert Runtime Integration

Use this file when a tuned character needs to enter the game.

## Project Boundaries

Bowbert runtime is Phaser + TypeScript.

Keep gameplay state in `src/sim/*`. Keep Phaser display objects in `src/render/*`. Keep static/tuned values in `src/characters/*Rig.ts`.

Common files:

```text
src/characters/<camelId>Rig.ts
src/sim/enemies/<PascalId>System.ts
src/render/enemies/<PascalId>Renderer.ts
src/render/enemies/index.ts
src/sim/enemies/index.ts
src/game/scenes/CombatRoomScene.ts
src/render/characters/layeredCharacterConfig.ts
```

## Integration Choices

### Variant Of Existing Behavior

Use this when movement, attack, events, and damage are the same as an existing enemy.

Example: Dart Tri Goober reuses `DartGooberSystem` and swaps renderer/rig.

Required:

- rig config references accepted asset and tuning data
- renderer loads accepted base or draws approved procedural body
- scene selects the variant by room theme, encounter kind, debug setting, or route DSL
- inactive variant renderer receives an empty enemy list

### New Behavior

Use this when phase loop, attack, damage model, or player interaction differs.

Required:

- new `System` with typed events
- new `Renderer`
- scene update flow consumes arrows and events
- SFX and feedback hooks are deliberate
- encounter-cleared event clears the room

### Projectile Owner

Use this when the character fires a distinct projectile.

Required:

- projectile system
- projectile renderer
- collision/damage rules
- boundary behavior
- SFX policy

## Scene Wiring Checklist

- preload assets
- create renderer/system
- clear runtime on room transition
- start encounter from room selection
- update system with delta, bounds, player, arrows/projectiles
- consume hit arrows
- handle events and fire projectile systems
- play feedback and SFX
- update renderer with active enemies
- destroy renderer/system state on shutdown

## Evidence

After integration:

- `npm run build` passes
- `character_pipeline.py` sees runtime rig/renderer/scene spawn evidence
- browser playtest sees the character in the intended room
