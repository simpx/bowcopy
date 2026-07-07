# Bowbert Audio SFX Candidates

Date: 2026-07-07

This is a shortlist for Bowbert's next audio pass. Files under
`refs/audio-sfx-candidates/uproot/` are copied from `/home/simpx/uproot` for
audition only. They are not promoted into `assets/audio/sfx/game/` yet.

Audition page: `refs/audio-sfx-candidates.html`

## Current Baseline

Bowbert already includes Uproot's final game SFX pack under
`assets/audio/sfx/game/`.

Important Uproot rule: use purpose-built samples for their mapped event. Do not
fill missing events with unrelated foley just because a file exists.

Uproot rejected these for its own direction:

- `walk`: Kenney footstep candidates.
- `dodge_or_rustle`: Kenney cloth candidates.
- `arrow_flyby`: noisy arrow whoosh.

For Bowbert, the same assets can still be auditioned because our game has a
different character feel, but they should start as low-confidence candidates.

## Recommended First Mapping

| Bowbert event | First pick | Why |
| --- | --- | --- |
| `walk_soft_1/2` | `sfx_step_grass_l.flac` / `sfx_step_grass_r.flac` | Real grass steps, trimmed and mixed very low so walking does not dominate combat. |
| `shroom_hit` | `external/extracted/water-slime/slime_12.ogg` | Soft slime pop; less gun-like than the previous break-crunch transient. |
| `shroom_death` | `external/extracted/rpg80/creature_slime_03.ogg` | Fuller slime cue for death, still softer than hard crunch. |
| `player_damage_soft` | `external/pop2.wav` | Very short pop for player damage; avoids the old hard actor-hit sound. |
| `spore_break` | `spore_break_current_sand_or_rock.ogg` | Current cue is very short and readable. |
| `spore_break_alt` | `spore_break_hard_dirt.wav` | Slightly fuller pop if current cue feels too tiny. |
| `dodge` | `dodge_cloth_2.ogg` | Shorter and cleaner than `cloth_1`; should survive pitch/volume variation. |
| `dodge_alt` | `dodge_drop_leather.ogg` | More tactile body movement, less whoosh. |
| `room_clear` | `reward_complete_task.mp3` | Clear completion cue; may need lower volume to avoid UI-game mismatch. |
| `pickup_reward` | `reward_pickup.ogg` | Already approved in Uproot; light and unobtrusive. |

## Local Candidates

### Runtime Replacements

| Event | Runtime file | Source candidate | Source | License | Notes |
| --- | --- | --- | --- | --- | --- |
| `walk_soft_1` | `assets/audio/sfx/game/walk_soft_1.ogg` | `external/sfx_step_grass_l.flac` | Grass Foot Step Sounds (Yo Frankie!), Blender Foundation / Lamoot | CC-BY 3.0 | Trimmed to 0.24s and mixed low. |
| `walk_soft_2` | `assets/audio/sfx/game/walk_soft_2.ogg` | `external/sfx_step_grass_r.flac` | Grass Foot Step Sounds (Yo Frankie!), Blender Foundation / Lamoot | CC-BY 3.0 | Trimmed to 0.24s and mixed low. |
| `shroom_hit` | `assets/audio/sfx/game/shroom_hit.wav` | `external/extracted/water-slime/slime_12.ogg` | 40 CC0 water / splash / slime SFX, rubberduck | CC0 | Replaces the harder break-crunch cue. |
| `shroom_death` | `assets/audio/sfx/game/shroom_death.wav` | `external/extracted/rpg80/creature_slime_03.ogg` | 80 CC0 RPG SFX, rubberduck | CC0 | Fuller than normal hit but still soft. |
| `player_damage_soft` | `assets/audio/sfx/game/player_damage_soft.wav` | `external/pop2.wav` | Pop sounds, EZduzziteh | CC0 | Very short player damage cue. |

### Mushroom Hit

| File | Duration | Source | License | Notes |
| --- | ---: | --- | --- | --- |
| `mushroom_hit_break_crunch_01.flac` | 0.811s | OpenGameArt CC0 Sounds Library, ETTiNGRiNDER | CC0 | Best first pick for arrow hitting mushroom. Trim front/tail if needed. |
| `mushroom_hit_break_crunch_04.flac` | 0.811s | OpenGameArt CC0 Sounds Library, ETTiNGRiNDER | CC0 | Similar, good alternate or death hit. |
| `mushroom_hit_current_actor.wav` | 0.604s | Trimmed Uproot game asset from break crunch | CC0 | Already runtime-ready. |
| `mushroom_hit_wet_squish_07.flac` | 0.524s | OpenGameArt CC0 Sounds Library, ETTiNGRiNDER | CC0 | Good only as quiet body layer/death; too wet for every arrow hit. |
| `mushroom_hit_wet_squish_08.flac` | 0.654s | OpenGameArt CC0 Sounds Library, ETTiNGRiNDER | CC0 | Same role, slightly longer. |
| `mushroom_hit_cucumber_crunch_1.ogg` | 0.899s | OpenGameArt Crunch Sounds - Cucumber, cogitollc | CC0 | Reads edible/biting; probably wrong for main hit. |
| `mushroom_hit_cucumber_crunch_4.ogg` | 0.710s | OpenGameArt Crunch Sounds - Cucumber, cogitollc | CC0 | Shorter, still food-like. |

