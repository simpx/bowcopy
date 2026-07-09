import type Phaser from 'phaser';

import {
  DartGooberRenderer,
  DoorbertRenderer,
  SpooperGooperRenderer,
  preloadDartGooberAssets,
  preloadDoorbertAssets,
  preloadSpooperGooperAssets
} from '../../render/enemies';
import {
  DartGooberSystem,
  DoorbertSystem,
  SpooperGooperSystem,
  type DartGooberEvent,
  type DoorbertEvent,
  type SpooperGooperEvent
} from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

const MINIONS_PER_BURST = 2;

/**
 * Rooted spawner: the door tears a portal open beside itself and normal
 * minions come out — a random pick of spooper ghosts or dart goobers per
 * burst (kit-owned embedded sims). The door is only damageable while the
 * portal window is open; when it dies, its minions dissipate with it.
 * Also embedded inside HexbrimKit as the boss's summon.
 */
export class DoorbertKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['doorbert'];

  private readonly system = new DoorbertSystem();
  private readonly ghostMinions = new SpooperGooperSystem();
  private readonly gooberMinions = new DartGooberSystem();
  private services!: EnemyKitServices;
  private renderer?: DoorbertRenderer;
  private ghostRenderer?: SpooperGooperRenderer;
  private gooberRenderer?: DartGooberRenderer;

  preload(scene: Phaser.Scene) {
    preloadDoorbertAssets(scene);
    preloadSpooperGooperAssets(scene);
    preloadDartGooberAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new DoorbertRenderer(services.scene);
    this.renderer.create();
    this.ghostRenderer = new SpooperGooperRenderer(services.scene);
    this.ghostRenderer.create();
    this.gooberRenderer = new DartGooberRenderer(services.scene);
    this.gooberRenderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.clearMinions();
    this.system.startEncounter(context.spawnPoints, {
      enemyCount: context.wave >= 3 ? 2 : 1,
      waveIndex: context.wave,
      spawnKeylets: false
    });
  }

  hasEncounterStarted(): boolean {
    return this.system.hasEncounterStarted();
  }

  activeEnemyCount(): number {
    return (
      this.system.activeEnemyCount() +
      this.ghostMinions.getActiveEnemies().length +
      this.gooberMinions.getActiveEnemies().length
    );
  }

  /** For dispel effects when an embedding kit clears the door. */
  getDoorPositions(): SimVector[] {
    return this.system.getActiveDoors().map((door) => ({ ...door.position }));
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
    const ghostFrame = this.ghostMinions.update(deltaMs, bounds, playerPosition, arrows);
    const gooberFrame = this.gooberMinions.update(deltaMs, bounds, playerPosition, arrows);

    this.handleEvents(frame.events);
    this.handleGhostEvents(ghostFrame.events);
    this.handleGooberEvents(gooberFrame.events);
    this.renderer?.playEvents(frame.events);
    this.ghostRenderer?.playEvents(ghostFrame.events);
    this.gooberRenderer?.playEvents(gooberFrame.events);

    const show = activeKind === 'doorbert';

    this.renderer?.update(
      timeMs,
      deltaMs,
      show ? this.system.getActiveDoors() : [],
      show ? this.system.getActiveKeylets() : [],
      playerPosition
    );
    this.ghostRenderer?.update(timeMs, deltaMs, show ? this.ghostMinions.getActiveEnemies() : []);
    this.gooberRenderer?.update(timeMs, deltaMs, show ? this.gooberMinions.getActiveEnemies() : []);

    return [
      ...frame.consumedArrowIds,
      ...ghostFrame.consumedArrowIds,
      ...gooberFrame.consumedArrowIds
    ];
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    const playerPosition = this.services.getPlayerPosition();
    const frame = this.system.update(deltaMs, bounds, playerPosition, []);
    const ghostFrame = this.ghostMinions.update(deltaMs, bounds, playerPosition, []);
    const gooberFrame = this.gooberMinions.update(deltaMs, bounds, playerPosition, []);

    this.handleEvents(frame.events);
    this.handleGhostEvents(ghostFrame.events);
    this.handleGooberEvents(gooberFrame.events);
    this.renderer?.playEvents(frame.events);
    this.ghostRenderer?.playEvents(ghostFrame.events);
    this.gooberRenderer?.playEvents(gooberFrame.events);
    this.renderer?.update(
      timeMs,
      deltaMs,
      this.system.getActiveDoors(),
      this.system.getActiveKeylets(),
      playerPosition
    );
    this.ghostRenderer?.update(timeMs, deltaMs, this.ghostMinions.getActiveEnemies());
    this.gooberRenderer?.update(timeMs, deltaMs, this.gooberMinions.getActiveEnemies());
  }

  debugForceEffect(effect: string, _kind: EncounterKind, _bounds: RoomBounds) {
    if (effect === 'open') {
      this.system.debugForceOpen();
    }
  }

  clear() {
    this.system.clear();
    this.clearMinions();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.ghostRenderer?.destroy();
    this.ghostRenderer = undefined;
    this.gooberRenderer?.destroy();
    this.gooberRenderer = undefined;
    this.system.clear();
    this.clearMinions();
  }

  private clearMinions() {
    this.ghostMinions.clear();
    this.gooberMinions.clear();
  }

  private dissipateMinions() {
    const feedback = this.services.getFeedback();

    for (const minion of [
      ...this.ghostMinions.getActiveEnemies(),
      ...this.gooberMinions.getActiveEnemies()
    ]) {
      feedback?.playSporeBreak(minion.position);
    }

    this.clearMinions();
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

      if (event.type === 'doorbert-burst') {
        // The door lets a random pair of normal minions through.
        this.spawnMinionBurst(event.position);
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

        if (event.type === 'doorbert-killed' && this.system.getActiveDoors().length === 0) {
          // The last door fell: whatever it let through dissipates with it.
          this.dissipateMinions();
        }
        continue;
      }

      if (event.type === 'doorbert-encounter-cleared') {
        this.dissipateMinions();
        this.services.encounterCleared({ clearSpores: false, clearDarts: false });
      }
    }
  }

  private spawnMinionBurst(position: SimVector) {
    const spawnPoints = Array.from({ length: MINIONS_PER_BURST }, (_, index) => ({
      id: `doorbert-minion-${index}`,
      x: position.x + (index === 0 ? -26 : 26),
      y: position.y + (Math.random() - 0.5) * 24
    }));

    if (Math.random() < 0.5) {
      this.ghostMinions.startEncounter(spawnPoints, { enemyCount: MINIONS_PER_BURST });
    } else {
      this.gooberMinions.startEncounter(spawnPoints, { enemyCount: MINIONS_PER_BURST });
    }
  }

  /** Mirrors spooperGooperKit minus encounter-cleared (minions are adds). */
  private handleGhostEvents(events: readonly SpooperGooperEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'spooper-gooper-appeared') {
        feedback?.playEnemySpawn(event.position);
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
        sfx?.playEnemyHit(event.position, event.damage, 'ghost');
        feedback?.playArrowEnemy(event.position, event.damage);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'spooper-gooper-killed') {
        sfx?.playEnemyDeath(event.position, 'ghost');
        feedback?.playEnemyDeath(event.position);
      }
    }
  }

  /** Mirrors dartGooberKit minus encounter-cleared (minions are adds). */
  private handleGooberEvents(events: readonly DartGooberEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'dart-goober-spawned') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'enemy-dart-fired') {
        this.services.enemyDarts.fireDart(event);
        continue;
      }

      if (event.type === 'dart-goober-hit') {
        if (event.hp > 0) {
          sfx?.playEnemyHit(event.position, event.damage, 'squish');
          feedback?.playArrowEnemy(event.position, event.damage);
          this.services.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'dart-goober-killed') {
        sfx?.playEnemyDeath(event.position, 'squish');
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
      }
    }
  }
}
