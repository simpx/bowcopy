---
name: bowcopy-studio
description: Bowcopy character production studio. Use when creating, tuning, reviewing, QC-ing, or integrating a character/enemy for this project — concept art, base image generation, rig.json runtime values, workbench review, state-capture self-review, enemy kit integration, or status/pipeline questions.
---

# Bowcopy Studio

Read `docs/studio.md` first — it is the authoritative workflow. This skill is a thin router.

## Core rules

- Characters here are: emotion via runtime eyes, fixed base image, motion via squash/stretch deformation (no sprite sheets), attachments as separate layers.
- `assets/characters/<id>/rig.json` `runtime` section is the single source of truth for runtime values. Never re-introduce literals in `src/characters/*Rig.ts`.
- `brief.md` frontmatter holds `status` and decisions. Decisions land in files, never only in chat.
- Reuse before generating: check `assets/index.json`, eye templates in `src/characters/eyeEmotionTemplates.ts`, burst styles in `src/render/feedback/particleBurst.ts`.
- Review evidence must come from the real runtime: workbench pages and capture screenshots, not hand-drawn previews.

## Commands

- QC (must be error-free before review): `npm run studio:qc`
- Self-review screenshots (your eyes): `npm run studio:capture -- <id>`
- Rebuild reuse index: `python3 tools/index_assets.py`
- Human review page: `npm run dev` then `/workbench.html` (or `?focus=<id>`)
- Integration check: `npm run build`, then screenshot `/?encounter=<kind>`

## Workflow per new character

1. Lock concept: candidates in `source/`, decision in `brief.md` (`lockedReference`, `status: reference-locked`).
2. Generate base art per prompt packet; accepted art becomes `base.png` + `comparison.png`; keep rejects in `candidates/`.
3. Fill `rig.json` `runtime` starting from the closest existing character's runtime section and eye template.
4. Run QC + capture; inspect your own screenshots against the quality bar; iterate until clean.
5. Hand off for human review in the workbench; the human may tune values in-page (saved to rig.json).
6. Integrate: write `src/game/enemies/<id>Kit.ts` modeled on an existing kit, register it in `src/game/enemies/index.ts`, map a room theme in `CombatRoomScene`, build, capture `/?encounter=<kind>` evidence into `playtest/`, advance `status`.