### Dodge / Roll

| File | Duration | Source | License | Notes |
| --- | ---: | --- | --- | --- |
| `dodge_cloth_2.ogg` | 0.415s | Kenney RPG Audio | CC0 | First local candidate. Needs low volume and pitch variation. |
| `dodge_cloth_1.ogg` | 0.661s | Kenney RPG Audio | CC0 | Longer rustle; may feel sluggish. |
| `dodge_drop_leather.ogg` | 0.415s | Kenney RPG Audio | CC0 | Good tactile alternate for goo/body movement. |
| `dodge_footstep_00.ogg` | 0.249s | Kenney RPG Audio | CC0 | Maybe use as landing tick, not the full dodge. |
| `dodge_footstep_03.ogg` | 0.269s | Kenney RPG Audio | CC0 | Same. |

### Spore / Projectile / Reward

| File | Duration | Source | License | Notes |
| --- | ---: | --- | --- | --- |
| `spore_break_current_sand_or_rock.ogg` | 0.109s | 75 CC0 breaking/falling/hit SFX, rubberduck | CC0 | Current spore break cue. Very short. |
| `spore_break_hard_dirt.wav` | 0.220s | Freesound CC0 arrow target, curated by Uproot | CC0 | Fuller spore break candidate. |
| `spore_break_harder_dirt.mp3` | 0.418s | Freesound CC0 arrow impact, curated by Uproot | CC0 | Heavier; can be too hard for spores. |
| `reward_pickup.ogg` | 0.325s | OpenGameArt Pickup/plastic Sound, Vinrax | CC-BY 3.0 | Good pickup/reward tick. |
| `reward_complete_task.mp3` | 0.731s | OpenGameArt Completion Sound, Brandon Morris | CC0 or OGA-BY 3.0 | Candidate for room clear. |
| `reward_bing_1.wav` | 0.720s | OpenGameArt Metal Impact Sounds, BMacZero | CC0 | More magical/metallic; probably too sharp. |
| `ui_keys_01.ogg` | 0.410s | OpenGameArt 100 CC0 metal and wood SFX, rubberduck | CC0 | UI/inventory candidate, not combat. |

## External Search Leads

These are not copied into the repo yet. They are worth checking if Uproot's
local pool is not enough.

- Kenney RPG Audio: CC0, 50 files, already represented by local cloth/footstep
  candidates.
- OpenGameArt Squish Sounds Effects: CC0; useful if mushroom hit needs a cleaner
  squish set than the current wet candidates.
- OpenGameArt 8 wet squish/slurp impacts: CC0; useful for shroom death, but likely
  too wet/gross for every hit.
- OpenGameArt Swishes Sound Pack: has swish sounds that may fit dodge better than
  Kenney cloth, but check license before bundling.
- OpenGameArt 80 CC0 RPG SFX / 80 CC0 creature SFX: possible source for slime,
  creature hurt, room magic, and future enemies.

## Source URLs

- OpenGameArt Grass Foot Step Sounds (Yo Frankie!): https://opengameart.org/content/grass-foot-step-sounds-yo-frankie
- OpenGameArt 40 CC0 water / splash / slime SFX: https://opengameart.org/content/40-cc0-water-splash-slime-sfx
- OpenGameArt 80 CC0 RPG SFX: https://opengameart.org/content/80-cc0-rpg-sfx
- OpenGameArt Pop sounds: https://opengameart.org/content/pop-sounds-0
- Kenney RPG Audio: https://kenney.nl/assets/rpg-audio
- OpenGameArt Crunch Sounds - Cucumber: https://opengameart.org/content/crunch-sounds-cucumber
- OpenGameArt CC0 Sounds Library: https://opengameart.org/content/cc0-sounds-library
- OpenGameArt 75 CC0 breaking/falling/hit SFX: https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx
- OpenGameArt Pickup/plastic Sound: https://opengameart.org/content/pickupplastic-sound
- OpenGameArt Completion Sound: https://opengameart.org/content/completion-sound
- OpenGameArt Metal Impact Sounds: https://opengameart.org/content/metal-impact-sounds
- OpenGameArt 100 CC0 metal and wood SFX: https://opengameart.org/content/100-cc0-metal-and-wood-sfx
- OpenGameArt Squish Sounds Effects: https://opengameart.org/content/squish-sounds-effects
- OpenGameArt 8 wet squish/slurp impacts: https://opengameart.org/content/8-wet-squish-slurp-impacts
- OpenGameArt Swishes Sound Pack: https://opengameart.org/content/swishes-sound-pack
- OpenGameArt 80 CC0 RPG SFX: https://opengameart.org/content/80-cc0-rpg-sfx
- OpenGameArt 80 CC0 creature SFX: https://opengameart.org/content/80-cc0-creature-sfx
