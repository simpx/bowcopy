import type Phaser from 'phaser';

import {
  DartGooberRenderer,
  DartTriGooberRenderer,
  preloadDartGooberAssets,
  preloadDartTriGooberAssets
} from '../../render/enemies';
import { DartGooberSystem, type DartGooberEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Dart Goober and its tri-shot variant share one sim; the kind picks the renderer. */
export class DartGooberKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['dart-goober', 'dart-tri-goober'];

  private readonly system = new DartGooberSystem();
  private services!: EnemyKitServices;
  private renderer?: DartGooberRenderer;
  private triRenderer?: DartTriGooberRenderer;

  preload(scene: Phaser.Scene) {
    preloadDartGooberAssets(scene);
    preloadDartTriGooberAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new DartGooberRenderer(services.scene);
    this.renderer.create();
    this.triRenderer = new DartTriGooberRenderer(services.scene);
    this.triRenderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.system.startEncounter(context.spawnPoints, {
      enemyCount: context.remainingSpawnMarkers,
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

    const active = this.kinds.includes(activeKind) ? this.system.getActiveEnemies() : [];
    const activeForTri = activeKind === 'dart-tri-goober' ? active : [];
    const activeForBase = activeKind === 'dart-goober' ? active : [];

    if (activeKind === 'dart-tri-goober') {
      this.triRenderer?.playEvents(frame.events);
    } else if (activeKind === 'dart-goober') {
      this.renderer?.playEvents(frame.events);
    }

    this.renderer?.update(timeMs, deltaMs, activeForBase);
    this.triRenderer?.update(timeMs, deltaMs, activeForTri);

    return frame.consumedArrowIds;
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, kind: EncounterKind) {
    this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);

    if (kind === 'dart-tri-goober') {
      this.triRenderer?.update(timeMs, deltaMs, this.system.getActiveEnemies());
    } else {
      this.renderer?.update(timeMs, deltaMs, this.system.getActiveEnemies());
    }
  }

  clear() {
    this.system.clear();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.triRenderer?.destroy();
    this.triRenderer = undefined;
    this.system.clear();
  }

  private handleEvents(events: readonly DartGooberEvent[]) {
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
        continue;
      }

      if (event.type === 'dart-goober-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: false, clearDarts: false });
      }
    }
  }
}
