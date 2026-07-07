export const KABOOMLET_RIG = {
  id: 'kaboomlet',
  base: {
    scale: 1,
    y: -18,
    shadow: { width: 66, height: 15, y: 22 },
    hitboxRadius: 35
  },
  gaze: {
    eyes: {
      left: { x: -11, y: -9, radiusX: 5.5, radiusY: 4.8, rotation: -0.18 },
      right: { x: 12, y: -9, radiusX: 5.5, radiusY: 4.8, rotation: 0.18 }
    },
    pupilOffsetScale: { x: 3, y: 2 }
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
