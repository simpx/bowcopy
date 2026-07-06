# Assets

This directory is for original/recreated game assets by default.

For MVP feasibility testing only, temporary video-crop assets may live under `assets/prototype-video-crops/`. Reference crops still live in `refs/asset-crops/`.

## Layout

```txt
assets/
  characters/
    bowbert/
  prototype-video-crops/
  weapons/
    bow/
  enemies/
    dart_goober/
    dart_tri_goober/
    red_shroom/
    purple_shroom/
    slime/
    kaboomlet/
    spooper_gooper/
  effects/
    particles/
    explosions/
  rooms/
    forest/
    stone/
    mushroom/
    wizard/
  audio/
    sfx/
      game/
  ui/
    hearts/
    sigils/
```

## Asset Policy

- Prototype video crops may be used only to validate whether a close gameplay replica is feasible.
- Keep prototype video crops isolated under `assets/prototype-video-crops/`.
- Load prototype crops through manifest keys so they can be replaced later.
- Do not ship prototype crops in a public release.
- Final assets should be recreated in our own style.
- Keep thick outlines and simple silhouettes.
- Prefer layered parts when animation can be procedural.
- Use stable, descriptive filenames.
- Add metadata when a sprite needs pivot, scale, hitbox, or animation timing.
- Keep third-party audio attribution with any copied audio pack.
- Do not add walking sounds until a purpose-built footstep set is selected.

## Character Layer Model

Characters should be split by what actually needs to move:

1. `fixed-ai-image`: the stable body art generated or recreated as a bitmap.
2. `attachments`: runtime parts that sit on the body, such as Bowbert's eyes or bow.
3. `runtime-gaze`: lightweight pupils, eye masks, or expression shapes driven by aim/emotion.
4. `motion-params`: idle, walk, attack, hit, recoil, and spawn squash/bob/tilt values.

Use attachments when a part naturally floats on top of the body. Bake it into the fixed AI image when the part must feel embedded, such as Dart Goober's blue eye sockets and white eye shapes. Runtime should then only add the gaze/expression layer.

Current layered character assets:

- `characters/bowbert/bowbert-base-ai-v2-trimmed.png`: fixed body image with baked eyes; bow is a runtime attachment.
- `characters/dart-goober/dart-goober-base-ai-v1-trimmed.png`: fixed body image with embedded eye sockets; black gaze shapes are runtime generated.

## Audio

The current gameplay SFX pack is copied from the local Uproot prototype:

- `audio/sfx/game/shoot_arrow.ogg`: player arrow release.
- `audio/sfx/game/hit_wood_board.wav`: arrow hitting wood/fence-like boundaries.
- `audio/sfx/game/hit_actor.wav`: soft actor hit feedback for goober/player damage.
- `audio/sfx/game/hit_sand_or_rock.ogg`: light boundary impact for enemy darts.

Keep `audio/sfx/game/manifest.json` and `audio/THIRD_PARTY_LICENSES.md` with the files. The Uproot pack intentionally has no approved walk sound yet, so Bowbert has no footstep audio for now.

## First Asset Batch

- Bowbert body + eyes.
- Bow relaxed / half drawn / fully drawn.
- Arrow.
- Dart Goober.
- Dart Tri Goober.
- Red Shroom.
- Purple Shroom.
- Slime.
- Kaboomlet.
- Spooper Gooper.
