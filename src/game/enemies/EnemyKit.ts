import type Phaser from 'phaser';

import type { CombatSfxDirector } from '../../audio/CombatSfxDirector';
import type { CombatFeedbackRenderer } from '../../render/feedback';
import type { ShroomVariant } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type {
  ArrowProjectile,
  EnemyDartProjectileSystem,
  ShroomSporeProjectileSystem
} from '../../sim/projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../../sim/rooms';

export const ENCOUNTER_KINDS = [
  'backboard',
  'dart-goober',
  'dart-tri-goober',
  'red-shroom',
  'kaboomlet',
  'slime',
  'slime-parent',
  'doorbert',
  'hexbrim',
  'spooper-gooper',
  'switcheroo'
] as const;

export type EncounterKind = (typeof ENCOUNTER_KINDS)[number];

export type EnemyCameraShake = 'hit' | 'damage' | 'dodge' | 'room-clear';

export interface EncounterContext {
  readonly kind: EncounterKind;
  readonly spawnPoints: readonly RoomSpawnPoint[];
  readonly remainingSpawnMarkers: number;
  readonly wave: number;
  readonly shroomVariant: ShroomVariant;
}

/**
 * Scene services a kit may use while routing its events. Kits never touch
 * the scene directly beyond these, so integrating a new enemy cannot leak
 * into room/door/HUD logic.
 */
export interface EnemyKitServices {
  readonly scene: Phaser.Scene;
  readonly enemyDarts: EnemyDartProjectileSystem;
  readonly shroomSpores: ShroomSporeProjectileSystem;
  getFeedback(): CombatFeedbackRenderer | undefined;
  getSfx(): CombatSfxDirector | undefined;
  getPlayerPosition(): SimVector;
  shakeCamera(kind: EnemyCameraShake): void;
  /** Dodge-aware player damage incl. hearts HUD, feedback, and camera shake. */
  damagePlayer(sourcePosition: SimVector, damage: number): void;
  /** Moves Bowbert instantly (switcheroo swaps). Optional: absent in tooling hosts. */
  teleportPlayer?(position: SimVector): void;
  /** Polymorphs Bowbert into sheep form for the duration (Hexbrim's hex). */
  hexPlayer?(durationMs: number): void;
  /** Full-screen camera flash for boss beats. */
  flashCamera?(durationMs: number, red?: number, green?: number, blue?: number): void;
  /** Briefly dip background music so a big cue/announcement reads clearly. */
  duckMusic?(holdMs?: number): void;
  damagePlayerFromRadius(position: SimVector, radius: number, damage: number): void;
  /** Friendly-fire blasts: forwards to every kit's damageArea hook. */
  damageEnemiesFromRadius(position: SimVector, radius: number, damage: number): void;
  /** Positions of every living enemy except the asking kind (ambush AI). */
  getOtherEnemyPositions(excludeKind: EncounterKind): readonly SimVector[];
  /** True while dodge i-frames are active (dodgeable telegraphed attacks). */
  isPlayerInvulnerable(): boolean;
  /** Marks the room cleared with sfx/feedback/shake and optional projectile cleanup. */
  encounterCleared(options: { clearSpores: boolean; clearDarts: boolean }): void;
  /** Debug-bootstrap helpers so kits can pump shared projectile systems. */
  debugStepEnemyDarts(deltaMs: number, bounds: RoomBounds): void;
  debugPumpShroomSpores(times: number, deltaMs: number, bounds: RoomBounds): void;
}

/**
 * One self-contained enemy integration: sim system + renderer(s) + event
 * routing + encounter sizing + debug hooks. Adding an enemy to the game is
 * writing one kit and registering it in src/game/enemies/index.ts.
 */
export interface EnemyKit {
  readonly kinds: readonly EncounterKind[];
  /** Boss kits report a name + health for the boss HUD bar. */
  getBossStatus?(): { name: string; hp: number; maxHp: number } | null;
  preload(scene: Phaser.Scene): void;
  create(services: EnemyKitServices): void;
  startEncounter(context: EncounterContext): void;
  hasEncounterStarted(): boolean;
  activeEnemyCount(): number;
  /**
   * Runs the sim, routes events, and renders. Returns consumed arrow ids.
   * `activeKind` gates which renderer shows enemies (mirrors the scene's
   * one-encounter-at-a-time rule).
   */
  update(
    timeMs: number,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[],
    activeKind: EncounterKind
  ): readonly number[];
  /** Optional: take splash damage from explosions (kaboomlet etc.). */
  damageArea?(position: SimVector, radius: number, damage: number): void;
  /** Optional: expose living enemy positions for cross-kit AI. */
  getEnemyPositions?(): readonly SimVector[];
  /** Bootstrap stepping used by debug encounter URLs (no arrows, muted events where the original did so). */
  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, kind: EncounterKind): void;
  /** Optional forced previews triggered by debug URL params (split/damage/explosion/spore). */
  debugForceEffect?(effect: string, kind: EncounterKind, bounds: RoomBounds): void;
  clear(): void;
  destroy(): void;
}
