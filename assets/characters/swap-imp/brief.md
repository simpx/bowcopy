---
status: brief
kind: enemy
projectContext: bowbert
lockedReference: null
sourceReferences: []
openItems:
  - Concept art candidates needed in source/; lock one reference to advance.
  - Tune swap cadence, telegraph duration, player-priority weight, and swap radius after integration.
  - Decide whether a failed target search dashes (blink) or skips the turn.
---

# Swap Imp

Role:
- Disruptor: a mischievous imp that periodically swaps positions with someone in range — repositioning Bowbert into danger is its whole attack.

Behavior (new `swap` pattern):
- skitter: nervous short darts, keeps middle distance, never approaches directly.
- windup (telegraph ~0.6s): both ends of the swap are marked — the imp flashes and the chosen target gets a matching marker, giving the player a beat to react.
- swap: instant position exchange. Target selection within radius: Bowbert weighted higher (~60%), otherwise a random sibling imp; nothing in range → short blink-dash instead.
- cooldown (~3–5s), then repeat. No contact damage in v1 — the threat is disorientation.

Integration notes (self-contained, no cross-kit services needed):
- One-encounter-at-a-time means swap targets are only Bowbert + sibling imps — all state the kit already owns (player position via services, siblings via its own sim).
- Swapping Bowbert = the kit needs to move the player once; check whether services expose a player-position setter — if not, this is the one small service addition (flag at kit-writing time).
- New sim `swap` pattern; kit `src/game/enemies/swapImpKit.ts`; encounter kind `swap-imp`.

Visual target (pre-reference direction):
- Small floating/skittering imp, rounded teardrop body, tiny limbs, one curl or antenna; purple/magenta palette to read as "trickster magic" against the earthy cast.
- Big round eye whites — the mischief is sold by the eyes.

Decomposition:
- base.png: imp body with baked blank white round eye sockets, transparent background.
- Runtime eyes: standard template (alert during windup, scared right after a swap for comedy, default otherwise).
- Runtime motion: skitter bob + tilt, windup vibrate squash, post-swap landing squash. No sprite sheets.
- Runtime VFX: twin linked bursts at both swap endpoints (particleBurst), brief afterimage at the vacated spot (reuse the ghost-afterimage pattern from BowbertRenderer dodge ghosts), matching target marker ring (pulse pattern from CombatFeedbackRenderer).

Reuse plan (checked assets/index.json):
- No projectiles needed.
- Particles: particleBurst styles; marker: feedback pulse.
- Eyes: standard template, no new expressions.

Image generation prompt packets:

### concept candidates (text-to-image, pre-lock)

Generation prompt:
> Transparent-background top-down doodle game sprite: a small mischievous purple imp enemy, rounded teardrop body hovering just off the ground, tiny nub arms, a single curled antenna, thick black outline, simple flat purple/magenta color blocking, two large blank white eye sockets baked into the face, no pupils. Bowbert project doodle style, mobile-readable silhouette, single centered character, clean edges.

Acceptance checks:
- Solid pure-white empty eye sockets, closed outlines, separated from any other light regions.
- No baked pupils, sparkles, or motion trails; symmetrical resting pose.
- Palette distinct from existing enemies (no goober wood browns, no shroom reds).
