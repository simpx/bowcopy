import type { DartGooberCharacterRig } from './rigSchema';

import rigJson from '../../assets/characters/dart-goober/rig.json';

// Single source of truth: assets/characters/dart-goober/rig.json (runtime section).
// Tune values in the workbench panel (saves back to rig.json) or edit the
// JSON directly; do not re-introduce literal values in this file.

export const DART_GOOBER_RIG = rigJson.runtime as unknown as DartGooberCharacterRig;
