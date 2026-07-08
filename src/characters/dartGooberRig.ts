import type { DartGooberCharacterRig } from './rigSchema';
import { ANGRY_EMBEDDED_EYE_EMOTIONS } from './eyeEmotionTemplates';

export const DART_GOOBER_RIG = {
  id: 'dart-goober',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'dart-goober-base-ai-v1-trimmed',
    imageAsset: 'assets/characters/dart-goober/base.png',
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
    emotions: ANGRY_EMBEDDED_EYE_EMOTIONS
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
