export const SPOOPER_GOOPER_RIG = {
  id: 'spooper-gooper',
  base: {
    scale: 1,
    y: -20,
    shadow: { width: 58, height: 12, y: 22 },
    hitboxRadius: 36
  },
  gaze: {
    eyes: {
      left: { x: -11, y: -13, radiusX: 6, radiusY: 5 },
      right: { x: 11, y: -13, radiusX: 6, radiusY: 5 }
    },
    pupilOffsetScale: { x: 3.8, y: 2.6 }
  },
  motion: {
    hoverBob: 5,
    hoverDrift: 14,
    appearMs: 360,
    visibleMs: 1100,
    attackAnticipationMs: 460,
    disappearMs: 330,
    repositionMs: 520,
    hitScaleX: 0.08,
    hitScaleY: 0.05
  }
} as const;
