---
name: generate2dcharacter
description: Create or continue Bowbert project character asset folders from locked visual references using precise image-generation prompts, fixed base art, runtime black gaze layers, procedural motion rigs, and tuning previews. Use when Codex needs to generate, migrate, split, rig, tune, preview, audit, or integrate a Bowbert playable character, enemy, projectile-owning creature, procedural-expression actor, or runtime-animated doodle-style actor under assets/characters in the Bowbert mobile roguelike project.
---

# Generate 2D Character

Use this skill for Bowbert, this repo's top-down doodle-style mobile roguelike. It turns a visual brief or reference image into a reusable, self-contained character folder that matches Bowbert's current runtime: fixed AI/base images, runtime eyes, procedural squash/stretch, bob, tilt, projectiles, and VFX.

Treat each `assets/characters/<character-id>/` directory as the source of truth. Do not create a separate project-level `refs/` tree for new character work; place source references inside the character folder or symlink them there. Existing repo references under `refs/asset-crops` and legacy assets under `assets/enemies`, `assets/characters`, `assets/weapons`, and `assets/audio` may be copied into the character folder for provenance.

## Core Rule

Reference lock before generating. If the user provides or confirms a reference image, use image-to-image or tightly reference-bound generation. Treat the reference silhouette, palette, posture, and focal features as the target.

For Bowbert embedded-eye characters, `base.png` contains the final white eye sockets/eye whites as part of the fixed body art. Runtime gaze owns the black changing layer: pupils, cut-ellipse fills, spirals, hit marks, or other expression fills. Preserve the reference's eye-white silhouette, including slanted or embedded socket shapes. Use the attached-eye workflow only for characters such as Bowbert, where the whole eye assembly intentionally sits over the body edge.

This is not a generic sprite-sheet workflow. Bowbert animation is mostly runtime procedural motion over clean base images. Do not generate walk/attack frame sheets unless the user explicitly changes the runtime plan. Walking "duang duang" elasticity, idle squash, hit squash, dodge stretch, bow recoil, spore charge, and comet trails are rig data in `rig.json`.

If raster generation is unavailable, still complete the character folder: copy references, write exact image-generation prompt packets in `brief.md`, and mark unmade files as open items. Do not pretend an asset exists. Unknown or unconfirmed fields stay empty/null and are listed as open items.

## Parameters

Infer these from the user request and current character folder:

- `character_id`: folder slug under `assets/characters/`.
- `role`: `player` | `enemy` | `boss` | `npc` | `projectile-owner` | `prop-actor`.
- `behavior_pattern`: `bowbert-player` | `dart-goober` | `spore-mushroom` | `hopper` | `bomb` | `ghost` | `project-enemy`.
- `reference_mode`: `user-sketch` | `video-crop` | `accepted-generated` | `local-file` | `none`.
- `eye_workflow`: `attached-eye-pupils` | `embedded-eye-pupils` | `baked-static-eyes` | `none`.
- `asset_targets`: `base`, `attachments`, `projectiles`, `vfx`, `audio`.
- `runtime_states`: `idle`, `walk`, `aim`, `attack`, `charge`, `release`, `hit`, `dodge`, `death`, `dizzy`.
- `status`: one of the allowed `brief.md` statuses below.

## Agent Rules

- Decide the asset plan yourself from the reference, behavior pattern, and current folder. Ask only when the missing choice changes art direction or gameplay role.
- Treat generated bitmap art as a candidate until it passes side-by-side reference review and layer-contract QC.
- Use built-in image generation for creative bitmap body, attachment, projectile, and reusable effect cores. Use Canvas/SVG/PIL/procedural code for runtime eyes, branch bow, debug previews, deterministic cleanup, comparison sheets, and VFX.
- Make local references visible with `view_image` before image generation. Path strings are provenance, not visual input.
- Keep prompt writing separate from QC. Prompts describe the target positively; QC decides whether a result can be accepted.
- Keep changing gameplay feedback in runtime data: gaze fills, squash/stretch, recoil, trails, particles, projectile motion, hit flash, and attack timing.
- Store every confirmed runtime value in `rig.json`; leave unknowns as `null` and list them as open items.
- Build focused tuning pages. Expose eye position/type/size/angle, motion elasticity, attachment placement, projectile origin, and trail behavior before exposing raw internal fields.

## Folder Contract

Create one folder per character:

