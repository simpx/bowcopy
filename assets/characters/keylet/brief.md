---
status: rigged
kind: enemy
projectContext: bowbert
lockedReference: source/reference-01.png
sourceReferences:
  - source/reference-01.png
openItems:
  - 2026-07-10 从战斗中退役(门怪改放普通怪);资产保留为展示位,不再有接入计划。
  - INTEGRATED inside the Doorbert kit (no own workbench slot; reviewed in the Doorbert cell). Status stays rigged pending human workbench review.
  - Tune chase speed, bite cadence, and cap alongside Doorbert encounter balancing.
---

# Keylet

Role:
- Doorbert's minion (same kit, slime-parent -> slime precedent): a tiny 1-HP key gremlin that hops out of the door's portal, chases Bowbert, and bites on contact. Dies to a single arrow with a satisfying pop; keylets outlive their door.

Behavior (owned by DoorbertSystem):
- emerging: pops out of the portal with a spawn poof.
- chase: runs at Bowbert (~96 px/s); within bite range it stops and bites on a ~0.95s cooldown (contact damage 1).

Visual target:
- Locked reference: golden key creature — round key-bow head carrying the baked white eye sockets, short shaft, key-teeth feet. Palette echoes Doorbert's keyhole (the door spits out keys).

Decomposition:
- base.png: complete key body with baked blank white eye sockets, transparent background. No attachments.
- Runtime eyes: standard template (default while chasing, hit flash on death frame).
- Runtime motion: fast walk bob + squash (seeded from slime child), no sprite sheets.
- Runtime VFX: spawn poof + death pop via particleBurst; emerges from the shared portal effect.

Reuse: standard eye template, slime-child motion seed, particleBurst styles, shared portal module.
