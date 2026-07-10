import type Phaser from 'phaser';

import { KaboomletRenderer, preloadKaboomletAssets } from '../../render/enemies';
import { KaboomletSystem, type KaboomletEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Chasing bomb enemy; explosions damage the player through a radius check. */
export class KaboomletKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['kaboomlet'];

  private readonly system = new KaboomletSystem();
  private services!: EnemyKitServices;
  private renderer?: KaboomletRenderer;

  preload(scene: Phaser.Scene) {
    preloadKaboomletAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new KaboomletRenderer(services.scene);
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
    const frame = this.system.update(deltaMs, bounds, playerPosition, arrows);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(
      timeMs,
      deltaMs,
      activeKind === 'kaboomlet' ? this.system.getActiveEnemies() : []
    );

    return frame.consumedArrowIds;
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    const frame = this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(timeMs, deltaMs, this.system.getActiveEnemies());
  }

  debugForceEffect(effect: string, _kind: EncounterKind, bounds: RoomBounds) {
    if (effect !== 'explosion') {
      return;
    }

    const position = {
      x: bounds.x + bounds.width * 0.46,
      y: bounds.y + bounds.height * 0.36
    };

    this.renderer?.playEvents([
      {
        type: 'kaboomlet-exploded',
        id: -1,
        position,
        radius: 92,
        damage: 1
      }
    ]);
    this.renderer?.update(2400, 16, this.system.getActiveEnemies());
  }

  clear() {
    this.system.clear();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.system.clear();
  }

  private handleEvents(events: readonly KaboomletEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'kaboomlet-spawned' || event.type === 'kaboomlet-armed') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'kaboomlet-exploded') {
        sfx?.playExplosion(event.position);
        feedback?.playEnemyDeath(event.position);
        this.services.damagePlayerFromRadius(event.position, event.radius, event.damage);
        // Bombs don't take sides — and they hit monsters twice as hard,
        // so a well-placed detonation clears a crowd.
        this.services.damageEnemiesFromRadius(event.position, event.radius, event.damage * 2);
        this.services.shakeCamera('damage');
        continue;
      }

      if (event.type === 'kaboomlet-hit') {
        if (event.hp > 0) {
          sfx?.playEnemyHit(event.position, event.damage, 'metal');
          feedback?.playArrowEnemy(event.position, event.damage);
          this.services.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'kaboomlet-killed') {
        // The paired 'kaboomlet-exploded' event carries the boom.
        feedback?.playEnemyDeath(event.position);
        continue;
      }

      this.services.encounterCleared({ clearSpores: true, clearDarts: true });
    }
  }
}
