import type { BowbertCharacterRig } from './rigSchema';
import { ROUND_EXTERNAL_EYE_EMOTIONS } from './eyeEmotionTemplates';

export const BOWBERT_RIG = {
  id: 'bowbert',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'bowbert-base',
    imageAsset: 'assets/characters/bowbert/base.png',
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
    emotions: ROUND_EXTERNAL_EYE_EMOTIONS
  },
  motion: {
    walkSquash: 0.074,
    idleSquash: 0.026,
    hitSquash: 0.13,
    dodgeStretch: 0.18,
    walkBob: 3.4,
    recoilX: 6,
    recoilY: 4,
    tiltVelocity: 0.075
  }
} as const satisfies BowbertCharacterRig;
