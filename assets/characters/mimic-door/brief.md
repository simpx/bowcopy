---
status: brief
kind: enemy
projectContext: bowbert
lockedReference: null
sourceReferences: []
openItems:
  - Concept art candidates needed in source/; lock one reference to advance.
  - Doorling (the spawned minion) is a second character folder in the same kit (slime-parent -> slime precedent); design it after the door is locked.
  - Tune spawn interval, doorlings per burst, and alive cap after integration.
---

# Mimic Door

Role:
- Stationary spawner: a possessed standing door that never chases — it periodically creaks open and lets doorlings out. The room pressure keeps rising until the player deals with the source.

Behavior (new `spawner` pattern):
- rooted: never moves from its spawn point; idle breathing wobble; watches the player.
- creak (telegraph ~0.8s): the door leaf swings ajar, interior glow spills out, hinge shiver.
- spawn burst: 1–2 doorlings pop out with spawn poofs; alive cap ~4 — at cap it fakes out (opens, nothing comes, slams).
- slam + stagger: shuts with a squash; briefly dizzy.
- Damage gate (decided 2026-07-08): the door is ONLY damageable while open (creak/spawn/stagger windows); arrows thunk off the shut door with a wall-hit feedback. Killing it pops any doorlings still alive? No — doorlings persist and must be cleaned up separately (keeps the priority-target decision interesting).

Doorling (same kit, own folder later):
- Tiny 1-HP critter, simple chase + contact-bite, dies in one hit with a satisfying pop. Visual: a splinter/keyhole gremlin echoing the door's palette.

Integration notes (slime-parent precedent, fully kit-local):
- Parent-spawns-children inside one kit already exists (slime kit) — the door kit owns both sims and renderers; no cross-kit spawn service needed.
- Kit `src/game/enemies/mimicDoorKit.ts`; encounter kind `mimic-door`; encounter formula spawns 1 door (maybe 2 in late waves).
- Room-theme mapping suggestion: boss/stone rooms.

Visual target (pre-reference direction):
- A slightly leaning old wooden door in its frame, standing free like a monolith, thick doodle outline; dark keyhole; the frame top carries the baked eye whites (eyes on the frame read better than on the moving leaf).
- The door leaf must be a SEPARATE attachment layer (it swings open at runtime) — this is the first character to exercise the attachment-layer capability for motion.

Decomposition:
- base.png: door frame + backboard with baked blank white eye sockets on the frame top, WITHOUT the leaf, transparent background.
- leaf.png (attachment): the door leaf alone, hinge on the left edge, transparent background; runtime rotates/slides it to open.
- Runtime eyes: standard template (scared when player is close, dizzy during stagger, default otherwise).
- Runtime motion: breathing wobble, creak shiver, slam squash. Leaf motion is runtime rotation of the attachment, not baked frames.
- Runtime VFX: interior glow while open (chargeGlow pattern), spawn poofs (particleBurst), dust on slam.

Reuse plan (checked assets/index.json):
- Spawn/death particles: particleBurst styles; spawn label/pulse: CombatFeedbackRenderer patterns.
- Eyes: standard template, no new expressions.

Image generation prompt packets:

### concept candidates (text-to-image, pre-lock)

Generation prompt:
> Transparent-background top-down doodle game sprite: a spooky old standing wooden door enemy in a simple frame, slightly leaning, closed, with a dark keyhole, thick black outline, flat muted brown and grey color blocking, two large blank white eye sockets baked into the top of the door frame, no pupils. Bowbert project doodle style, mobile-readable silhouette, single centered character, clean edges.

Boundary notes:
> Keep the door leaf visually simple and rectangular so it can later be regenerated as a separate attachment layer; leave crop padding above the frame for the eyes.

Acceptance checks:
- Solid pure-white empty eye sockets on the frame, closed outlines, not merging with any highlight.
- No baked pupils, no open-door interior, no minions in frame.
- Silhouette readable at small scale; leaf region clearly delineated by outline (so the attachment cut is unambiguous).