```text
assets/characters/<character-id>/
  brief.md
  rig.json
  tuning.html
  comparison.png
  base.png
  base-source.png
  source/
  attachments/
  projectiles/
  vfx/
  audio/
    candidates/
    selected/
  exports/
```

Required while work is in progress:

- `brief.md`: status, locked reference, design intent, decomposition, open items.
- `rig.json`: runtime assembly parameters. Use `null` for unknown values.
- `source/`: reference screenshots, user sketches, prompt notes, video crops, or symlinks to existing references.

Optional until confirmed:

- `base.png`, `attachments/*`, `projectiles/*`, `audio/*`, `comparison.png`, `tuning.html`.

Do not add `manifest.json` unless the repo already requires it. The directory shape and `brief.md` are the manifest. If the repo has older folders such as `assets/enemies/<id>/`, copy or symlink accepted assets into the character folder when migrating and note legacy paths in `brief.md`.

## Scaffold

Run the scaffold script for new folders:

```bash
python ~/.codex/skills/generate2dcharacter/scripts/init_character.py \
  --root assets/characters \
  --id red-shroom \
  --kind enemy \
  --name "Red Shroom" \
  --pattern spore-mushroom \
  --reference refs/asset-crops/enemies/red_shroom_reference.png \
  --reference refs/asset-crops/effects/red_shroom_spore_core_reference.png
```

The script creates the folder, starter `brief.md`, starter `rig.json`, and a minimal `tuning.html`.

Pattern choices are Bowbert-specific: `bowbert-player`, `dart-goober`, `spore-mushroom`, and `project-enemy`.

## Reference Files

- Read `references/prompt-rules.md` before writing prompt packets or asking for image generation.
- Read `references/qc-failures.md` before accepting generated art, marking a folder `tuned`/`done`, or deciding whether to regenerate.
- Read `references/bowbert-runtime.md` before filling non-null `rig.json` runtime values.
- Read `references/quality-rubric.md` before presenting a character folder as ready.

## Workflow

1. Collect the brief.
   - Identify role: playable, enemy, NPC, boss, projectile, prop-actor.
   - Identify Bowbert behavior: bow player, ranged goober, spore mushroom, hopper/slime, bomb, ghost, support, boss.
   - Copy or symlink references into `source/`.

2. Lock the reference.
   - Put the confirmed reference path in `brief.md`.
   - Make local image references visible with `view_image` before asking for image generation; do not rely on a path string as the visual input.
   - If no reference is confirmed, mark status as `brief` and stop before final asset generation.

3. Decompose the asset.
   - `base`: fixed body image. For embedded-eye enemies, this includes the final white eye sockets/eye whites, but not the black runtime gaze fill.
   - `attachments`: Bowbert bow, attached/edge-mounted eyes, hats, hands, props, shells, caps, or other independently positioned art. Embedded eye whites belong in `base`.
   - `projectiles`: spores, darts, bombs, slime droplets, bullets.
   - `runtime`: gaze, expression templates, squash/stretch, bob, velocity tilt, recoil, dodge stretch, hit flash, death, trail, particles, shadow, hitbox.
   - Separate reusable effects from the body. A mushroom that fires spores needs a body base and a spore projectile base; moving trails belong to runtime VFX.
   - Keep detached FX/projectiles separate from body assets. This mirrors `$generate2dsprite`'s body/FX split, but for Bowbert runtime layering instead of sprite sheets.

4. Generate images.
   - Read `references/prompt-rules.md` before writing prompt packets or calling image generation.
   - Use the imagegen workflow for bitmap creation when needed.
   - Prefer image-to-image using locked references.
   - Generate transparent-background assets.
   - Keep body facing, tilt, scale, silhouette, colors, and material close to the locked reference.
   - Do side-by-side comparison before treating a candidate as accepted. Save that comparison as `comparison.png` once art is accepted.
   - Before generation, write a prompt packet in `brief.md` for each target file: asset path, input reference paths, layer contract, generation prompt, boundary notes, and acceptance checks.
   - Write prompts in positive, precise language. Describe the desired asset directly: shape, layer ownership, materials, colors, outline, framing, and which runtime layer will add changing details. Prefer "blank slanted white eye sockets; black cut-ellipse gaze is reserved for runtime" over long lists of unwanted features.
   - Before making new art, inspect obvious legacy candidate folders when the project has them: `assets/characters/<id>/`, `assets/enemies/<snake_id>/`, `assets/weapons/<id>/`, and related effect folders. Prefer a clean accepted image-to-image or hand-cleaned legacy asset over a direct low-resolution crop cleanup.
   - Use AI-generated or accepted bitmap art for final creative body art when a new bitmap character asset is requested. Reserve Canvas/SVG/PIL/procedural geometry for runtime eyes, branch bow, debug previews, comparison sheets, deterministic cleanup, and VFX.

