import type Phaser from 'phaser';

import { SwitcherooRenderer, preloadSwitcherooAssets } from '../../render/enemies';
import { SwitcherooSystem, type SwitcherooEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Disruptor imp: telegraphed position swaps with Bowbert or sibling imps. */
export class SwitcherooKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['switcheroo'];

  private readonly system = new SwitcherooSystem();
  private services!: EnemyKitServices;
  private renderer?: SwitcherooRenderer;

  preload(scene: Phaser.Scene) {
    preloadSwitcherooAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new SwitcherooRenderer(services.scene);
    this.renderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.system.startEncounter(context.spawnPoints, {
      enemyCount: Math.max(2, Math.ceil(context.remainingSpawnMarkers * 0.55)),
      waveIndex: context.wave
    });
  }

  damageArea(position: SimVector, radius: number, damage: number) {
    this.system.queueAreaDamage(position, radius, damage);
  }

  getEnemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  hasEncounterStarted(): boolean {
    return this.system.hasEncounterStarted();
  }

  activeEnemyCount(): number {
    return this.system.getActiveEnemies().length;
  }

  update(
    timeMs: number,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[],
    activeKind: EncounterKind
  ): readonly number[] {
    const frame = this.system.update(
      deltaMs,
      bounds,
      playerPosition,
      arrows,
      this.services.getOtherEnemyPositions('switcheroo')
    );

    if (frame.playerTeleport) {
      this.services.teleportPlayer?.(frame.playerTeleport);
    }

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(
      timeMs,
      deltaMs,
      activeKind === 'switcheroo' ? this.system.getActiveEnemies() : []
    );

    return frame.consumedArrowIds;
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    const frame = this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(timeMs, deltaMs, this.system.getActiveEnemies());
  }

  debugForceEffect(effect: string, _kind: EncounterKind, _bounds: RoomBounds) {
    if (effect === 'swap') {
      this.system.debugForceSwap();
    }
  }

  clear() {
    this.system.clear();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.system.clear();
  }

  private handleEvents(events: readonly SwitcherooEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'switcheroo-spawned') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'switcheroo-windup') {
        // Both swap endpoints get a warning pulse — the reaction window.
        feedback?.playSporeBreak(event.position);
        feedback?.playSporeBreak(event.targetPosition);
        continue;
      }

      if (event.type === 'switcheroo-swapped') {
        sfx?.playPortal(event.fromPosition);
        sfx?.playPortal(event.toPosition);

        if (event.targetingPlayer) {
          this.services.shakeCamera('dodge');
        }
        continue;
      }

      if (event.type === 'switcheroo-hit') {
        sfx?.playEnemyHit(event.position, event.damage, 'squish');
        feedback?.playArrowEnemy(event.position, event.damage);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'switcheroo-killed') {
        sfx?.playEnemyDeath(event.position, 'squish');
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'switcheroo-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: false, clearDarts: false });
      }
    }
  }
}
