import type { DartGooberCharacterRig } from './rigSchema';

export const DART_GOOBER_RIG = {
  id: 'dart-goober',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'dart-goober-base-ai-v1-trimmed',
    imageAsset: 'assets/characters/dart-goober/dart-goober-base-ai-v1-trimmed.png',
    imageSize: { width: 901, height: 957 },
    scale: 0.095,
    y: -19,
    shadow: { width: 58, height: 16, y: 22 }
  },
  attachments: {
    eyes: {
      source: 'baked-into-base',
      role: 'embedded cyan eye sockets and white eye shapes'
    }
  },
  gaze: {
    mode: 'embedded-eye-pupils',
    archetype: 'angry-embedded',
    eyes: {
      left: { x: 0.1849, y: 0.5834, radiusX: 0.054, radiusY: 0.043, rotation: -0.5 },
      right: { x: 0.7792, y: 0.5835, radiusX: 0.054, radiusY: 0.043, rotation: 0.5 }
    },
    pupilOffsetScale: { x: 0.018, y: 0.012 },
    emotions: {
      default: {
        shape: 'cut-ellipse',
        eyeTiltAdd: 0,
        eyeScaleX: 1.32,
        eyeScaleY: 1.35,
        pupilScale: 1.12,
        pupilShiftX: 0,
        pupilShiftY: 0.01,
        cutSlope: 1.6,
        cutOffset: -0.42,
        upperLid: 0,
        lowerLid: 0
      },
      angry: {
        shape: 'cut-ellipse',
        eyeTiltAdd: -0.015,
        eyeScaleX: 1.4,
        eyeScaleY: 1.42,
        pupilScale: 1.16,
        pupilShiftX: 0,
        pupilShiftY: 0.012,
        cutSlope: 1.72,
        cutOffset: -0.46,
        upperLid: 0,
        lowerLid: 0
      },
      alert: {
        eyeTiltAdd: 0,
        eyeScaleX: 0.82,
        eyeScaleY: 0.9,
        pupilScale: 0.62,
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0,
        lowerLid: 0
      },
      scared: {
        eyeTiltAdd: 0.01,
        eyeScaleX: 0.66,
        eyeScaleY: 0.76,
        pupilScale: 0.46,
        pupilShiftX: -0.006,
        pupilShiftY: -0.014,
        upperLid: 0.04,
        lowerLid: 0.02
      },
      hit: {
        eyeTiltAdd: 0.02,
        eyeScaleX: 0.82,
        eyeScaleY: 0.56,
        pupilScale: 0.68,
        pupilShiftX: -0.008,
        pupilShiftY: -0.006,
        upperLid: 0.36,
        lowerLid: 0.18
      },
      aim: {
        shape: 'cut-ellipse',
        eyeTiltAdd: 0.01,
        eyeScaleX: 1.18,
        eyeScaleY: 1.2,
        pupilScale: 1.02,
        pupilShiftX: 0,
        pupilShiftY: 0.006,
        cutSlope: 1.85,
        cutOffset: -0.38,
        upperLid: 0,
        lowerLid: 0
      }
    }
  },
  motion: {
    idleBob: 2,
    walkBob: 2,
    walkSquash: 0.065,
    idleSquash: 0.018,
    hitScaleX: 0.08,
    hitScaleY: 0.04,
    walkTilt: 0.05,
    velocityTilt: 0.08
  },
  attack: {
    anticipation: 0.11,
    chargeShift: 5,
    muzzleX: 27,
    muzzleY: -20,
    muzzleAimY: 16,
    muzzleRadius: 9,
    muzzleScaleBase: 0.45,
    muzzleScaleCharge: 0.95,
    muzzleAlphaBase: 0.1,
    muzzleAlphaCharge: 0.45
  }
} as const satisfies DartGooberCharacterRig;
