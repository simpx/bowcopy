---
status: rigged
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
openItems:
  - INTEGRATED (kit + workbench slot + /?encounter=hexbrim). Review aids: 强制弹幕/咒术/波环/传送/分身 buttons; Bowbert card has 变羊4秒. Status stays rigged pending human review.
  - Boss HP 64 / cadence / phase thresholds are first-pass numbers for review.
  - Boss room presentation (intro beat, health bar?) is future gameplay work.
---

# Hexbrim

Role:
- Chapter boss. A haunted witch outfit — pointed hat floating above a billowing cloak with NOTHING inside. No body, no face, no eyes (rig has no gaze section by design; expression is carried by hover/sway motion and effects).

Behavior (kit `hexbrimKit`, mechanics modeled on Hades II's first-chapter headmistress fight):
- float: hovers keeping mid-range, orbiting Bowbert.
- volley: telegraphed fan of 5 magic bolts (7 in phase 3) via the enemy dart system (black-ink style).
- hexcast: a polymorph circle blooms under Bowbert (0.95s) and detonates — caught inside, Bowbert IS the sheep (Sheepbert form, 4s: no bow, 55% speed, tumble intact; i-frames dodge it). Phase 3 casts two.
- teleport: vanishes into a portal (invulnerable), reappears away from Bowbert.
- ring: a telegraphed shockwave ring expands from the boss (damage on edge contact; dodge through it). Phase 3 fires ring pairs.
- clones (at 66% AND 33% hp): splits into the real boss + 2 identical 1-HP illusions; illusions volley too and dispel in one hit; killing the boss dispels all.
- Phase 3 (hp <= 33%): faster float cadence, wider volleys, double hexcast.

Visual target:
- Locked reference (v2, flat doodle per review): chunky flat purple hat with crescent buckle + plain blue cloak, void between; rejected realistic v1 kept in source/.

Decomposition:
- base.png: the complete outfit, transparent background. No attachments, no eye whites.
- No runtime eyes (docs/studio/eyes.md 无眼角色): rig omits `gaze`.
- Runtime motion: hover bob + sway tilt (cloak billows via squash), vanish/appear alpha.
- Runtime VFX: shared portal module for teleports and clone splits; hex telegraph = growing swirl circle; volley bolts are enemy darts; bursts for hits/dispels/death.

Reuse: portal module, enemy dart system, particleBurst, feedback pulses.
