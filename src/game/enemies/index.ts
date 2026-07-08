import { BackboardKit } from './backboardKit';
import { DartGooberKit } from './dartGooberKit';
import { DoorbertKit } from './doorbertKit';
import { HexbrimKit } from './hexbrimKit';
import { KaboomletKit } from './kaboomletKit';
import { ShroomKit } from './shroomKit';
import { SlimeKit } from './slimeKit';
import { SpooperGooperKit } from './spooperGooperKit';
import { SwitcherooKit } from './switcherooKit';
import type { EnemyKit } from './EnemyKit';

export * from './EnemyKit';

/**
 * Enemy registry. Integrating a new enemy into the game is:
 *   1. write one kit file next to the existing ones
 *   2. add it to this list
 *   3. map a room theme (or debug URL) to its EncounterKind in CombatRoomScene
 * Update order is preserved from the pre-registry scene wiring.
 */
export const createEnemyKits = (): EnemyKit[] => [
  new DartGooberKit(),
  new ShroomKit(),
  new KaboomletKit(),
  new SlimeKit(),
  new SpooperGooperKit(),
  new BackboardKit(),
  new SwitcherooKit(),
  new DoorbertKit(),
  new HexbrimKit()
];
