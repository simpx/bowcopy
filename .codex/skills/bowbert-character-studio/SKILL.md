---
name: bowbert-character-studio
description: End-to-end Bowbert character production pipeline for this Phaser mobile roguelike. Use when Codex needs to create, continue, inspect, route, tune, integrate, playtest, or status-check a Bowbert character from concept/reference art through an assets/characters character folder, generate2dcharacter rigging, tuning.html, Phaser runtime integration, browser screenshot verification, task notes, and commit readiness.
---

# Bowbert Character Studio

## Overview

Use this skill as the umbrella entrypoint for Bowbert character production. It coordinates concept/reference work, `$generate2dcharacter`, runtime integration, and browser playtest without trusting chat history as state.

This skill does not replace `$generate2dcharacter`; route to that skill for character folder creation, image prompt packets, base/projectile assets, rig data, tuning pages, and character-folder audits.

## Core Rule

Start every continuation by auditing the character folder and runtime code:

```bash
python ~/.codex/skills/bowbert-character-studio/scripts/character_pipeline.py <character-id-or-folder> --json
```

Use the script output as the current state. Treat `brief.md` status as a claim, not proof. Derive actual state from folder files, `rig.json`, generated assets, tuning evidence, runtime code, build/audit output, and playtest evidence.

## Routing

- Concept/reference image needed: use `imagegen`, then store outputs under `assets/characters/<id>/source/` and wait for user confirmation before final asset generation.
- Character folder, prompt packets, base images, projectiles, runtime gaze, motion rig, tuning page, or character audit needed: use `$generate2dcharacter`.
- Phaser runtime wiring needed: use the repo's established `src/characters`, `src/sim/enemies`, `src/render/enemies`, and `src/game/scenes/CombatRoomScene.ts` patterns. Read `references/runtime-integration.md`.
- Browser proof needed: use a game-playtest style pass with dev server, Chromium/CDP when available, and screenshot evidence. Read `references/playtest.md`.
- Status ambiguity: rerun `scripts/character_pipeline.py`; do not infer from memory.

## Default Workflow

1. Audit current state.
   - Run `character_pipeline.py`.
   - Report `actualStatus`, `nextStep`, and blockers.
2. Lock the character intent.
   - Identify `character_id`, role, behavior pattern, eye workflow, asset targets, and runtime states.
3. Produce or import concept/reference art.
   - Generate concept images only when no locked reference exists.
   - Keep candidate references in `assets/characters/<id>/source/`.
   - Move forward only after a locked reference is available.
4. Generate the character folder and assets.
   - Route to `$generate2dcharacter`.
   - Use image-to-image when a locked reference exists.
   - Keep base, attachments, projectiles, and runtime-owned layers separated.
5. Tune.
   - Ensure `tuning.html` previews base, runtime gaze, motion states, attachments, projectiles, and copyable rig data.
   - Store accepted values in `rig.json`, not chat.
6. Integrate runtime.
   - Add or update `src/characters/<id>Rig.ts`.
   - Add renderer/system or reuse a precedent system when the behavior is a variant.
   - Wire preload, create, update, events, room selection, projectile/SFX, and cleanup.
7. Playtest.
   - Run build.
   - Boot the game through a browser.
   - Capture evidence that the character appears in the intended room/encounter and that the renderer is nonblank.
8. Close the loop.
   - Update `brief.md`, `rig.json`, and optional `pipeline.md`.
   - Leave open items for unconfirmed balance/audio/workflow.
   - Commit only when requested or when the current task explicitly asks for it.

## Status Gates

Read `references/status-model.md` before changing statuses or deciding next steps.

Allowed pipeline states:

```text
brief
concept-generated
reference-locked
asset-generated
rigged
tuned
runtime-integrated
playtested
done
needs-review
```

Do not promote a character by editing status alone. The evidence must exist. For example, `runtime-integrated` needs runtime code references plus build success; `playtested` needs browser evidence.

## Script Use

Run status audit:

```bash
python ~/.codex/skills/bowbert-character-studio/scripts/character_pipeline.py dart-tri-goober --json
```

Run against an explicit folder:

```bash
python ~/.codex/skills/bowbert-character-studio/scripts/character_pipeline.py assets/characters/dart-tri-goober
```

Use the script before and after runtime integration. It detects likely next steps and common contradictions such as accepted art missing from `rig.json`, runtime files existing without scene spawn wiring, or old prompt headings in `brief.md`.

## Reference Files

- `references/status-model.md`: state gates, evidence, and next-step mapping.
- `references/workflow.md`: full production checklist from concept through done.
- `references/runtime-integration.md`: Bowbert-specific Phaser integration boundaries.
- `references/playtest.md`: browser verification and screenshot evidence expectations.

## Quality Bar

A character is not production-ready until:

- `character_pipeline.py` reports no blocking items.
- `$generate2dcharacter` audit passes for the folder.
- `npm run build` passes after runtime changes.
- Browser evidence shows the character in-game with the intended renderer.
- `brief.md` and `rig.json` describe confirmed state and remaining open items.
- Open design items are explicit rather than hidden in chat.
