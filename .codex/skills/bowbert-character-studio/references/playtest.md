# Bowbert Character Playtest

Use this file after runtime integration.

## Required Checks

- Game boots without console errors.
- Intended encounter kind starts.
- Character appears in the playfield.
- Renderer is nonblank and uses the intended base/procedural body.
- Runtime gaze or expression appears when expected.
- Projectile, attack, hit, death, or special behavior is visible when in scope.
- HUD and touch controls do not cover the character in normal play.

## Browser Path

Preferred:

1. Start Vite dev server.
2. Open Chromium.
3. Use CDP when possible to inspect scene state and force the room/encounter for deterministic screenshots.
4. Capture screenshot evidence.

Useful runtime probes:

```js
window.__bowbertGame
window.__bowbertGame.scene.getScene('CombatRoomScene')
```

Record evidence in `assets/characters/<id>/pipeline.md` or keep screenshot paths in the character folder when useful.

## Playtest Status

Mark `playtested` only when there is concrete evidence. A passing build alone is `runtime-integrated`, not `playtested`.
