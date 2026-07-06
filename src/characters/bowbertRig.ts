import type { BowbertCharacterRig } from './rigSchema';

export const BOWBERT_RIG = {
  id: 'bowbert',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'bowbert-base-ai-v2-eye-whites',
    imageAsset: 'assets/characters/bowbert/bowbert-base-ai-v2-eye-whites.png',
    imageSize: { width: 854, height: 878 },
    scale: 0.095,
    y: -14,
    shadow: { width: 64, height: 18, y: 25 }
  },
  attachments: {
    eyes: {
      source: 'runtime-shape',
      role: 'runtime black pupils over baked white eye sockets'
    },
    bow: {
      source: 'procedural-canvas',
      role: 'branch bow'
    }
  },
  gaze: {
    mode: 'attached-eye-pupils',
    archetype: 'round-external',
    eyes: {
      left: { x: 0.164, y: 0.572, outerRadius: 0.135, whiteRatio: 0.82, pupilRatio: 0.62 },
      right: { x: 0.842, y: 0.573, outerRadius: 0.135, whiteRatio: 0.82, pupilRatio: 0.62 }
    },
    pupilOffsetScale: { x: 0.105, y: 0.075 },
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
      aim: {
        eyeTiltAdd: 0,
        eyeScaleX: 0.96,
        eyeScaleY: 0.96,
        pupilScale: 0.98,
        pupilShiftX: 0,
        pupilShiftY: -0.004,
        upperLid: 0,
        lowerLid: 0
      },
      focused: {
        eyeTiltAdd: 0,
        eyeScaleX: 1.12,
        eyeScaleY: 0.68,
        pupilScale: 0.92,
        pupilShiftX: 0,
        pupilShiftY: -0.002,
        upperLid: 0.18,
        lowerLid: 0.04
      },
      alert: {
        eyeTiltAdd: 0,
        eyeScaleX: 0.82,
        eyeScaleY: 0.82,
        pupilScale: 0.72,
        pupilShiftX: 0,
        pupilShiftY: -0.006,
        upperLid: 0,
        lowerLid: 0
      },
      scared: {
        eyeTiltAdd: 0,
        eyeScaleX: 0.68,
        eyeScaleY: 0.68,
        pupilScale: 0.58,
        pupilShiftX: 0,
        pupilShiftY: -0.012,
        upperLid: 0,
        lowerLid: 0
      },
      confused: {
        eyeTiltAdd: 0.18,
        eyeScaleX: 0.92,
        eyeScaleY: 1.08,
        pupilScale: 0.9,
        pupilShiftX: 0.004,
        pupilShiftY: -0.002,
        upperLid: 0.02,
        lowerLid: 0
      },
      squint: {
        eyeTiltAdd: 0,
        eyeScaleX: 1.04,
        eyeScaleY: 0.34,
        pupilScale: 0.74,
        pupilShiftX: 0,
        pupilShiftY: 0.012,
        upperLid: 0.56,
        lowerLid: 0.12
      },
      hit: {
        eyeTiltAdd: 0,
        eyeScaleX: 0.9,
        eyeScaleY: 0.58,
        pupilScale: 0.82,
        pupilShiftX: -0.004,
        pupilShiftY: -0.006,
        upperLid: 0.22,
        lowerLid: 0.1
      }
    }
  },
  motion: {
    walkSquash: 0.045,
    idleSquash: 0.018,
    hitSquash: 0.1,
    dodgeStretch: 0.14,
    walkBob: 2,
    recoilX: 5,
    recoilY: 3,
    tiltVelocity: 0.06
  }
} as const satisfies BowbertCharacterRig;
