import { BOWBERT_RIG } from '../../characters/bowbertRig';
import { DART_GOOBER_RIG } from '../../characters/dartGooberRig';
import dartGooberBaseUrl from '../../../assets/characters/dart-goober/dart-goober-base-ai-v1-trimmed.png';
import bowbertBaseUrl from '../../../assets/characters/bowbert/bowbert-base-ai-v2-eye-whites.png';

export type {
  AttachedEyeTuning,
  CharacterAttachmentSource,
  CharacterBaseSource,
  CharacterGazeMode,
  EmbeddedEyeTuning,
  EyeEmotionTuning,
  EyeName,
  FixedImageLayer
} from '../../characters/rigSchema';

export const BOWBERT_CHARACTER = {
  ...BOWBERT_RIG,
  base: {
    ...BOWBERT_RIG.base,
    imageUrl: bowbertBaseUrl
  }
} as const;

export const DART_GOOBER_CHARACTER = {
  ...DART_GOOBER_RIG,
  base: {
    ...DART_GOOBER_RIG.base,
    imageUrl: dartGooberBaseUrl
  }
} as const;

export type BowbertEyeEmotion = keyof typeof BOWBERT_CHARACTER.gaze.emotions;
export type DartGooberEyeEmotion = keyof typeof DART_GOOBER_CHARACTER.gaze.emotions;
