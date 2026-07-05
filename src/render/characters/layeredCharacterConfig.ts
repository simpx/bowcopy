import dartGooberBaseUrl from '../../../assets/characters/dart-goober/dart-goober-base-ai-v1-trimmed.png';
import bowbertBodyUrl from '../../../assets/characters/bowbert/bowbert-body-skill-v1-trimmed.png';

export type CharacterBaseSource = 'fixed-ai-image';
export type CharacterAttachmentSource = 'runtime-shape' | 'procedural-canvas' | 'baked-into-base';
export type CharacterGazeMode = 'attached-eye-pupils' | 'embedded-eye-pupils';

export type EyeName = 'left' | 'right';

export interface FixedImageLayer {
  readonly source: CharacterBaseSource;
  readonly textureKey: string;
  readonly imageUrl: string;
  readonly imageSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly scale: number;
  readonly y: number;
  readonly shadow: {
    readonly width: number;
    readonly height: number;
    readonly y: number;
  };
}

export interface AttachedEyeTuning {
  readonly x: number;
  readonly y: number;
  readonly outerRadius: number;
  readonly whiteRatio: number;
  readonly pupilRatio: number;
}

export interface EmbeddedEyeTuning {
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly rotation: number;
}

export interface EyeEmotionTuning {
  readonly eyeTiltAdd: number;
  readonly eyeScaleX: number;
  readonly eyeScaleY: number;
  readonly pupilScale: number;
  readonly pupilShiftX: number;
  readonly pupilShiftY: number;
  readonly upperLid: number;
  readonly lowerLid: number;
}

export const BOWBERT_CHARACTER = {
  id: 'bowbert',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'bowbert-body-skill-v1-trimmed',
    imageUrl: bowbertBodyUrl,
    imageSize: { width: 654, height: 714 },
    scale: 0.12,
    y: -14,
    shadow: { width: 64, height: 18, y: 25 }
  },
  attachments: {
    eyes: {
      source: 'runtime-shape',
      role: 'large external eyeballs'
    },
    bow: {
      source: 'procedural-canvas',
      role: 'branch bow'
    }
  },
  gaze: {
    mode: 'attached-eye-pupils',
    eyes: {
      left: { x: 0.9403, y: 0.6001, outerRadius: 0.167, whiteRatio: 0.802, pupilRatio: 0.52 },
      right: { x: 0.0999, y: 0.6001, outerRadius: 0.167, whiteRatio: 0.802, pupilRatio: 0.52 }
    },
    pupilOffsetScale: { x: 0.165, y: 0.11 }
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
} as const satisfies {
  readonly id: 'bowbert';
  readonly base: FixedImageLayer;
  readonly attachments: {
    readonly eyes: { readonly source: CharacterAttachmentSource; readonly role: string };
    readonly bow: { readonly source: CharacterAttachmentSource; readonly role: string };
  };
  readonly gaze: {
    readonly mode: CharacterGazeMode;
    readonly eyes: Record<EyeName, AttachedEyeTuning>;
    readonly pupilOffsetScale: { readonly x: number; readonly y: number };
  };
  readonly motion: {
    readonly walkSquash: number;
    readonly idleSquash: number;
    readonly hitSquash: number;
    readonly dodgeStretch: number;
    readonly walkBob: number;
    readonly recoilX: number;
    readonly recoilY: number;
    readonly tiltVelocity: number;
  };
};

export const DART_GOOBER_CHARACTER = {
  id: 'dart-goober',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'dart-goober-base-ai-v1-trimmed',
    imageUrl: dartGooberBaseUrl,
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
    eyes: {
      left: { x: 0.1849, y: 0.5834, radiusX: 0.054, radiusY: 0.043, rotation: -0.5 },
      right: { x: 0.7792, y: 0.5835, radiusX: 0.054, radiusY: 0.043, rotation: 0.5 }
    },
    pupilOffsetScale: { x: 0.018, y: 0.012 },
    emotions: {
      default: {
        eyeTiltAdd: 0.05,
        eyeScaleX: 1.12,
        eyeScaleY: 0.82,
        pupilScale: 1.18,
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0.08,
        lowerLid: 0.02
      },
      angry: {
        eyeTiltAdd: 0.08,
        eyeScaleX: 1.1,
        eyeScaleY: 0.72,
        pupilScale: 1.28,
        pupilShiftX: 0.01,
        pupilShiftY: 0.004,
        upperLid: 0.28,
        lowerLid: 0.03
      },
      alert: {
        eyeTiltAdd: -0.03,
        eyeScaleX: 0.88,
        eyeScaleY: 0.88,
        pupilScale: 0.72,
        pupilShiftX: 0,
        pupilShiftY: 0,
        upperLid: 0,
        lowerLid: 0
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
        eyeTiltAdd: 0.06,
        eyeScaleX: 1.05,
        eyeScaleY: 0.7,
        pupilScale: 1.12,
        pupilShiftX: 0.014,
        pupilShiftY: 0,
        upperLid: 0.22,
        lowerLid: 0.05
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
} as const satisfies {
  readonly id: 'dart-goober';
  readonly base: FixedImageLayer;
  readonly attachments: {
    readonly eyes: { readonly source: CharacterAttachmentSource; readonly role: string };
  };
  readonly gaze: {
    readonly mode: CharacterGazeMode;
    readonly eyes: Record<EyeName, EmbeddedEyeTuning>;
    readonly pupilOffsetScale: { readonly x: number; readonly y: number };
    readonly emotions: Record<string, EyeEmotionTuning>;
  };
  readonly motion: {
    readonly idleBob: number;
    readonly walkBob: number;
    readonly walkSquash: number;
    readonly idleSquash: number;
    readonly hitScaleX: number;
    readonly hitScaleY: number;
    readonly walkTilt: number;
    readonly velocityTilt: number;
  };
  readonly attack: {
    readonly anticipation: number;
    readonly chargeShift: number;
    readonly muzzleX: number;
    readonly muzzleY: number;
    readonly muzzleAimY: number;
    readonly muzzleRadius: number;
    readonly muzzleScaleBase: number;
    readonly muzzleScaleCharge: number;
    readonly muzzleAlphaBase: number;
    readonly muzzleAlphaCharge: number;
  };
};

export type DartGooberEyeEmotion = keyof typeof DART_GOOBER_CHARACTER.gaze.emotions;