5. Normalize assets.
   - Read `references/qc-failures.md` before accepting a generated candidate as `base.png`, an attachment, projectile, or effect core.
   - Use consistent transparent PNGs.
   - Crop tightly but preserve room for external eyes or protrusions.
   - Record image size and intended scale in `rig.json`.
   - Keep untrimmed/source variants as `*-source.png` when useful.
   - Treat low-resolution reference/video crop cleanup as a source or review candidate unless the user explicitly approves it as final art. It may be `base-source.png`, `exports/*`, or `needs-review`; `tuned` and `done` are reserved for runtime-ready art.
   - If runtime gaze is required, `base.png` contains the stable face structure and leaves the black changing gaze for runtime. For embedded-eye characters, `base.png` contains the final white eye sockets/eye whites in the reference-correct shape, so the black runtime gaze can be layered cleanly. If a candidate does not match that layer contract, regenerate or edit the base before rigging.
   - After creating or accepting any bitmap, update `brief.md` and `rig.json` in the same pass: set file paths, image sizes, status, remaining open items, and all copied source references.
   - Preserve Bowbert renderer readability at mobile scale. Prefer clean shapes, bold dark outlines, limited texture noise, and visible facial/gaze features over painterly detail.

6. Rig runtime behavior.
   - Store positioning and motion in `rig.json`, not in memory or chat.
   - Record eye archetype: `round-external`, `angry-embedded`, `baked-static-eyes`, or `none`.
   - Record Bowbert motion fields, not sprite frames: idle bob/squash, walk bob/squash, velocity tilt, charge squash, release squash, hit squash, dodge stretch, bow recoil, projectile origin, trail length/width/color.
   - Record projectile/VFX data: origin offset, travel time, linger time, trail width, trail color.
   - Leave unconfirmed audio as `null`.
   - For project-specific defaults and field names, read `references/bowbert-runtime.md` before filling non-null rig values.

7. Build a preview.
   - Create or update `tuning.html` inside the character folder.
   - Preview reference, base, attachments, runtime eyes, motion states, projectile/trail behavior, and copyable rig JSON.
   - Make the character folder preview sufficient to understand current progress.

   Run the deterministic audit before presenting a folder as ready:

   ```bash
   python ~/.codex/skills/generate2dcharacter/scripts/audit_character.py assets/characters/red-shroom
   ```

8. Integrate only after the asset is visually accepted.
   - Add renderer imports, simulation rules, scene event handling, room spawn selection, and SFX keys as separate deliberate steps.
   - Keep generated art and runtime rules separable.

## Prompt Packets

Write one prompt packet in `brief.md` for every generated bitmap before requesting image generation. Use the exact packet shape and target-first prompt rules in `references/prompt-rules.md`.

Keep prompt text focused on the desired layer: fixed base body, attachment, projectile core, or reusable effect core. Put rejection logic and retry decisions in `references/qc-failures.md`-style acceptance checks, not in the generation prompt itself.

## Bowbert Patterns

Read `references/bowbert-runtime.md` when tuning exact fields or copying a project precedent.

### Spore Mushroom Enemy

Use this pattern for red or purple mushroom-like enemies:

- `base.png`: fixed mushroom body with face-defining eye whites or sockets baked in. Runtime owns the black pupils, spirals, `dizzy`, `angry`, and aim expressions.
- `projectiles/spore.png`: single spore core on transparent background; trail rendering belongs to runtime VFX.
- `gaze`: usually `embedded-eye-pupils`; include `default`, `angry` or `aim`, `hit`, and `dizzy`. `dizzy` can be spiral pupils during spore release.
- `motion`: idle bob and small squash; charge squash before firing; release squash after firing; hit squash on arrow impact.
- `spores`: origin offset from body center, four-way outward pattern, travel time, linger time, trail length, trail width, trail color.
- `vfx`: comet trail only while spores move; fade or stop the trail when the spore reaches its target.

