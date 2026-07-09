---
status: rigged
kind: player-form
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
openItems:
  - Tune sheep waddle feel and hex duration alongside Hexbrim balancing.
  - Decide whether i-frames should also dodge the hex circle edge cases.
---

# Sheepbert

Role:
- Not an enemy: Bowbert's polymorphed form while Hexbrim's sheep hex is active (the Hades II homage, 1:1 per review). Rendered by BowbertRenderer when `state.hexedMs > 0`.

Behavior (owned by BowbertPlayerModel):
- While hexed: cannot draw the bow, moves at 55% speed, can still tumble-dodge (i-frames intact); form expires after the hex duration (~4s).
- Getting hexed while i-framed is ignored (dodge through the circle).

Visual target:
- Locked reference: round fluffy sheep in Bowbert's green leaf hood with the little red flag — unmistakably still our hero, just... wool.

Decomposition:
- base.png: complete sheep with baked white eye sockets, transparent background.
- Runtime eyes: standard template (scared while hexed reads great), fit IoU per pipeline.
- Runtime motion: waddle bob/squash via the player renderer's existing channels.
