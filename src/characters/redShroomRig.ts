import type { RedShroomCharacterRig } from './rigSchema';

export const RED_SHROOM_RIG = {
  id: 'red-shroom',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'red-shroom-ai-v2-base',
    imageAsset: 'assets/enemies/red_shroom/red-shroom-ai-v2-base.png',
    imageSize: { width: 708, height: 778 },
    scale: 0.102,
    y: -27,
    shadow: { width: 72, height: 16, y: 18 }
  },
  attachments: {
    eyes: {
      source: 'runtime-shape',
      role: 'runtime pupils over baked white eye sockets'
    },
    spores: {
      source: 'fixed-ai-image',
      role: 'spore projectile base with runtime comet trail'
    }
  },
  gaze: {
    mode: 'embedded-eye-pupils',
    archetype: 'angry-embedded',
    eyes: {
      left: { x: 0.135, y: 0.535, radiusX: 0.062, radiusY: 0.062, rotation: -0.04 },
      right: { x: 0.866, y: 0.535, radiusX: 0.062, radiusY: 0.062, rotation: 0.04 }
    },
    pupilOffsetScale: { x: 0.026, y: 0.018 },
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
        eyeTiltAdd: 0.02,
        eyeScaleX: 1.18,
        eyeScaleY: 1.02,
        pupilScale: 1.08,
        pupilShiftX: 0,
        pupilShiftY: -0.002,
        cutSlope: 1.52,
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
        eyeTiltAdd: 0.015,
        eyeScaleX: 1.06,
        eyeScaleY: 0.94,
        pupilScale: 1.02,
        pupilShiftX: 0,
        pupilShiftY: -0.004,
        cutSlope: 1.65,
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
    idleBob: 2.8,
    idleSquash: 0.02,
    chargeSquash: 0.12,
    releaseSquash: 0.16,
    hitScaleX: 0.08,
    hitScaleY: 0.05
  },
  spores: {
    textureKey: 'red-spore-ai-v3',
    imageAsset: 'assets/enemies/red_shroom/red-spore-ai-v3.png',
    imageSize: { width: 597, height: 604 },
    scale: 0.048,
    originOffsetY: -31,
    burstDistance: 184,
    travelMs: 560,
    lingerMs: 860,
    trailLength: 12,
    trailWidth: 16,
    trailColor: 0xff4d54
  }
} as const satisfies RedShroomCharacterRig;
