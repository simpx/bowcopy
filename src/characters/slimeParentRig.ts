export const SLIME_PARENT_RIG = {
  id: 'slime-parent',
  base: {
    textureKey: 'slime-parent-base',
    imageAsset: 'assets/characters/slime-parent/base.png',
    imageSize: { width: 1254, height: 1254 },
    scale: 0.148,
    y: -18,
    shadow: { width: 118, height: 19, y: 28 },
    hitboxRadius: 54
  },
  gaze: {
    eyes: {
      left: { x: 0.237, y: 0.53, radiusX: 0.052, radiusY: 0.052, rotation: 0 },
      right: { x: 0.779, y: 0.532, radiusX: 0.052, radiusY: 0.052, rotation: 0 }
    },
    pupilOffsetScale: { x: 0.018, y: 0.012 }
  },
  motion: {
    idleWobble: 0.02,
    idleBob: 1.35,
    preJumpSquash: 0.18,
    airStretch: 0.15,
    landingSquash: 0.18,
    hitScaleX: 0.09,
    hitScaleY: 0.07,
    jumpHeight: 28,
    jumpDurationMs: 880,
    recoverMs: 330
  }
} as const;
