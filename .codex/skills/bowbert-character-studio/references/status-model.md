# Bowbert Character Status Model

Use this file before changing `brief.md` or `rig.json` status.

## Principle

Declared status is a claim. Actual status is evidence-based.

Read:

- `assets/characters/<id>/brief.md`
- `assets/characters/<id>/rig.json`
- files under `source/`, `attachments/`, `projectiles/`, `exports/`
- `base.png`, `comparison.png`, `tuning.html`
- runtime files under `src/characters`, `src/sim`, `src/render`, `src/game/scenes`
- playtest screenshots or `pipeline.md`

Then run:

```bash
python ~/.codex/skills/bowbert-character-studio/scripts/character_pipeline.py <id> --json
```

## Statuses

### `brief`

Use when the character idea exists but no locked visual reference exists.

Evidence:

- character id or intended role may exist
- `brief.md` may exist
- no accepted `source/reference-*.png`

Next: create or collect concept/reference art.

### `concept-generated`

Use when concept candidates exist but the user has not locked one.

Evidence:

- candidate images in `source/` or `exports/`
- `lockedReference` is empty or unconfirmed

Next: ask user to choose/confirm the locked reference.

### `reference-locked`

Use when a confirmed visual reference exists and the asset plan is known.

Evidence:

- `brief.md` names `lockedReference`
- referenced file exists under the character folder
- no accepted `base.png` yet

Next: route to `$generate2dcharacter` for base/projectile/attachment generation.

### `asset-generated`

Use when one or more bitmap assets exist but rig/tuning acceptance is unfinished.

Evidence:

- `base.png` or accepted asset candidate exists
- `comparison.png` may exist
- `rig.json` may still need exact image sizes, scale, hitbox, or gaze data

Next: backfill rig and tuning preview.

### `rigged`

Use when accepted art and confirmed rig values are stored.

Evidence:

- `base.png` exists
- `rig.json` references accepted assets with image sizes and non-null confirmed values
- `$generate2dcharacter` audit has no errors

Next: tune user-facing parameters or prepare runtime integration.

### `tuned`

Use when tuning is visually accepted.

Evidence:

- `tuning.html` previews relevant runtime states
- user-tuned gaze/motion/attachment/projectile values are saved in `rig.json`
- open items do not include visual placement blockers

Next: integrate runtime.

### `runtime-integrated`

Use when the character can appear in the Phaser game.

Evidence:

- `src/characters/<id>Rig.ts` or equivalent rig config exists
- renderer/system/preload wiring exists or a precedent system is reused deliberately
- `CombatRoomScene` or room selection can spawn/render it
- `npm run build` passes

Next: browser playtest.

### `playtested`

Use when browser evidence confirms the runtime path.

Evidence:

- screenshot or `pipeline.md` records the character appearing in-game
- browser test confirms nonblank renderer, loaded texture or procedural drawing, and expected encounter kind
- major visual blockers are absent

Next: mark done or leave balance/audio follow-ups.

### `done`

Use when production work is complete for the requested scope.

Evidence:

- playtest evidence exists
- build passes
- no blocking open items remain
- follow-ups are optional improvements, not missing requirements

### `needs-review`

Use when evidence contradicts the declared status or a quality gate fails.

Examples:

- `base.png` exists but `rig.json.base.image` is null
- status says `runtime-integrated` but no scene spawn path exists
- runtime gaze is required but base has baked black pupils
- build fails
- playtest screenshot is blank or shows the wrong renderer

## Promotion Rule

Promote one state at a time unless evidence clearly satisfies multiple gates. Never skip user confirmation for visual reference lock or tuning acceptance when the user has not already approved the visual result.
