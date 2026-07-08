export type CharacterBaseSource = 'fixed-ai-image';
export type CharacterAttachmentSource =
  | 'runtime-shape'
  | 'procedural-canvas'
  | 'baked-into-base'
  | 'fixed-ai-image';
export type EyeName = 'left' | 'right';

export interface FixedImageRigLayer {
  readonly source: CharacterBaseSource;
  readonly textureKey: string;
  readonly imageAsset: string;
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

export interface FixedImageLayer extends FixedImageRigLayer {
  readonly imageUrl: string;
}

/**
 * Eye geometry per docs/studio/eyes.md. Purely geometric — no semantic
 * "kind"/"archetype" fields: an angry eye is just an ellipse with a cut.
 * Coordinates are normalized to the base image; cuts live in the eye-local
 * frame where the container is |u| <= 1 ∩ (u.y - slope*u.x - offset >= 0).
 */
export interface EyeCut {
  readonly slope: number;
  readonly offset: number;
}

export interface EyeContainerTuning {
  readonly x: number;
  readonly y: number;
  readonly radiusX: number;
  readonly radiusY: number;
  readonly rotation: number;
  readonly cuts: readonly EyeCut[];
}

/**
 * Emotion expression, every quantity in eye-local (container) units.
 * `cuts` are temporary lid cuts (docs/studio/eyes.md: an eyelid is an
 * animated cut, an angry socket is a permanent one). Expression cuts are
 * authored for the LEFT eye and mirrored (x-flip) for the right eye.
 */
export interface EyeExpression {
  readonly style?: 'dot' | 'spiral' | 'x';
  readonly tiltAdd: number;
  readonly tiltMode?: 'mirrored' | 'same';
  readonly pupilRadiusX: number;
  readonly pupilRadiusY: number;
  readonly pupilShiftX: number;
  readonly pupilShiftY: number;
  readonly upperLid: number;
  readonly lowerLid: number;
  readonly cuts?: readonly EyeCut[];
}

export type EyeTemplateName = 'standard';

/** Eyes are shared assets: rigs reference a template and override sparingly. */
export interface GazeRig {
  readonly eyes: Record<EyeName, EyeContainerTuning>;
  /** Gaze tracking strength, eye-local units. */
  readonly pupilOffsetScale: { readonly x: number; readonly y: number };
  readonly emotions: {
    readonly template: EyeTemplateName;
    readonly overrides?: Record<string, Partial<EyeExpression>>;
  };
}

export interface BowbertMotionRig {
  readonly walkSquash: number;
  readonly idleSquash: number;
  readonly hitSquash: number;
  readonly dodgeStretch: number;
  readonly walkBob: number;
  readonly recoilX: number;
  readonly recoilY: number;
  readonly tiltVelocity: number;
}

export interface DartGooberMotionRig {
  readonly idleBob: number;
  readonly walkBob: number;
  readonly walkSquash: number;
  readonly idleSquash: number;
  readonly hitScaleX: number;
  readonly hitScaleY: number;
  readonly walkTilt: number;
  readonly velocityTilt: number;
}

export interface DartGooberAttackRig {
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
}

export interface RedShroomMotionRig {
  readonly idleBob: number;
  readonly idleSquash: number;
  readonly chargeSquash: number;
  readonly releaseSquash: number;
  readonly hitScaleX: number;
  readonly hitScaleY: number;
}

export interface RedShroomSporeRig {
  readonly textureKey: string;
  readonly imageAsset: string;
  readonly imageSize: {
    readonly width: number;
    readonly height: number;
  };
  readonly scale: number;
  readonly originOffsetY: number;
  readonly burstDistance: number;
  readonly travelMs: number;
  readonly lingerMs: number;
  readonly trailLength: number;
  readonly trailWidth: number;
  readonly trailColor: number;
}

export interface BowbertCharacterRig {
  readonly id: 'bowbert';
  readonly base: FixedImageRigLayer;
  readonly attachments: {
    readonly eyes: { readonly source: CharacterAttachmentSource; readonly role: string };
    readonly bow: { readonly source: CharacterAttachmentSource; readonly role: string };
  };
  readonly gaze: GazeRig;
  readonly motion: BowbertMotionRig;
}

export type DartGooberCharacterId = 'dart-goober' | 'dart-tri-goober';

export interface DartGooberCharacterRig {
  readonly id: DartGooberCharacterId;
  readonly base: FixedImageRigLayer;
  readonly attachments: {
    readonly eyes: { readonly source: CharacterAttachmentSource; readonly role: string };
  };
  readonly gaze: GazeRig;
  readonly motion: DartGooberMotionRig;
  readonly attack: DartGooberAttackRig;
}

export type ShroomCharacterId = 'red-shroom' | 'purple-shroom';

export interface RedShroomCharacterRig {
  readonly id: ShroomCharacterId;
  readonly base: FixedImageRigLayer;
  readonly attachments: {
    readonly eyes: { readonly source: CharacterAttachmentSource; readonly role: string };
    readonly spores: { readonly source: CharacterAttachmentSource; readonly role: string };
  };
  readonly gaze: GazeRig;
  readonly motion: RedShroomMotionRig;
  readonly spores: RedShroomSporeRig;
}
