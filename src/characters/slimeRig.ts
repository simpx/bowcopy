export const SLIME_RIG = {
  id: 'slime',
  base: {
    textureKey: 'slime-base',
    imageAsset: 'assets/characters/slime/base.png',
    imageSize: { width: 1254, height: 1254 },
    scale: 0.105,
    y: -15,
    shadow: { width: 74, height: 15, y: 22 },
    hitboxRadius: 35
  },
  gaze: {
    eyes: {
      left: { x: 0.36, y: 0.462, radiusX: 0.032, radiusY: 0.036, rotation: -0.12 },
      right: { x: 0.642, y: 0.462, radiusX: 0.032, radiusY: 0.036, rotation: 0.12 }
    },
    pupilOffsetScale: { x: 0.018, y: 0.012 }
  },
  motion: {
    idleWobble: 0.025,
    idleBob: 1.7,
    preJumpSquash: 0.22,
    airStretch: 0.18,
    landingSquash: 0.2,
    hitScaleX: 0.1,
    hitScaleY: 0.08,
    jumpHeight: 34,
    jumpDurationMs: 720,
    recoverMs: 260
  }
} as const;
