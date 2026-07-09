import type Phaser from 'phaser';

import { SpooperGooperRenderer, preloadSpooperGooperAssets } from '../../render/enemies';
import { SpooperGooperSystem, type SpooperGooperEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Ghost enemy: phases in to fire black-ink darts, unhittable while vanished. */
export class SpooperGooperKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['spooper-gooper'];

  private readonly system = new SpooperGooperSystem();
  private services!: EnemyKitServices;
  private renderer?: SpooperGooperRenderer;

  preload(scene: Phaser.Scene) {
    preloadSpooperGooperAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new SpooperGooperRenderer(services.scene);
    this.renderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.system.startEncounter(context.spawnPoints, {
      enemyCount: Math.max(2, Math.ceil(context.remainingSpawnMarkers * 0.45)),
      waveIndex: context.wave
    });
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
    const frame = this.system.update(deltaMs, bounds, playerPosition, arrows);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(
      timeMs,
      deltaMs,
      activeKind === 'spooper-gooper' ? this.system.getActiveEnemies() : []
    );

    return frame.consumedArrowIds;
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    const frame = this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.services.debugStepEnemyDarts(deltaMs, bounds);
    this.renderer?.update(timeMs, deltaMs, this.system.getActiveEnemies());
  }

  clear() {
    this.system.clear();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.system.clear();
  }

  private handleEvents(events: readonly SpooperGooperEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'spooper-gooper-spawned' || event.type === 'spooper-gooper-appeared') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'spooper-gooper-vanished') {
        continue;
      }

      if (event.type === 'spooper-gooper-attacked') {
        this.services.enemyDarts.fireDart({
          origin: event.position,
          direction: event.direction,
          speed: 92,
          damage: event.damage,
          style: 'black-ink',
          ttlMs: 1800
        });
        continue;
      }

      if (event.type === 'spooper-gooper-hit') {
        if (event.hp > 0) {
          sfx?.playEnemyHit(event.position, event.damage, 'ghost');
          feedback?.playArrowEnemy(event.position, event.damage);
          this.services.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'spooper-gooper-killed') {
        sfx?.playEnemyDeath(event.position, 'ghost');
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
        continue;
      }

      this.services.encounterCleared({ clearSpores: true, clearDarts: true });
    }
  }
}
