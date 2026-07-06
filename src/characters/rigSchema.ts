export type CharacterBaseSource = 'fixed-ai-image';
export type CharacterAttachmentSource =
  | 'runtime-shape'
  | 'procedural-canvas'
  | 'baked-into-base'
  | 'fixed-ai-image';
export type CharacterGazeMode = 'attached-eye-pupils' | 'embedded-eye-pupils' | 'baked-static-eyes';
export type CharacterEyeArchetype = 'round-external' | 'angry-embedded';

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
  readonly shape?: 'ellipse' | 'cut-ellipse' | 'spiral' | 'x';
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

export interface AttachedEyeGazeRig {
  readonly mode: 'attached-eye-pupils';
  readonly archetype: 'round-external';
  readonly eyes: Record<EyeName, AttachedEyeTuning>;
  readonly pupilOffsetScale: { readonly x: number; readonly y: number };
  readonly emotions: Record<string, EyeEmotionTuning>;
}

export interface EmbeddedEyeGazeRig {
  readonly mode: 'embedded-eye-pupils';
  readonly archetype: 'angry-embedded';
  readonly eyes: Record<EyeName, EmbeddedEyeTuning>;
  readonly pupilOffsetScale: { readonly x: number; readonly y: number };
  readonly emotions: Record<string, EyeEmotionTuning>;
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
  readonly gaze: AttachedEyeGazeRig;
  readonly motion: BowbertMotionRig;
}

export interface DartGooberCharacterRig {
  readonly id: 'dart-goober';
  readonly base: FixedImageRigLayer;
  readonly attachments: {
    readonly eyes: { readonly source: CharacterAttachmentSource; readonly role: string };
  };
  readonly gaze: EmbeddedEyeGazeRig;
  readonly motion: DartGooberMotionRig;
  readonly attack: DartGooberAttackRig;
}

export interface RedShroomCharacterRig {
  readonly id: 'red-shroom';
  readonly base: FixedImageRigLayer;
  readonly attachments: {
    readonly eyes: { readonly source: CharacterAttachmentSource; readonly role: string };
    readonly spores: { readonly source: CharacterAttachmentSource; readonly role: string };
  };
  readonly gaze: EmbeddedEyeGazeRig;
  readonly motion: RedShroomMotionRig;
  readonly spores: RedShroomSporeRig;
}
