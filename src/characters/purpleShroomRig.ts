import type { RedShroomCharacterRig } from './rigSchema';

export const PURPLE_SHROOM_RIG = {
  id: 'purple-shroom',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'purple-shroom-ai-v1-base',
    imageAsset: 'assets/enemies/purple_shroom/purple-shroom-ai-v1-base.png',
    imageSize: { width: 856, height: 905 },
    scale: 0.13,
    y: -46,
    shadow: { width: 104, height: 24, y: 38 }
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
        eyeTiltAdd: 0,
        eyeScaleX: 1,
        eyeScaleY: 1,
        pupilScale: 1,
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0,
        lowerLid: 0
      },
      angry: {
        shape: 'cut-ellipse',
        eyeTiltAdd: 0.018,
        eyeScaleX: 1.12,
        eyeScaleY: 0.98,
        pupilScale: 1.06,
        pupilShiftX: 0,
        pupilShiftY: -0.002,
        cutSlope: 1.45,
        cutOffset: -0.34,
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
        eyeTiltAdd: 0.01,
        eyeScaleX: 1.04,
        eyeScaleY: 0.94,
        pupilScale: 1,
        pupilShiftX: 0,
        pupilShiftY: -0.004,
        cutSlope: 1.58,
        cutOffset: -0.38,
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
        eyeScaleX: 1.05,
        eyeScaleY: 1.05,
        pupilScale: 1,
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
    imageAsset: 'assets/enemies/purple_shroom/purple-spore-ai-v1.png',
    imageSize: { width: 596, height: 607 },
    scale: 0.046,
    originOffsetY: -48,
    burstDistance: 178,
    travelMs: 610,
    lingerMs: 820,
    trailLength: 13,
    trailWidth: 13,
    trailColor: 0x8d75ff
  }
} as const satisfies RedShroomCharacterRig;
