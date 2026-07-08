import type { RedShroomCharacterRig } from './rigSchema';
import { SHROOM_EMBEDDED_EYE_EMOTIONS } from './eyeEmotionTemplates';

export const RED_SHROOM_RIG = {
  id: 'red-shroom',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'red-shroom-ai-v2-base',
    imageAsset: 'assets/characters/red-shroom/base.png',
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
    emotions: SHROOM_EMBEDDED_EYE_EMOTIONS
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
    imageAsset: 'assets/characters/red-shroom/projectiles/spore.png',
    imageSize: { width: 597, height: 604 },
    scale: 0.048,
    originOffsetY: -31,
    burstDistance: 184,
    travelMs: 560,
    lingerMs: 860,
    trailLength: 20,
    trailWidth: 16,
    trailColor: 0xff4d54
  }
} as const satisfies RedShroomCharacterRig;
