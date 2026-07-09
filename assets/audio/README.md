# Uproot Audio

This is the index for audio assets, sourcing notes, and current integration rules.

## Directory Index

- `sfx/`: sound effects.
- `sfx/game/`: current game-facing SFX pack. Use this for gameplay integration.
- `sfx/game/manifest.json`: event-to-file mapping, playback notes, source, author, and license fields.
- `sfx/game/backups/`: retained alternates that should not play by default.
- `sfx/candidates/`: downloaded candidate material kept for audition history and traceability.
- `sfx/curated/`: trimmed audition clips created from candidate files.
- `sfx/candidates.json`: earlier candidate event manifest.
- `sfx/all-in-one-audition.json`: all-in-one audition page manifest.
- `sfx/curated-v1.json`: curated audition manifest after user selection.
- `THIRD_PARTY_LICENSES.md`: attribution and license notes for bundled audio files.

## Audition v2 (2026-07-09, boss/new-enemy SFX + music)

- Regenerate everything: `python3 tools/build_audition.py` (downloads into
  `assets/audio/.cache/`, fills `sfx/candidates/`, renders normalized clips
  into `sfx/curated/<event>/`, music into `music/candidates/`, and writes
  `audition-v2.json`). All of it is gitignored intermediate material.
- Audition page: `/audition.html` (dev and preview servers). Selections and
  free-text notes post to the shared review inbox under the `audio`
  pseudo-target; the AI applies accepted picks into `sfx/game/` +
  `manifest.json` + `THIRD_PARTY_LICENSES.md`, music into `music/`.
- Events covered: portal_whoosh, spell_bolt, witchfire_ignite, hex_orb_launch,
  sheep_morph, sheep_bleat, ritual_channel, ritual_blast, shade_summon,
  door_creak, parry_wood, plus `music_combat` / `music_boss` loops.

## Available Game Audio

The current playable pack is `assets/audio/sfx/game/`.

Selected events:

- `shoot_arrow`
- `empty_bow_release`
- `hit_wood_board`
- `hit_sand_or_rock`
- `hit_rock_break_full`
- `hit_rock_chip`
- `hit_actor`
- `hit_hard_dirt`
- `hit_harder_dirt`
- `pickup`
- `equipment_toggle`
- `item_select`

Backup:

- `empty_bow_release_heavy`

Intentionally empty after audition rejection:

- `walk`
- `arrow_flyby`
- `dodge_or_rustle`

## Selection Principles

- Use purpose-built sounds for their mapped game event.
- Do not use rejected audition sounds.
- Do not synthesize, layer, or substitute unrelated foley for a missing event.
- Trim source assets only when the retained section is still naturally part of the same purpose-built source.
- If no suitable purpose-built source exists, leave the event empty.
- Runtime variation is allowed on approved samples:
  - small pitch variation
  - small volume variation
  - small start offsets where they do not change the identity of the sound
  - event strength mapped to volume or filter parameters

## How This Batch Was Obtained

- OpenGameArt was used for bow shot, arrow twang, rock hit/breaking, pickup, and RPG handling candidates.
- Freesound public HQ MP3 previews were used for arrow impact/target and bonk audition candidates. Original downloads may require a Freesound login.
- Selected source sections were trimmed into standalone WAV files when the original file contained multiple usable hits.
- Zapsplat was evaluated through a manual-login browser session and CDP automation without exporting or printing cookies. It had promising purpose-matched sounds, but no files from Zapsplat are bundled in this pack because the free account hit its download limit.
- BigSoundBank was evaluated as another source, but local download attempts failed with TLS connection closure, so no BigSoundBank files are bundled.

Process records:

- `docs/audio-process-2026-06-28.md`
- `docs/audio-selection-2026-06-28.md`
- `concepts/audio-all-in-one-audition-v1.html`
- `concepts/audio-curated-selection-v1.html`

## How To Get More Audio

1. Search for purpose-built assets first:
   - OpenGameArt
   - Freesound
   - Zapsplat
   - BigSoundBank
   - other reputable free or permissive SFX libraries
2. Prefer sources that provide clear event intent in the title or description, such as bow shot, arrow impact, dirt hit, pickup, leather handling, or rock break.
3. Check the license before adding the file. Record author, source URL, license name, and license URL in `THIRD_PARTY_LICENSES.md`.
4. Put raw candidate files under `assets/audio/sfx/candidates/<source-or-pack>/`.
5. Add the candidate to an audition manifest instead of wiring it into gameplay immediately.
6. Audition it in a browser page and record the decision:
   - selected
   - backup
   - rejected
   - empty because no purpose-built asset fits
7. Promote only selected sounds into `assets/audio/sfx/game/`.
8. Name final game files by event, not by source filename.
9. Update `assets/audio/sfx/game/manifest.json`.
10. Verify every manifest file exists and that the project still builds.

## Source Handling Rules

- Do not store account credentials in this repo.
- Do not export, print, copy, or commit cookies.
- If a source requires login, prefer a normal browser session or a persistent local browser profile.
- Keep previews and final builds license-compliant.
- If a source's terms are unclear, keep the event empty until the license is resolved.
- For CC-BY and CC-BY-SA material, preserve attribution records with any build or preview that includes the files.

## Related Files

- SFX index: `assets/audio/sfx/README.md`
- Final game SFX pack: `assets/audio/sfx/game/README.md`
- License notes: `assets/audio/THIRD_PARTY_LICENSES.md`
