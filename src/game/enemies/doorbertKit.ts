import type Phaser from 'phaser';

import { DoorbertRenderer, preloadDoorbertAssets } from '../../render/enemies';
import { DoorbertSystem, type DoorbertEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/**
 * Rooted spawner: the door tears a portal open beside itself and keylets hop
 * out; it is only damageable while the portal window is open. Keylets are
 * kit-owned minions (slime-parent precedent).
 */
export class DoorbertKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['doorbert'];

  private readonly system = new DoorbertSystem();
  private services!: EnemyKitServices;
  private renderer?: DoorbertRenderer;

  preload(scene: Phaser.Scene) {
    preloadDoorbertAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new DoorbertRenderer(services.scene);
    this.renderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.system.startEncounter(context.spawnPoints, {
      enemyCount: context.wave >= 3 ? 2 : 1,
      waveIndex: context.wave
    });
  }

  hasEncounterStarted(): boolean {
    return this.system.hasEncounterStarted();
  }

  activeEnemyCount(): number {
    return this.system.activeEnemyCount();
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

    const show = activeKind === 'doorbert';

    this.renderer?.update(
      timeMs,
      deltaMs,
      show ? this.system.getActiveDoors() : [],
      show ? this.system.getActiveKeylets() : [],
      playerPosition
    );

    return frame.consumedArrowIds;
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    const frame = this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(
      timeMs,
      deltaMs,
      this.system.getActiveDoors(),
      this.system.getActiveKeylets(),
      this.services.getPlayerPosition()
    );
  }

  debugForceEffect(effect: string, _kind: EncounterKind, _bounds: RoomBounds) {
    if (effect === 'open') {
      this.system.debugForceOpen();
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

  private handleEvents(events: readonly DoorbertEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'doorbert-portal-opened') {
        sfx?.playDoorCreak(event.position);
        sfx?.playPortal(event.portalPosition);
        continue;
      }

      if (event.type === 'keylet-spawned') {
        feedback?.playEnemySpawn(event.position);
        sfx?.playPortal(event.position);
        continue;
      }

      if (event.type === 'doorbert-spawned') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'keylet-bite') {
        this.services.damagePlayer(event.position, event.damage);
        continue;
      }

      if (event.type === 'doorbert-blocked') {
        feedback?.playArrowWall(event.position);
        continue;
      }

      if (event.type === 'doorbert-hit') {
        sfx?.playEnemyHit(event.position, event.damage);
        feedback?.playArrowEnemy(event.position, event.damage);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'doorbert-killed' || event.type === 'keylet-killed') {
        sfx?.playEnemyDeath(event.position, event.type === 'keylet-killed' ? 'metal' : 'wood');
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'doorbert-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: false, clearDarts: false });
      }
    }
  }
}
