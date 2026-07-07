import type { DartGooberCharacterRig } from './rigSchema';

export const DART_TRI_GOOBER_RIG = {
  id: 'dart-tri-goober',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'dart-tri-goober-base',
    imageAsset: 'assets/characters/dart-tri-goober/base.png',
    imageSize: { width: 1254, height: 1254 },
    scale: 0.096,
    y: -18,
    shadow: { width: 62, height: 15, y: 22 }
  },
  attachments: {
    eyes: {
      source: 'baked-into-base',
      role: 'embedded slanted white eye sockets with runtime black cut-ellipse gaze'
    }
  },
  gaze: {
    mode: 'embedded-eye-pupils',
    archetype: 'angry-embedded',
    eyes: {
      left: { x: 0.286, y: 0.533, radiusX: 0.067, radiusY: 0.054, rotation: -0.58 },
      right: { x: 0.752, y: 0.516, radiusX: 0.064, radiusY: 0.052, rotation: 0.58 }
    },
    pupilOffsetScale: { x: 0.018, y: 0.012 },
    emotions: {
      default: {
        shape: 'cut-ellipse',
        eyeTiltAdd: 0,
        eyeScaleX: 1.02,
        eyeScaleY: 1.255,
        pupilScale: 1.12,
        pupilShiftX: 0.002,
        pupilShiftY: -0.006,
        cutSlope: 2.6,
        cutOffset: -0.675,
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
      },
      hit: {
        shape: 'ellipse',
        eyeTiltAdd: 0.025,
        eyeScaleX: 0.78,
        eyeScaleY: 0.52,
        pupilScale: 0.68,
        pupilShiftX: -0.008,
        pupilShiftY: -0.006,
        upperLid: 0.36,
        lowerLid: 0.18
      }
    }
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
} as const satisfies DartGooberCharacterRig;
