import type Phaser from 'phaser';

import { BackboardRenderer, preloadBackboardAssets } from '../../render/enemies';
import { BackboardSystem, type BackboardEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Anti-ranged plank: parries arrows back as enemy darts on a fixed rhythm. */
export class BackboardKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['backboard'];

  private readonly system = new BackboardSystem();
  private services!: EnemyKitServices;
  private renderer?: BackboardRenderer;

  preload(scene: Phaser.Scene) {
    preloadBackboardAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new BackboardRenderer(services.scene);
    this.renderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.system.startEncounter(context.spawnPoints, {
      enemyCount: Math.max(2, Math.ceil(context.remainingSpawnMarkers * 0.5)),
      waveIndex: context.wave
    });
  }

  damageArea(position: SimVector, radius: number, damage: number) {
    this.system.queueAreaDamage(position, radius, damage);
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
      activeKind === 'backboard' ? this.system.getActiveEnemies() : []
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
    if (effect === 'parry') {
      this.system.debugForceParry();
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

  private handleEvents(events: readonly BackboardEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'backboard-spawned') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'backboard-dazed') {
        feedback?.playSporeBreak(event.position);
        continue;
      }

      if (event.type === 'backboard-reflected') {
        sfx?.playParry(event.origin);
        // The parry: consume the arrow, send it right back as an enemy dart.
        this.services.enemyDarts.fireDart({
          origin: event.origin,
          direction: event.direction,
          speed: 250,
          damage: event.damage,
          style: 'goober-dart'
        });
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'backboard-hit') {
        sfx?.playEnemyHit(event.position, event.damage);
        feedback?.playArrowEnemy(event.position, event.damage);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'backboard-killed') {
        sfx?.playEnemyDeath(event.position);
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'backboard-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: false, clearDarts: true });
      }
    }
  }
}
