---
status: playtested
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/video-appear-reference.jpg
  - source/video-black-bullet-reference.jpg
  - source/video-black-cloud-reference.jpg
openItems:
  - Tune black projectile speed, count, spread, and trail density in gameplay.
---

# Spooper Gooper

Role:
- Bowbert project enemy.

Behavior:
- Ghost enemy: hidden, appear, hover while vulnerable, fire black ink/smoke projectiles, disappear, then reposition.
- Runtime opacity and hover sell movement. It is vulnerable while visible and cannot be hit while hidden.
- Attack is projectile-based, not contact dash based.

Visual target:
- Match the locked reference silhouette, posture, outline weight, color blocking, focal features, and scale relationship.
- Do not invent unconfirmed props, limbs, pose changes, or material changes.

Source:
- `source/reference-01.png`
- `source/video-appear-reference.jpg`
- `source/video-black-bullet-reference.jpg`
- `source/video-black-cloud-reference.jpg`

Generated candidates:
- `base.png`: promoted from `exports/base-v2-candidate.png` as the current runtime base.
- `base-source.png`: promoted from `exports/base-v2-green.png` as the retained chroma source.
- `exports/base-before-regeneration.png`: previous runtime base kept for rollback/comparison.
- `exports/base-v2-candidate.png`: regenerated Bowbert Studio base candidate with stable white sockets and no baked projectile/VFX.
- `exports/base-v2-green.png`: chroma-key source for the regenerated candidate.

Runtime evidence:
- `src/characters/spooperGooperRig.ts`: points to `assets/characters/spooper-gooper/base.png` and stores normalized eye placement.
- `src/render/enemies/SpooperGooperRenderer.ts`: loads the accepted PNG base and overlays runtime black gaze.
- `src/game/scenes/CombatRoomScene.ts`: maps boss rooms and `?encounter=spooper-gooper` debug previews to Spooper Gooper.
- `playtest/runtime-encounter.png`: browser screenshot proof that the accepted PNG base renders in the game scene.
- `../../projectiles/black-ink/`: dedicated black ink projectile package used by Spooper's attack.

Decomposition:
- base.png: generated fixed enemy body.
- attachments/: only independently positioned art such as eyes, weapon, shell, hat, or props.
- projectiles/: black ink/smoke projectile is tracked in `../../projectiles/black-ink`; no baked trail.
- vfx/: black dot trail, black cloud burst, vanish puff, and appear/disappear opacity are runtime effects.
- runtime: gaze, opacity, hover drift, appear/disappear timing, black projectile firing, trail particles, hit/death timing.

Image generation prompt packets:

### base.png

Inputs:
- `source/reference-01.png`

Mode: image-to-image, high reference fidelity.

Layer contract:
- Fixed ghost body base with stable silhouette, eye whites, lower tendrils, and thick outline.
- Runtime owns black gaze, opacity, hover, vanish/appear puffs, black ink projectile style, projectile trails, and cloud bursts.

Generation prompt:
> Transparent-background Bowbert project top-down doodle enemy sprite matching the locked reference. Preserve exact silhouette, posture, thick black outline, simple color blocking, focal face/eye features, and scale relationship. Create a clean reusable base layer for Bowbert runtime squash/stretch, bob, tilt, hit, and expression overlays.

Boundary notes:
> Single centered ghost sprite, transparent background, clean edges, Bowbert doodle style, enough crop padding for lower tendrils and opacity/hover runtime layers.

Acceptance checks:
- Silhouette and palette match the locked reference.
- Runtime-changing parts are separated when practical.
- Transparent PNG, tight crop with enough room for protrusions.

### projectiles/<name>.png

Inputs:
- TODO

Mode: image-to-image when a projectile/effect reference exists.

Layer contract:
- Black ink projectile core is optional; runtime can draw black blobs procedurally.
- Runtime owns projectile travel, black speck trail, cloud burst, fade, and timing.

Generation prompt:
> TODO

Boundary notes:
> Transparent background, clean edges, centered reusable projectile or effect core, enough padding for runtime trail/fade.

Acceptance checks:
- TODO

Runtime rig notes:
- use runtime alpha, squash, hover, black ink projectiles, and cloud bursts instead of sprite sheets.
- motion fields: hoverBob, hoverDrift, appearMs, visibleMs, attackAnticipationMs, disappearMs, repositionMs.
- projectile fields: projectileCount, spreadDeg, speed, lifetimeMs, trailDensity, cloudRadius, damage.
- renderer should preview hidden/appearing/hovering/attacking/projectile/disappearing states.

Preview notes:
- `tuning.html` should show the locked reference beside the assembled runtime result.
- Add controls only for values that are expected to be tuned by hand.
