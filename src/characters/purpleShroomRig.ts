import type { RedShroomCharacterRig } from './rigSchema';

import rigJson from '../../assets/characters/purple-shroom/rig.json';

// Single source of truth: assets/characters/purple-shroom/rig.json (runtime section).
// Tune values in the workbench panel (saves back to rig.json) or edit the
// JSON directly; do not re-introduce literal values in this file.

export const PURPLE_SHROOM_RIG = rigJson.runtime as unknown as RedShroomCharacterRig;
