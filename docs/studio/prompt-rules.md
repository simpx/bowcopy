# Bowbert Character Prompt Rules

Use this file before writing prompt packets or requesting image generation for `$generate2dcharacter`.

## Prompt Principles

- Write prompts in positive, precise language.
- Describe the target asset directly: layer ownership, silhouette, posture, palette, outline, eye workflow, material language, framing, and mobile readability.
- Use image-to-image or reference-bound generation when a locked reference exists.
- Make local reference images visible with `view_image` before generation.
- Keep changing gameplay feedback in runtime: black gaze fills, pupils, spirals, projectile motion, trails, particles, squash/stretch, recoil, hit flash, and attack timing.
- Keep QC language outside the generation prompt. Acceptance checks may state what makes a candidate usable.

## Prompt Packet Shape

Use this shape inside `brief.md` for every generated bitmap:

```markdown
### base.png

Inputs:
- `source/reference-01.png`

Mode: image-to-image, high reference fidelity.

Layer contract:
- Fixed base body art.
- Embedded-eye characters include final blank white eye sockets/eye whites in the reference-correct shape.
- Runtime gaze later adds the black changing expression layer.

Generation prompt:
> Use the image just shown as the visual reference. Create a transparent-background top-down 2D game sprite for Bowbert. Preserve the locked reference silhouette, upright posture, thick doodle outline, simple color blocking, focal face structure, scale relationship, and mobile-readable shapes. Create a clean reusable base layer for runtime squash, bob, tilt, recoil, and gaze. For embedded-eye characters, bake the reference-correct blank white eye sockets into the base; keep the black gaze/expression layer reserved for runtime.

Boundary notes:
> Single centered character sprite, transparent background, generous padding for protrusions, clean edges, body/projectile/effect layers separated according to the layer contract.

Acceptance checks:
- Silhouette, posture, palette, and focal features match the locked reference.
- Runtime-changing black gaze/fills are reserved for runtime.
- Embedded-eye characters have reference-correct white eye sockets/eye whites baked into `base.png`; attached-eye characters document the eye attachment instead.
- Transparent PNG, tight crop with enough room for protrusions.
```

## Layer Contracts

### Base Body

Use for the stable character body.

- Contains the fixed silhouette, body colors, face structure, white eye sockets or eye whites when they are part of the character design, and stable markings.
- Runtime owns gaze fills, pupils, spirals, hit marks, squash/stretch, recoil, trails, particles, projectile motion, and timing.
- Accepted base art becomes `base.png`; keep earlier useful candidates as `base-source.png` or `exports/*`.

### Embedded-Eye Character

Use for Goober-like masks, mushroom faces, and enemies whose eyes sit inside the body shape.

- `base.png` includes final blank white eye sockets or eye whites in the reference-correct silhouette.
- Runtime draws black cut-ellipse gaze, pupils, spirals, X marks, hit squashes, or other expression fills over those whites.
- Slanted white socket shapes are fixed body art, not runtime expression art.

Prompt phrase:

```text
Bake the reference-correct blank white eye sockets into the base body. Reserve the black changing gaze and expression fills for Bowbert runtime layering.
```

### Attached-Eye Character

Use for Bowbert-like edge-mounted round eyes.

- `base.png` contains the stable body and face area.
- Eye whites may be attachments when the whole eye assembly sits over the body edge.
- Runtime pupils move inside those attached eyes.

Prompt phrase:

```text
Create the stable upright body base for the character. The large edge-mounted eye assemblies are handled as runtime attachments with tunable pupil gaze.
```

### Attachment

Use for bows, hats, props, shells, carried objects, or independently positioned parts.

- Generate a centered transparent PNG for the attachment.
- Preserve the reference style and outline thickness.
- Record anchor, offset, scale, and rotation data in `rig.json`.

Prompt phrase:

```text
Create a separate transparent-background attachment asset matching the Bowbert doodle style, centered with clean padding for runtime placement.
```

### Projectile Or Effect Core

Use for spores, darts, bombs, droplets, impact cores, and reusable VFX cores.

- Generate only the reusable core image.
- Runtime owns travel path, comet trail, smoke, sparks, linger timing, flicker, scale pulses, and fade.
- Keep projectile/effect core separate from the body asset.

Prompt phrase:

```text
Create a reusable transparent-background projectile core matching the locked reference color, outline, and simple shape language. The moving trail and timing are runtime VFX.
```

## Pattern Prompts

### Bowbert Player

Layer contract:
- Front-facing stable body base.
- Baked white eye sockets only when this version uses a body-integrated eye base; otherwise eye assemblies are attachments.
- Bow is a runtime attachment with placement and recoil values in `rig.json`.

Generation prompt:
> Use the image just shown as the visual reference. Create Bowbert's stable front-facing body base as a transparent-background top-down doodle game sprite. Preserve the round readable silhouette, orange hood, brown lower face, thick black outline, simple color blocking, and upright centered posture. Keep the body clean for runtime bow placement, eye gaze, squash, bob, recoil, and dodge stretch.

Acceptance checks:
- Body reads as the same Bowbert character at mobile scale.
- Bow is represented by runtime attachment data, not by the body base.
- Eye workflow is documented as attached-eye or embedded-eye before runtime tuning.

### Dart Goober

Layer contract:
- Mask/body base with slanted blank white sockets baked in.
- Runtime owns black cut-ellipse gaze fills and attack charge feedback.

Generation prompt:
> Use the image just shown as the visual reference. Create a transparent-background Dart Goober body sprite matching the reference mask silhouette, triangular posture, thick black outline, wood-mask color language, and slanted blank white eye sockets. Preserve the angry embedded-eye socket shape as clean white body art. Reserve the black cut-ellipse gaze and attack feedback for runtime.

Acceptance checks:
- Slanted white eye sockets match the reference and are visible in `base.png`.
- Runtime black gaze can be layered cleanly over the sockets.
- Attack muzzle and charge feedback are represented in `rig.json`.

### Spore Mushroom

Layer contract:
- Mushroom body base with face-defining eye whites or sockets baked in.
- Spore core is a separate projectile asset.
- Comet trail is runtime VFX.

Generation prompt:
> Use the image just shown as the visual reference. Create a transparent-background Bowbert mushroom enemy body sprite matching the reference cap shape, stem/body silhouette, thick doodle outline, simple color blocking, readable face structure, and mobile-scale clarity. Bake the reference-correct blank eye whites or sockets into the body. Reserve black pupils, spirals, dizzy gaze, spore projectile motion, and comet trail for runtime.

Acceptance checks:
- Body, spore core, and spore trail are represented as separate concerns.
- Dizzy gaze can be drawn by runtime during spore release.
- Spore projectile has its own prompt packet and asset when the attack is part of the character.

## Framing And Style

- Use transparent-background PNGs for final assets.
- Center the subject with enough padding for edge eyes, hats, weapons, caps, or protrusions.
- Preserve Bowbert's top-down doodle style: thick black outline, simple readable shapes, low texture noise, and strong silhouette.
- Keep tiny texture and subtle painterly detail secondary to mobile readability.
- Use `comparison.png` to show locked reference beside the accepted runtime asset.