If the reference includes an attack crop, use it to infer projectile direction, count, color, and trail behavior. Generate both the body base and the reusable projectile/effect core needed by the attack.

If image generation is not available for a spore mushroom, keep any non-final body candidate as `base-source.png` or `exports/*`, document the remaining layer-contract work, and leave an open item for a clean base where runtime expression changes can layer cleanly.

### Bowbert Player

- `base.png`: front-facing body with baked white eye sockets, stable upright pose, and bow kept as a runtime attachment.
- `attachments/bow`: procedural branch bow; use project bow placement values instead of baking bow into body.
- `gaze`: `attached-eye-pupils`, `round-external`, large edge-mounted eyes.
- `motion`: use `walkSquash`, `idleSquash`, `hitSquash`, `dodgeStretch`, `walkBob`, `recoilX`, `recoilY`, `tiltVelocity`.
- `attack`: right-stick/mouse aim controls bow rotation; arrows and release effects are runtime.

### Dart Goober

- `base.png`: mask/body with baked reference-correct blank eye sockets/whites. Slanted or embedded white socket silhouettes are body art; the black cut-ellipse gaze fill is runtime.
- `gaze`: `embedded-eye-pupils`, `angry-embedded`, cut-ellipse default.
- `motion`: `idleBob`, `walkBob`, `walkSquash`, `idleSquash`, `hitScaleX`, `hitScaleY`, `walkTilt`, `velocityTilt`.
- `attack`: muzzle/charge data belongs in rig, not in the body image.

### Unknown Bowbert Enemy

- Start from `project-enemy`.
- Decide whether it is closer to goober, shroom, hopper/slime, bomb, or ghost behavior.
- Keep only the reusable body/projectile/attachment art in PNGs; put motion, timing, particles, and emotion states in rig.

## `brief.md` Shape

Use frontmatter plus concise notes:

```markdown
---
status: reference-locked
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/reference-02.png
openItems:
  - Attack sound remains unselected.
---

# Red Shroom

Role: stationary/moving spore enemy.

Visual target:
- Match the locked reference silhouette and colors.
- Preserve angry embedded eyes.

Decomposition:
- base: mushroom body with baked eye sockets.
- projectiles: red spore base.
- runtime: pupils, dizzy gaze, squash, four-way comet trail.

Prompt packets:
- TODO
```

Allowed statuses:

```text
brief
reference-locked
asset-generated
rigged
tuned
runtime-integrated
needs-review
done
```

## `rig.json` Shape

Keep it minimal and explicit. Use `null` for unknowns:

```json
{
  "id": "red-shroom",
  "kind": "enemy",
  "projectContext": "bowbert",
  "base": {
    "image": "base.png",
    "sourceImage": "base-source.png",
    "imageSize": null,
    "scale": null,
    "anchor": { "x": 0.5, "y": 0.5 },
    "hitbox": null,
    "shadow": null
  },
  "gaze": {
    "archetype": null,
    "eyes": {},
    "emotions": {}
  },
  "attachments": {},
  "projectiles": {
    "spore": {
      "image": null,
      "sourceImage": null,
      "imageSize": null,
      "scale": null
    }
  },
  "vfx": {
    "sporeTrail": {
      "mode": "comet-trail",
      "trailLength": null,
      "trailWidth": null,
      "trailColor": null
    }
  },
  "motion": {},
  "audio": {
    "hit": null,
    "death": null,
    "attack": null
  },
  "openItems": []
}
```

## Quality Bar

When auditing a completed folder, read `references/quality-rubric.md` if more detail is needed.

A character is not acceptable until:

- It matches the locked reference in silhouette, palette, posture, and focal features.
- The folder is understandable from its files alone.
- `brief.md` names what is confirmed and what is open.
- `rig.json` contains confirmed values and is backfilled for every accepted asset file.
- Preview shows reference and runtime result side by side.
- Accepted art has `comparison.png` showing locked references beside accepted runtime assets.
- Mobile scale and readability are considered.
- Source and license notes are present for non-original audio or art.
- `tuned` or `done` status means the current art can be used at runtime with no known replacement task. Folders that still track low-resolution crop replacement work stay in `needs-review`.
- Motion uses Bowbert runtime parameters instead of frame-sheet animation unless explicitly requested otherwise.
