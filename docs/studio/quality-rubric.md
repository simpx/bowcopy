# Generate 2D Character Quality Rubric

Use this rubric when auditing a Bowbert character folder.

## Reference Match

- The locked reference path exists inside the character folder.
- The base asset follows the same silhouette, posture, palette, and focal features.
- Differences are documented in `brief.md`; accidental creative drift is not accepted.
- `brief.md` contains prompt packets for every generated or planned bitmap.
- Prompt packets use reference-bound language, positive layer contracts, and acceptance checks from `prompt-rules.md`.

## Folder Self-Description

- `brief.md` frontmatter includes `projectContext: bowbert`.
- `brief.md` explains role, visual target, decomposition, and open items.
- `brief.md` lists every copied `source/reference-*` file.
- `rig.json` exists and contains only confirmed or null values.
- `rig.json` includes `"projectContext": "bowbert"` or the brief clearly marks the folder as Bowbert-only.
- Accepted bitmap files are reflected in `rig.json` with paths and image sizes.
- Unknown audio, motion, and attachment values are null or listed as open items.
- The folder can be understood without chat history.

## Runtime Readiness

- Base image has a transparent background.
- Image dimensions, scale, anchor, shadow, and hitbox are recorded when known.
- Eye archetype is identified or left null.
- Projectiles and attachments have their own files and rig entries when confirmed.
- A tuning page shows reference, base, and rig.
- Bowbert runtime motion is represented as squash/stretch, bob, tilt, recoil, charge/release, hit, projectile origin, and VFX data, not as sprite-sheet frames.
- The workbench focus page and `npm run studio:capture -- <id>` show the character's relevant project states: idle/walk for moving actors, charge/release for attackers, dizzy for shrooms, recoil/bow for Bowbert.

## Spore Mushroom Check

- Body, spore core, and spore trail are treated as separate concerns.
- The body is not the only output when attack/effect references exist.
- Runtime gaze includes a dizzy option for spore release when the reference shows spiral/dizzy eyes.
- If runtime gaze is required, accepted `base.png` does not contain baked pupils or spiral pupils.
- Spore core art has no baked comet trail.
- Trail behavior is represented as runtime data: burst pattern, travel time, linger time, trail length, width, color, and fade/stop behavior.

## Bowbert Player Check

- Body base is front-facing, upright, and has no baked bow.
- Runtime eyes are large and edge-mounted, with tunable pupil position.
- Bow is procedural or an attachment with placement values; it rotates around the player.
- Motion includes `walkSquash`, `idleSquash`, `hitSquash`, `dodgeStretch`, `walkBob`, `recoilX`, `recoilY`, and `tiltVelocity`.

## Goober Check

- Embedded Goober eye whites/sockets are baked into the base in the reference-correct shape; runtime pupils/cut-ellipse expressions remain tunable.
- Motion includes bob, walk squash, idle squash, hit scale, and tilt.
- Attack muzzle/charge values are rig data and are not baked into the body image.

## Common Failures

Read `qc-failures.md` for the detailed rejection list. Common examples:

- Free-styled generation that ignores the locked reference.
- Baked pupils when runtime gaze is required.
- Weapon or attachment baked into the body when it should be runtime-mounted.
- Manifest files duplicating what the directory already says.
- Filled-in fake audio, hitbox, or animation values.
- A TODO-only prompt packet when references are available.
- Accepted PNG files while `rig.json` still points to null image paths.
- A low-resolution reference crop treated as final clean art without noting the limitation.
- A generated walk/run/attack sprite sheet when Bowbert runtime procedural motion was expected.
- A body image with baked projectile, baked trail, baked bow, or baked attack effects.
