# Bowbert Character Production Workflow

Use this as the full checklist for end-to-end character work.

## 1. Audit

Run:

```bash
python ~/.codex/skills/bowbert-character-studio/scripts/character_pipeline.py <id> --json
```

Read the actual state and do only the next blocked step.

## 2. Intent

Lock:

- id
- role
- behavior pattern
- eye workflow
- asset targets
- runtime states
- source of reference: user sketch, video crop, generated concept, or existing asset

## 3. Concept

Generate concept art only when no locked reference exists.

Store candidate images under:

```text
assets/characters/<id>/source/
```

Use `source/reference-01.png` for the chosen locked reference.

## 4. Character Folder And Assets

Use `$generate2dcharacter`.

Required files while in progress:

```text
brief.md
rig.json
source/
```

Expected accepted files:

```text
base.png
comparison.png
tuning.html
projectiles/
attachments/
exports/
```

Keep runtime-changing layers out of base art:

- black gaze fills
- projectile trails
- hit particles
- attack flashes
- bow draw/recoil
- squash/stretch

## 5. Tuning

Expose only useful controls:

- gaze type, size, angle, position, and direction preview
- motion elasticity for idle/walk/attack/hit
- attachment placement
- projectile origin and trail behavior

Save accepted values into `rig.json`.

## 6. Runtime Integration

Read `runtime-integration.md`.

Choose the smallest runtime path:

- variant renderer over existing system when behavior matches
- new renderer + new system when behavior differs
- projectile system only when the character owns a new projectile behavior

## 7. Playtest

Read `playtest.md`.

Run build, boot the game, force or navigate to the relevant room, and capture evidence.

## 8. Close

Update:

- `brief.md` status and open items
- `rig.json.status`
- optional `pipeline.md` with date, evidence, and next steps

Then rerun `character_pipeline.py`.
