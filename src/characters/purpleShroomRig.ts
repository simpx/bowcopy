import type { RedShroomCharacterRig } from './rigSchema';

export const PURPLE_SHROOM_RIG = {
  id: 'purple-shroom',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'purple-shroom-ai-v1-base',
    imageAsset: 'assets/characters/purple-shroom/base.png',
    imageSize: { width: 856, height: 905 },
    scale: 0.089,
    y: -30,
    shadow: { width: 72, height: 16, y: 18 }
  },
  attachments: {
    eyes: {
      source: 'runtime-shape',
      role: 'runtime pupils over baked white eye sockets'
    },
    spores: {
      source: 'fixed-ai-image',
      role: 'spiky purple spore projectile with runtime comet trail'
    }
  },
  gaze: {
    mode: 'embedded-eye-pupils',
    archetype: 'angry-embedded',
    eyes: {
      left: { x: 0.161, y: 0.552, radiusX: 0.063, radiusY: 0.058, rotation: -0.03 },
      right: { x: 0.842, y: 0.552, radiusX: 0.063, radiusY: 0.058, rotation: 0.03 }
    },
    pupilOffsetScale: { x: 0.025, y: 0.017 },
    emotions: {
      default: {
        shape: 'cut-ellipse',
        eyeTiltAdd: 0.025,
        eyeScaleX: 1.22,
        eyeScaleY: 1.02,
        pupilScale: 1.1,
        pupilShiftX: 0,
        pupilShiftY: -0.002,
        cutSlope: 1.38,
        cutOffset: -0.42,
        upperLid: 0,
        lowerLid: 0
      },
      angry: {
        shape: 'cut-ellipse',
        eyeTiltAdd: 0.075,
        eyeScaleX: 1.34,
        eyeScaleY: 1.08,
        pupilScale: 1.14,
        pupilShiftX: 0,
        pupilShiftY: -0.001,
        cutSlope: 1.48,
        cutOffset: -0.44,
        upperLid: 0,
        lowerLid: 0
      },
      alert: {
        eyeTiltAdd: 0,
        eyeScaleX: 0.72,
        eyeScaleY: 0.72,
        pupilScale: 0.64,
        pupilShiftX: 0,
        pupilShiftY: -0.006,
        upperLid: 0,
        lowerLid: 0
      },
      aim: {
        shape: 'cut-ellipse',
        eyeTiltAdd: 0.045,
        eyeScaleX: 1.22,
        eyeScaleY: 1.02,
        pupilScale: 1.06,
        pupilShiftX: 0,
        pupilShiftY: -0.004,
        cutSlope: 1.48,
        cutOffset: -0.43,
        upperLid: 0,
        lowerLid: 0
      },
      hit: {
        eyeTiltAdd: 0,
        eyeScaleX: 0.82,
        eyeScaleY: 0.54,
        pupilScale: 0.76,
        pupilShiftX: -0.004,
        pupilShiftY: -0.006,
        upperLid: 0.28,
        lowerLid: 0.12
      },
      dizzy: {
        shape: 'spiral',
        eyeTiltAdd: 0.12,
        eyeScaleX: 1.28,
        eyeScaleY: 1.28,
        pupilScale: 1.12,
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0,
        lowerLid: 0
      }
    }
  },
  motion: {
    idleBob: 2.6,
    idleSquash: 0.018,
    chargeSquash: 0.1,
    releaseSquash: 0.14,
    hitScaleX: 0.08,
    hitScaleY: 0.05
  },
  spores: {
    textureKey: 'purple-spore-ai-v1',
    imageAsset: 'assets/characters/purple-shroom/projectiles/spore.png',
    imageSize: { width: 596, height: 607 },
    scale: 0.046,
    originOffsetY: -33,
    burstDistance: 178,
    travelMs: 610,
    lingerMs: 820,
    trailLength: 22,
    trailWidth: 13,
    trailColor: 0x8d75ff
  }
} as const satisfies RedShroomCharacterRig;
