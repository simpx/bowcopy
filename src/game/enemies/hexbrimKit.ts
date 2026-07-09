import type Phaser from 'phaser';

import { HexbrimRenderer, preloadHexbrimAssets } from '../../render/enemies';
import { HexbrimSystem, type HexbrimEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/**
 * Chapter boss: floating witch hat + cloak (Hades II headmistress homage).
 * Volleys fire through the shared enemy dart system; the hex circle
 * polymorphs Bowbert into Sheepbert; witchfire leaves burning ground; the
 * ritual (clone split) must be interrupted by hitting the real boss before
 * the channel completes or an arena blast lands. Reports getBossStatus for
 * the boss HUD bar.
 */
export class HexbrimKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['hexbrim'];

  private readonly system = new HexbrimSystem();
  private services!: EnemyKitServices;
  private renderer?: HexbrimRenderer;

  preload(scene: Phaser.Scene) {
    preloadHexbrimAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new HexbrimRenderer(services.scene);
    this.renderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.system.startEncounter(context.spawnPoints, { waveIndex: context.wave });
  }

  hasEncounterStarted(): boolean {
    return this.system.hasEncounterStarted();
  }

  activeEnemyCount(): number {
    return this.system.activeEnemyCount();
  }

  getBossStatus() {
    const status = this.system.bossStatus();

    return status ? { name: 'HEXBRIM', ...status } : null;
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

    const show = activeKind === 'hexbrim';

    this.renderer?.update(
      timeMs,
      deltaMs,
      show ? this.system.getActiveEntities() : [],
      show ? this.system.getActiveHexes() : [],
      show ? this.system.getActiveFirePatches() : []
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
      this.system.getActiveEntities(),
      this.system.getActiveHexes(),
      this.system.getActiveFirePatches()
    );
  }

  debugForceEffect(effect: string, _kind: EncounterKind, _bounds: RoomBounds) {
    if (effect === 'volley' || effect === 'hexcast' || effect === 'witchfire' || effect === 'teleport' || effect === 'clones') {
      this.system.debugForce(effect);
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

  private handleEvents(events: readonly HexbrimEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'hexbrim-spawned') {
        feedback?.playEnemySpawn(event.position);
        this.services.shakeCamera('room-clear');
        continue;
      }

      if (event.type === 'hexbrim-volley') {
        for (const direction of event.directions) {
          this.services.enemyDarts.fireDart({
            origin: event.origin,
            direction,
            speed: 220,
            damage: 1,
            style: 'black-ink'
          });
        }
        continue;
      }

      if (event.type === 'hexbrim-hex-detonated') {
        const player = this.services.getPlayerPosition();
        const gap = Math.hypot(player.x - event.position.x, player.y - event.position.y);

        if (gap <= event.radius) {
          this.services.hexPlayer?.(event.morphMs);
          this.services.shakeCamera('dodge');
        }
        continue;
      }

      if (event.type === 'hexbrim-witchfire-burn') {
        this.services.damagePlayer(event.position, event.damage);
        continue;
      }

      if (event.type === 'hexbrim-ritual-complete') {
        // The finished ritual detonates the whole arena; a well-timed
        // tumble (i-frames) is the only out — damagePlayer respects it.
        this.services.damagePlayer(this.services.getPlayerPosition(), event.damage);
        this.services.shakeCamera('damage');
        continue;
      }

      if (event.type === 'hexbrim-channel-interrupted') {
        feedback?.playEnemySpawn(event.position);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'hexbrim-hit') {
        sfx?.playEnemyHit(event.position, event.damage);
        feedback?.playArrowEnemy(event.position, event.damage);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'hexbrim-clone-dispelled') {
        feedback?.playSporeBreak(event.position);
        continue;
      }

      if (event.type === 'hexbrim-killed') {
        sfx?.playEnemyDeath(event.position);
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('room-clear');
        continue;
      }

      if (event.type === 'hexbrim-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: false, clearDarts: true });
      }
    }
  }
}
