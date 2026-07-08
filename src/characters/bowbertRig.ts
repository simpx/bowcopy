import type { BowbertCharacterRig } from './rigSchema';

import rigJson from '../../assets/characters/bowbert/rig.json';

// Single source of truth: assets/characters/bowbert/rig.json (runtime section).
// Tune values in the workbench panel (saves back to rig.json) or edit the
// JSON directly; do not re-introduce literal values in this file.

export const BOWBERT_RIG = rigJson.runtime as unknown as BowbertCharacterRig;
