# Uproot Game SFX Pack

This folder is the current game-facing sound asset pack.

Use this folder for gameplay integration. The broader `assets/audio/sfx/candidates/`
and `assets/audio/sfx/curated/` folders are audition and process material.

## Contents

- `manifest.json`: event-to-file mapping, playback intent, source, and license notes.
- Top-level audio files: selected sounds approved for the current game direction.
- `backups/`: retained alternates that should not be played by default.

## Policy

- Use only purpose-built sounds for the mapped event.
- Do not use rejected audition sounds.
- Do not synthesize, layer, or substitute unrelated foley for a missing event.
- If an event has no approved purpose-built sound, leave it empty.

## Current Events

- `shoot_arrow`
- `empty_bow_release`
- `hit_wood_board`
- `hit_sand_or_rock`
- `hit_rock_break_full`
- `hit_rock_chip`
- `hit_actor`
- `hit_hard_dirt`
- `hit_harder_dirt`
- `shroom_hit`
- `shroom_death`
- `spore_break`
- `dodge_roll`
- `walk_soft_1`
- `walk_soft_2`
- `player_damage_soft`
- `room_clear`
- `pickup`
- `equipment_toggle`
- `item_select`

Currently empty after audition rejection:

- `arrow_flyby`

## Records

- Process summary: `docs/audio-process-2026-06-28.md`
- User selection record: `docs/audio-selection-2026-06-28.md`
- Audition manifest: `assets/audio/sfx/curated-v1.json`
- License and attribution notes: `assets/audio/THIRD_PARTY_LICENSES.md`

## Event Mapping Recommendation

- `shoot_arrow`: play `assets/audio/sfx/game/shoot_arrow.ogg` once on normal arrow release.
- `empty_bow_release`: play `assets/audio/sfx/game/empty_bow_release.wav`; keep `assets/audio/sfx/game/backups/empty_bow_release_heavy.wav` as the only heavier backup.
- `hit_actor`: retained as an older soft actor-hit candidate; the current player damage cue uses `player_damage_soft`.
- `hit_wood_board`: play `assets/audio/sfx/game/hit_wood_board.wav` when an arrow hits wooden cover or board-like material.
- `hit_sand_or_rock`: play `assets/audio/sfx/game/hit_sand_or_rock.ogg` for sand/stone contact.
- `hit_hard_dirt`: play `assets/audio/sfx/game/hit_hard_dirt.wav` for slightly hard dirt.
- `hit_harder_dirt`: play `assets/audio/sfx/game/hit_harder_dirt.mp3` for harder dirt.
- `shroom_hit`: play `assets/audio/sfx/game/shroom_hit.wav` on red or purple shroom arrow hits.
- `shroom_death`: play `assets/audio/sfx/game/shroom_death.wav` once when a shroom dies.
- `spore_break`: play `assets/audio/sfx/game/spore_break.wav` when dodge invulnerability breaks a spore.
- `dodge_roll`: play `assets/audio/sfx/game/dodge_roll.ogg` once at dodge start.
- `walk_soft_1` / `walk_soft_2`: alternate grass steps quietly while Bowbert is moving; throttle in code.
- `player_damage_soft`: play `assets/audio/sfx/game/player_damage_soft.wav` on Bowbert damage.
- `room_clear`: play `assets/audio/sfx/game/room_clear.mp3` when a combat room is cleared.
- `hit_rock_break_full`: play `assets/audio/sfx/game/hit_rock_break_full.ogg` for full rock destruction.
- `hit_rock_chip`: play `assets/audio/sfx/game/hit_rock_chip.ogg` for smaller rock chip feedback.
- `pickup`: play `assets/audio/sfx/game/pickup.ogg` on arrow pickup.
- `equipment_toggle`: play `assets/audio/sfx/game/equipment_toggle.ogg` for equipment/quiver panel open-close.
- `item_select`: play `assets/audio/sfx/game/item_select.ogg` for item selection.
