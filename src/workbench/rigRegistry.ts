import { BACKBOARD_RIG } from '../characters/backboardRig';
import { BOWBERT_RIG } from '../characters/bowbertRig';
import { DOORBERT_RIG } from '../characters/doorbertRig';
import { DART_GOOBER_RIG } from '../characters/dartGooberRig';
import { DART_TRI_GOOBER_RIG } from '../characters/dartTriGooberRig';
import { KABOOMLET_RIG } from '../characters/kaboomletRig';
import { PURPLE_SHROOM_RIG } from '../characters/purpleShroomRig';
import { RED_SHROOM_RIG } from '../characters/redShroomRig';
import { SLIME_PARENT_RIG } from '../characters/slimeParentRig';
import { SLIME_RIG } from '../characters/slimeRig';
import { SPOOPER_GOOPER_RIG } from '../characters/spooperGooperRig';
import { SWITCHEROO_RIG } from '../characters/switcherooRig';

export interface TunableRig {
  /** Character folder under assets/characters (write-back target). */
  readonly folder: string;
  readonly label: string;
  /** The live rig object the game renderers read; edits apply immediately. */
  readonly rig: Record<string, unknown>;
}

/**
 * Live rig objects per workbench slot. These are the same module instances
 * the runtime renderers read, so mutating them previews changes in place;
 * saving POSTs them back into rig.json (the single source of truth).
 */
export const getTunableRigs = (slotId: string): TunableRig[] => {
  switch (slotId) {
    case 'bowbert':
      return [{ folder: 'bowbert', label: 'Bowbert', rig: BOWBERT_RIG as unknown as Record<string, unknown> }];
    case 'dart-goober':
      return [{ folder: 'dart-goober', label: 'Dart Goober', rig: DART_GOOBER_RIG as unknown as Record<string, unknown> }];
    case 'dart-tri-goober':
      return [
        { folder: 'dart-tri-goober', label: 'Dart Tri Goober', rig: DART_TRI_GOOBER_RIG as unknown as Record<string, unknown> }
      ];
    case 'red-shroom':
      return [{ folder: 'red-shroom', label: 'Red Shroom', rig: RED_SHROOM_RIG as unknown as Record<string, unknown> }];
    case 'purple-shroom':
      return [
        { folder: 'purple-shroom', label: 'Purple Shroom', rig: PURPLE_SHROOM_RIG as unknown as Record<string, unknown> }
      ];
    case 'kaboomlet':
      return [{ folder: 'kaboomlet', label: 'Kaboomlet', rig: KABOOMLET_RIG as unknown as Record<string, unknown> }];
    case 'slime':
      return [
        { folder: 'slime-parent', label: 'Slime Parent', rig: SLIME_PARENT_RIG as unknown as Record<string, unknown> },
        { folder: 'slime', label: 'Slime Child', rig: SLIME_RIG as unknown as Record<string, unknown> }
      ];
    case 'spooper-gooper':
      return [
        { folder: 'spooper-gooper', label: 'Spooper Gooper', rig: SPOOPER_GOOPER_RIG as unknown as Record<string, unknown> }
      ];
    case 'backboard':
      return [{ folder: 'backboard', label: 'Backboard', rig: BACKBOARD_RIG as unknown as Record<string, unknown> }];
    case 'switcheroo':
      return [{ folder: 'switcheroo', label: 'Switcheroo', rig: SWITCHEROO_RIG as unknown as Record<string, unknown> }];
    case 'doorbert':
      return [{ folder: 'doorbert', label: 'Doorbert', rig: DOORBERT_RIG as unknown as Record<string, unknown> }];
    default:
      return [];
  }
};
