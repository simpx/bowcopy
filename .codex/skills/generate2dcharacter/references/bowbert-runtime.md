# Bowbert Runtime Reference

Use this reference when filling `rig.json` for this project. Bowbert does not use sprite-sheet body animation for current characters; it layers clean PNG/base assets with runtime expressions, squash/stretch, bob, tilt, recoil, projectiles, and VFX.

## Project Style

- Top-down doodle mobile roguelike.
- Large readable eyes carry emotion and aim feedback.
- Body animation is "duang duang" procedural elasticity: squash/stretch, bob, small tilt, hit flash, recoil, and charge/release pulses.
- Keep final art clean at mobile scale: bold black outlines, simple color blocks, low texture noise, no tiny unreadable detail.
- Do not bake arrows, projectile trails, hit particles, spore trails, or dodge/attack effects into body art.

## Rig Field Families

### Base

Use this shape:

```json
"base": {
  "source": "fixed-ai-image",
  "textureKey": null,
  "image": "base.png",
  "sourceImage": "base-source.png",
  "imageSize": { "width": null, "height": null },
  "scale": null,
  "anchor": { "x": 0.5, "y": 0.5 },
  "offset": { "x": 0, "y": null },
  "shadow": { "width": null, "height": null, "y": null },
  "hitbox": null
}
```

Project examples:

- Bowbert: image size `854x878`, scale `0.095`, y `-14`, shadow `64x18 y=25`.
- Dart Goober: image size `901x957`, scale `0.095`, y `-19`, shadow `58x16 y=22`.
- Red Shroom: image size `708x778`, scale `0.102`, y `-27`, shadow `72x16 y=18`.

### Gaze

Supported modes:

- `attached-eye-pupils`: large round eyes mounted over/around the body edge. Use for Bowbert.
- `embedded-eye-pupils`: eye whites/sockets baked into base, runtime pupils/spirals/cut ellipses over them. Use for goobers and shrooms.
- `baked-static-eyes`: only when runtime expression is not needed.

Common emotions:

- `default`
- `aim`
- `focused` or `angry`
- `alert`
- `hit`
- `dizzy` for shroom spore release

Emotion fields:

```json
{
  "shape": "ellipse | cut-ellipse | spiral | x",
  "eyeTiltAdd": 0,
  "eyeTiltMode": "mirrored | same",
  "eyeScaleX": 1,
  "eyeScaleY": 1,
  "pupilScale": 1,
  "pupilShiftX": 0,
  "pupilShiftY": 0,
  "cutSlope": null,
  "cutOffset": null,
  "upperLid": 0,
  "lowerLid": 0
}
```

Do not accept baked black pupils for runtime-gaze characters. Keep eye whites/sockets in base when useful, then draw black pupils, cut ellipses, spirals, and hit squashes in runtime.

### Bowbert Player Motion

Use these fields:

```json
"motion": {
  "walkSquash": 0.045,
  "idleSquash": 0.018,
  "hitSquash": 0.1,
  "dodgeStretch": 0.14,
  "walkBob": 2,
  "recoilX": 5,
  "recoilY": 3,
  "tiltVelocity": 0.06
}
```

Renderer meaning:

- `walkSquash`: body X/Y scale wave while moving.
- `idleSquash`: small breathing squash while idle.
- `hitSquash`: hit impact deformation.
- `dodgeStretch`: dash/roll stretch.
- `walkBob`: vertical bob during movement.
- `recoilX`, `recoilY`: body kick opposite aim after shooting.
- `tiltVelocity`: small velocity-based lean.

Bow placement is procedural branch bow data, not baked body art:

```json
"bow": {
  "texture": { "width": 360, "height": 420, "anchorX": 180, "anchorY": 210, "drawScale": 0.58 },
  "placement": {
    "scale": 0.22,
    "distance": 50,
    "yDistance": 40,
    "offsetX": 0,
    "offsetY": -15,
    "rotationOffsetDeg": -7,
    "drawDistance": 5,
    "releaseKick": 7,
    "recoilDistance": 8,
    "recoilY": 5
  }
}
```

### Dart Goober Motion And Attack

Use these fields:

```json
"motion": {
  "idleBob": 2,
  "walkBob": 2,
  "walkSquash": 0.065,
  "idleSquash": 0.018,
  "hitScaleX": 0.08,
  "hitScaleY": 0.04,
  "walkTilt": 0.05,
  "velocityTilt": 0.08
}
```

Attack fields:

```json
"attack": {
  "anticipation": 0.11,
  "chargeShift": 5,
  "muzzleX": 27,
  "muzzleY": -20,
  "muzzleAimY": 16,
  "muzzleRadius": 9,
  "muzzleScaleBase": 0.45,
  "muzzleScaleCharge": 0.95,
  "muzzleAlphaBase": 0.1,
  "muzzleAlphaCharge": 0.45
}
```

### Spore Mushroom Motion And VFX

Use these fields:

```json
"motion": {
  "idleBob": 2.8,
  "idleSquash": 0.02,
  "chargeSquash": 0.12,
  "releaseSquash": 0.16,
  "hitScaleX": 0.08,
  "hitScaleY": 0.05
}
```

Red shroom spore fields:

```json
"projectiles": {
  "spore": {
    "image": "projectiles/spore.png",
    "sourceImage": "projectiles/spore-source.png",
    "imageSize": { "width": 597, "height": 604 },
    "scale": 0.048,
    "originOffset": { "x": 0, "y": -31 },
    "burstPattern": "four-way-outward",
    "burstDistance": 184,
    "travelMs": 560,
    "lingerMs": 860,
    "damage": null
  }
}
```

VFX fields:

```json
"vfx": {
  "sporeTrail": {
    "mode": "comet-trail",
    "trailLength": 20,
    "trailWidth": 16,
    "trailColor": "#ff4d54",
    "fadeAfterArrivalMs": null
  }
}
```

Purple shroom can reuse the same structure with smaller squash values and purple trail color.

## Preview Requirements

`tuning.html` should show:

- locked references
- accepted base and projectile images
- runtime default/aim/hit/dizzy eyes where applicable
- idle/walk/charge/release/hit previews relevant to the character
- spore trail or projectile VFX sample when the character owns a projectile
- copyable `rig.json`

Keep controls focused. Do not expose every numeric field if the user only needs to tune eye position, expression type/size/angle/position, motion elasticity, attachments, projectile origin, or trail behavior.
