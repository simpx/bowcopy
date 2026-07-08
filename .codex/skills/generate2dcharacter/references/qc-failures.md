# Bowbert Character QC Failures

Use this file before accepting generated art, marking a folder `tuned`/`done`, or deciding whether to regenerate. These checks are not generation prompts. Keep them in review notes, acceptance checks, or open items.

## Decision Rule

Accept a candidate only when it satisfies the locked reference, the layer contract, runtime readability, and folder self-description. If a candidate is visually useful but not runtime-ready, save it as `base-source.png` or under `exports/`, document the issue in `brief.md`, and keep the folder out of `tuned`/`done`.

## Reference Match Failures

- Silhouette, posture, palette, material language, or focal features drift away from the locked reference.
- Body tilt, facing, or perspective changes the character's intended runtime pose.
- Key identity markers become too small to read at mobile scale.
- The generated asset looks like a new interpretation instead of the same character.

## Layer Contract Failures

- A player body base includes the bow, weapon swing, projectile, attack flash, or other runtime-mounted gameplay feedback.
- A mushroom body base includes spores, comet trails, smoke clouds, projectile motion, or release effects.
- A Goober or embedded-eye enemy base includes black baked pupils, baked angry fills, baked spirals, or baked hit marks when runtime gaze is required.
- A projectile core includes its full travel trail, impact cloud, or timed animation instead of a reusable core.
- An attachment is fused into the body when it needs independent runtime placement.

## Eye Workflow Failures

- `eye_workflow` is not recorded in `rig.json` or `brief.md`.
- Embedded-eye characters lack clean blank white sockets/eye whites in `base.png`.
- Attached-eye characters have eye assemblies that cannot be moved, scaled, or tuned separately when the design expects edge-mounted eyes.
- Runtime black gaze cannot be layered cleanly because the base already contains expression fills or noisy shadows inside the sockets.
- Default, aim/angry, hit, or dizzy expressions are required by behavior but missing from tuning preview.

## Runtime Motion Failures

- Walk, idle, attack, charge, or hit response is delivered as a generated sprite sheet while the Bowbert runtime expects squash/stretch, bob, tilt, recoil, and VFX parameters.
- Projectile origin, trail color, travel timing, linger timing, or attack anticipation is shown in art but missing from `rig.json`.
- Bow recoil, spore release, muzzle charge, or hit squash exists only in the preview code and is not stored in `rig.json`.

## Image Quality Failures

- Final asset is a low-resolution crop treated as production art without user approval.
- Transparent PNG has rough edges, unwanted background pixels, heavy compression artifacts, or noisy texture that hurts mobile readability.
- Crop removes needed padding for protrusions, attached eyes, hats, weapons, caps, or runtime effects.
- Character scale is inconsistent with Bowbert, Goober, Shroom, or the intended enemy class.

## Folder And Rig Failures

- `brief.md` does not name the locked reference, decomposition, prompt packets, and open items.
- `rig.json` points to missing files or leaves accepted asset paths/image sizes as `null`.
- Confirmed audio, projectile, attachment, or motion values live only in chat or preview code.
- `comparison.png` is missing after art is accepted.
- `tuning.html` cannot preview the relevant runtime states for the character behavior.

## Retry Guidance

- For reference drift, regenerate with tighter image-to-image reference language and fewer creative additions.
- For layer contract failures, rewrite the prompt packet around the correct layer ownership, then regenerate or edit the candidate.
- For eye workflow failures, fix the base before tuning runtime pupils or expressions.
- For runtime data gaps, update `rig.json` before marking the asset `tuned`.
- For mobile readability issues, simplify shape language, increase contrast, reduce texture noise, and compare at gameplay scale.
