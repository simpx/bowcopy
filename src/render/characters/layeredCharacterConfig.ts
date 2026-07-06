import dartGooberBaseUrl from '../../../assets/characters/dart-goober/dart-goober-base-ai-v1-trimmed.png';
import bowbertBaseUrl from '../../../assets/characters/bowbert/bowbert-base-ai-v2-eye-whites.png';

export type CharacterBaseSource = 'fixed-ai-image';
export type CharacterAttachmentSource = 'runtime-shape' | 'procedural-canvas' | 'baked-into-base';
export type CharacterGazeMode = 'attached-eye-pupils' | 'embedded-eye-pupils' | 'baked-static-eyes';

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
  readonly shape?: 'ellipse' | 'cut-ellipse';
  readonly eyeTiltAdd: number;
  readonly eyeTiltMode?: 'mirrored' | 'same';
  readonly eyeScaleX: number;
  readonly eyeScaleY: number;
  readonly pupilScale: number;
  readonly pupilShiftX: number;
  readonly pupilShiftY: number;
  readonly cutSlope?: number;
  readonly cutOffset?: number;
  readonly upperLid: number;
  readonly lowerLid: number;
}

export const BOWBERT_CHARACTER = {
  id: 'bowbert',
  base: {
    source: 'fixed-ai-image',
    textureKey: 'bowbert-base-ai-v2-eye-whites',
    imageUrl: bowbertBaseUrl,
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
    readonly emotions: Record<string, EyeEmotionTuning>;
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
export type BowbertEyeEmotion = keyof typeof BOWBERT_CHARACTER.gaze.emotions;
