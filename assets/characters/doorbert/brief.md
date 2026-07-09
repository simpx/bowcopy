---
status: rigged
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
  - source/candidate-02.png
openItems:
  - INTEGRATED (kit + workbench slot + /?encounter=doorbert). Review aids: 强制开门 button; keylets chase the cursor. Status stays rigged pending human workbench review.
  - Keylet (the spawned minion) is a second character folder in the same kit (slime-parent -> slime precedent); design it after the door is locked.
  - Portal effect is a shared VFX module (doorbert spawns + switcheroo endpoints); design its palette once.
  - Tune spawn interval, keylets per burst, and alive cap after integration.
---

# Doorbert

Role:
- Stationary spawner: a possessed standing door that never chases — it periodically creaks open and lets keylets out. The room pressure keeps rising until the player deals with the source.

Behavior (new `spawner` pattern):
- rooted: never moves from its spawn point; idle breathing wobble; watches the player.
- creak (telegraph ~0.8s): the door shivers, the keyhole glows, and a small swirling black PORTAL tears open beside the door (runtime-drawn effect — the door itself never opens; decided 2026-07-08, keeps base.png a single simple reusable image).
- spawn burst: 1–2 random normal minions come out (spooper ghosts or dart goobers, per-burst random; keylets retired from combat per review) of the portal with spawn poofs; alive cap ~4 — at cap the portal fizzles empty.
- portal close + stagger: the portal collapses; the door sags with a squash, briefly dizzy.
- Damage gate (decided 2026-07-08): the door is ONLY damageable while its portal is open (telegraph through stagger); otherwise arrows thunk off with wall-hit feedback. Keylets outlive their door.

Keylet (same kit, own folder later):
- Tiny 1-HP critter, simple chase + contact-bite, dies in one hit with a satisfying pop. Visual: a splinter/keyhole gremlin echoing the door's palette.

Integration notes (slime-parent precedent, fully kit-local):
- Parent-spawns-children inside one kit already exists (slime kit) — the door kit owns both sims and renderers; no cross-kit spawn service needed.
- Kit `src/game/enemies/doorbertKit.ts`; encounter kind `doorbert`; encounter formula spawns 1 door (maybe 2 in late waves).
- Room-theme mapping suggestion: boss/stone rooms.

Visual target (pre-reference direction):
- A slightly leaning old wooden door in its frame, standing free like a monolith, thick doodle outline; dark keyhole; the frame top carries the baked eye whites (eyes on the frame read better than on the moving leaf).
- State changes come from eyes + external effects only (project principle, 2026-07-08): the closed door IS the whole base image, forever.

Decomposition:
- base.png: the complete closed door (frame + leaf + keyhole) with baked blank white eye sockets, transparent background. No attachment layers.
- Runtime eyes: standard template (scared when player is close, dizzy during stagger, default otherwise).
- Runtime motion: breathing wobble, creak shiver, sag squash. No leaf animation.
- Runtime VFX: keyhole glow (chargeGlow pattern), the spawn PORTAL — a runtime-drawn swirling black vortex beside the door (build as a REUSABLE module alongside particleBurst; switcheroo's swap endpoints use the same portal language) — spawn poofs, dust on collapse.

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
