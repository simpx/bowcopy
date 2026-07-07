export const DART_TRI_GOOBER_RIG = {
  id: 'dart-tri-goober',
  base: {
    scale: 0.096,
    y: -18,
    shadow: { width: 62, height: 15, y: 22 }
  },
  gaze: {
    eyes: {
      left: { x: -24, y: -7, radiusX: 9, radiusY: 7, rotation: -0.56 },
      right: { x: 24, y: -7, radiusX: 9, radiusY: 7, rotation: 0.56 }
    },
    pupilOffsetScale: { x: 4.5, y: 3.1 }
  },
  motion: {
    idleBob: 2.1,
    walkBob: 2.3,
    walkSquash: 0.07,
    idleSquash: 0.018,
    hitScaleX: 0.08,
    hitScaleY: 0.04,
    walkTilt: 0.055,
    velocityTilt: 0.085
  },
  attack: {
    anticipation: 0.12,
    chargeShift: 5,
    muzzleX: 27,
    muzzleY: -20,
    muzzleAimY: 16,
    muzzleRadius: 9,
    muzzleScaleBase: 0.45,
    muzzleScaleCharge: 0.98,
    muzzleAlphaBase: 0.1,
    muzzleAlphaCharge: 0.45
  }
} as const;
