---
status: asset-generated
kind: reward-ui-icon-set
projectContext: bowbert
runtimeBridge: ../../../src/data/sigilKit.ts
sourceReferences:
  - ../../../refs/video-notes.md
  - ../../../docs/replication-plan.md
  - ../../../refs/keyframes/0990_sigils.jpg
openItems:
  - Wizard-room reward choice UI is not implemented yet.
  - Gameplay effects are planned data only; no sigil simulation is wired yet.
---

# Silly Sigils

Role: reusable wizard-room power-up icon/card set.

Visual target:
- Runtime SVG icons in Bowbert's doodle style: thick black outlines, simple silhouettes, limited colors, readable at mobile size.
- Cards should feel magical but still quiet enough not to cover the combat room during normal play.
- Icons should communicate behavior quickly: extra arrows, speed, piercing, random arrows, no-op, peaceful rooms, and hat cosmetics.

Current set:
- Triple Shot: three arrows, longer cooldown.
- Zoomsters: higher speed, lower max hearts.
- Piercer: arrows pierce, charging slows movement when charge returns.
- Arrow Fringe: extra random arrow on shoot.
- Useless: no effect.
- Peaceful: chance for empty rooms.
- Silly Hatter: cosmetic hat.

Layer contract:
- `rig.json` owns card style, icon palette, ids, copy, effects, and future gameplay hooks.
- `tuning.html` renders all icons/cards directly from the rig.
- `src/data/sigilKit.ts` imports the rig for future runtime use.
