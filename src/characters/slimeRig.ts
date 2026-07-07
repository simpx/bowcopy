export const SLIME_RIG = {
  id: 'slime',
  base: {
    scale: 1,
    y: -15,
    shadow: { width: 74, height: 15, y: 22 },
    hitboxRadius: 35
  },
  gaze: {
    eyes: {
      left: { x: -12, y: -16, radiusX: 5.5, radiusY: 5 },
      right: { x: 12, y: -16, radiusX: 5.5, radiusY: 5 }
    },
    pupilOffsetScale: { x: 3.5, y: 2.4 }
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
