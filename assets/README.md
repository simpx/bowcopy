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
