import { BOWBERT_RIG } from '../../characters/bowbertRig';
import { DART_GOOBER_RIG } from '../../characters/dartGooberRig';
import { DART_TRI_GOOBER_RIG } from '../../characters/dartTriGooberRig';
import { PURPLE_SHROOM_RIG } from '../../characters/purpleShroomRig';
import { RED_SHROOM_RIG } from '../../characters/redShroomRig';
import dartGooberBaseUrl from '../../../assets/characters/dart-goober/base.png';
import dartTriGooberBaseUrl from '../../../assets/characters/dart-tri-goober/base.png';
import bowbertBaseUrl from '../../../assets/characters/bowbert/base.png';
import purpleShroomBaseUrl from '../../../assets/characters/purple-shroom/base.png';
import purpleShroomSporeUrl from '../../../assets/characters/purple-shroom/projectiles/spore.png';
import redShroomBaseUrl from '../../../assets/characters/red-shroom/base.png';
import redShroomSporeUrl from '../../../assets/characters/red-shroom/projectiles/spore.png';

export type {
  CharacterAttachmentSource,
  CharacterBaseSource,
  EyeContainerTuning,
  EyeExpression,
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

export const DART_TRI_GOOBER_CHARACTER = {
  ...DART_TRI_GOOBER_RIG,
  base: {
    ...DART_TRI_GOOBER_RIG.base,
    imageUrl: dartTriGooberBaseUrl
  }
} as const;

export const RED_SHROOM_CHARACTER = {
  ...RED_SHROOM_RIG,
  base: {
    ...RED_SHROOM_RIG.base,
    imageUrl: redShroomBaseUrl
  },
  spores: {
    ...RED_SHROOM_RIG.spores,
    imageUrl: redShroomSporeUrl
  }
} as const;

export const PURPLE_SHROOM_CHARACTER = {
  ...PURPLE_SHROOM_RIG,
  base: {
    ...PURPLE_SHROOM_RIG.base,
    imageUrl: purpleShroomBaseUrl
  },
  spores: {
    ...PURPLE_SHROOM_RIG.spores,
    imageUrl: purpleShroomSporeUrl
  }
} as const;

export type { EyeEmotionName } from '../../characters/eyeEmotionTemplates';
