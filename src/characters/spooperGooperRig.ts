export const SPOOPER_GOOPER_RIG = {
  id: 'spooper-gooper',
  base: {
    textureKey: 'spooper-gooper-base',
    imageAsset: 'assets/characters/spooper-gooper/base.png',
    imageSize: { width: 1254, height: 1254 },
    scale: 0.098,
    y: -20,
    shadow: { width: 58, height: 12, y: 22 },
    hitboxRadius: 36
  },
  gaze: {
    eyes: {
      left: { x: 0.276, y: 0.451, radiusX: 0.04, radiusY: 0.036, rotation: -0.2 },
      right: { x: 0.723, y: 0.451, radiusX: 0.04, radiusY: 0.036, rotation: 0.2 }
    },
    pupilOffsetScale: { x: 0.018, y: 0.012 }
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
