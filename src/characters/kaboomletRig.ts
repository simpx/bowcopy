export const KABOOMLET_RIG = {
  id: 'kaboomlet',
  base: {
    textureKey: 'kaboomlet-base',
    imageAsset: 'assets/characters/kaboomlet/base.png',
    imageSize: { width: 1254, height: 1254 },
    scale: 0.1,
    y: -18,
    shadow: { width: 66, height: 15, y: 22 },
    hitboxRadius: 35
  },
  gaze: {
    eyes: {
      left: { x: 0.292, y: 0.563, radiusX: 0.052, radiusY: 0.048, rotation: -0.18 },
      right: { x: 0.687, y: 0.562, radiusX: 0.052, radiusY: 0.048, rotation: 0.18 }
    },
    pupilOffsetScale: { x: 0.014, y: 0.01 }
  },
  motion: {
    idleBob: 1.9,
    idleSquash: 0.018,
    chaseWobble: 0.06,
    armedPulse: 0.13,
    explosionAnticipation: 0.22,
    hitScaleX: 0.08,
    hitScaleY: 0.05
  },
  explosion: {
    radius: 92,
    countdownMs: 760,
    damage: 1
  }
} as const;
