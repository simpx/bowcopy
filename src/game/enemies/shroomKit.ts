import type Phaser from 'phaser';

import {
  PURPLE_SHROOM_CHARACTER,
  RED_SHROOM_CHARACTER
} from '../../render/characters/layeredCharacterConfig';
import { RedShroomRenderer, preloadRedShroomAssets } from '../../render/enemies';
import { RedShroomSystem, type RedShroomEvent, type ShroomVariant } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Red/purple shroom encounters: stationary spore bursts through the shared spore system. */
export class ShroomKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['red-shroom'];

  private readonly system = new RedShroomSystem();
  private services!: EnemyKitServices;
  private renderer?: RedShroomRenderer;
  private variant: ShroomVariant = 'red';

  preload(scene: Phaser.Scene) {
    preloadRedShroomAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new RedShroomRenderer(services.scene);
    this.renderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.variant = context.shroomVariant;
    this.system.startEncounter(context.spawnPoints, {
      enemyCount: Math.max(4, Math.ceil(context.remainingSpawnMarkers * 0.95)),
      waveIndex: context.wave,
      variant: context.shroomVariant
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
      activeKind === 'red-shroom' ? this.system.getActiveEnemies() : []
    );

    return frame.consumedArrowIds;
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);
    this.renderer?.update(timeMs, deltaMs, this.system.getActiveEnemies());
  }

  debugForceEffect(effect: string, _kind: EncounterKind, bounds: RoomBounds) {
    if (effect !== 'spore') {
      return;
    }

    const character = this.variant === 'purple' ? PURPLE_SHROOM_CHARACTER : RED_SHROOM_CHARACTER;
    const shrooms = this.system.getActiveEnemies();
    const center = {
      x: bounds.x + bounds.width * 0.5,
      y: bounds.y + bounds.height * 0.44
    };
    const source = shrooms[0]?.position ?? center;
    const origin = {
      x: source.x,
      y: source.y + character.spores.originOffsetY
    };

    for (const shroom of shrooms) {
      shroom.phase = 'recovering';
      shroom.sporeCharge = 0;
      shroom.releasePulse = 1;
      shroom.dizzyMs = 900;
    }

    this.services.shroomSpores.fireBurst({
      variant: this.variant,
      origin,
      distance: character.spores.burstDistance,
      travelMs: character.spores.travelMs,
      lingerMs: character.spores.lingerMs,
      damage: 0.5,
      radius: 15,
      color: character.spores.trailColor
    });

    this.renderer?.update(2600, 16, shrooms);
    this.services.debugPumpShroomSpores(4, 120, bounds);
  }

  clear() {
    this.system.clear();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.system.clear();
  }

  private handleEvents(events: readonly RedShroomEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'red-shroom-spawned') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'red-shroom-spore-burst') {
        this.services.shroomSpores.fireBurst(event);
        continue;
      }

      if (event.type === 'red-shroom-hit') {
        if (event.hp > 0) {
          sfx?.playShroomHit(event.position, event.damage);
          feedback?.playArrowEnemy(event.position, event.damage);
          this.services.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'red-shroom-killed') {
        sfx?.playShroomDeath(event.position);
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'red-shroom-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: true, clearDarts: false });
      }
    }
  }
}
