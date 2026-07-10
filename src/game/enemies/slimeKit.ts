import type Phaser from 'phaser';

import { SlimeRenderer, preloadSlimeAssets } from '../../render/enemies';
import { SlimeSystem, type SlimeEvent } from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Hopping slimes; the parent kind splits into children on death. */
export class SlimeKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['slime', 'slime-parent'];

  private readonly system = new SlimeSystem();
  private services!: EnemyKitServices;
  private renderer?: SlimeRenderer;

  preload(scene: Phaser.Scene) {
    preloadSlimeAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new SlimeRenderer(services.scene);
    this.renderer.create();
  }

  startEncounter(context: EncounterContext) {
    if (context.kind === 'slime-parent') {
      this.system.startEncounter(context.spawnPoints, {
        enemyCount: Math.max(1, Math.ceil(context.remainingSpawnMarkers * 0.35)),
        waveIndex: context.wave,
        role: 'parent'
      });
      return;
    }

    this.system.startEncounter(context.spawnPoints, {
      enemyCount: Math.max(4, Math.ceil(context.remainingSpawnMarkers * 1.05)),
      waveIndex: context.wave,
      role: 'child'
    });
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
      this.kinds.includes(activeKind) ? this.system.getActiveEnemies() : []
    );

    return frame.consumedArrowIds;
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);
    this.renderer?.update(timeMs, deltaMs, this.system.getActiveEnemies());
  }

  debugForceEffect(effect: string, kind: EncounterKind, bounds: RoomBounds) {
    if (effect === 'split') {
      this.forceParentSplit(bounds);
      return;
    }

    if (effect === 'damage') {
      this.forceDamagePreview(kind, bounds);
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

  private forceParentSplit(bounds: RoomBounds) {
    const parent = this.system.getActiveEnemies().find((enemy) => enemy.role === 'parent');

    if (!parent) {
      return;
    }

    const arrow: ArrowProjectile = {
      id: -9001,
      previousPosition: { x: parent.position.x - 3, y: parent.position.y },
      position: { x: parent.position.x + 3, y: parent.position.y },
      direction: { x: 1, y: 0 },
      speed: 0,
      damage: 999,
      ageMs: 0,
      ttlMs: 1,
      trail: []
    };
    const frame = this.system.update(16, bounds, this.services.getPlayerPosition(), [arrow]);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(2100, 16, this.system.getActiveEnemies());
  }

  private forceDamagePreview(kind: EncounterKind, bounds: RoomBounds) {
    const targetRole = kind === 'slime-parent' ? 'parent' : 'child';
    const playerPosition = this.services.getPlayerPosition();
    const slime = this.system.getActiveEnemies().find((enemy) => enemy.role === targetRole);

    if (!slime) {
      return;
    }

    slime.position = {
      x: playerPosition.x + 12,
      y: playerPosition.y + 2
    };
    slime.velocity = { x: 0, y: 0 };
    slime.facing = { x: -1, y: 0 };
    slime.phase = 'landing';
    slime.phaseElapsedMs = 0;
    slime.phaseDurationMs = 170;
    slime.spawnProgress = 1;
    slime.jumpProgress = 1;
    slime.airHeight = 0;
    slime.moveAmount = 0;
    slime.squash = targetRole === 'parent' ? 0.18 : 0.2;

    const frame = this.system.update(16, bounds, playerPosition, []);

    this.handleEvents(frame.events);
    this.renderer?.playEvents(frame.events);
    this.renderer?.update(2300, 16, this.system.getActiveEnemies());
  }

  private handleEvents(events: readonly SlimeEvent[]) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'slime-spawned' || event.type === 'slime-split') {
        feedback?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'slime-jumped' || event.type === 'slime-landed') {
        continue;
      }

      if (event.type === 'slime-damaged-player') {
        this.services.damagePlayer(event.position, event.damage);
        continue;
      }

      if (event.type === 'slime-hit') {
        if (event.hp > 0) {
          sfx?.playShroomHit(event.position, event.damage);
          feedback?.playArrowEnemy(event.position, event.damage);
          this.services.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'slime-killed') {
        sfx?.playShroomDeath(event.position);
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
        continue;
      }

      this.services.encounterCleared({ clearSpores: true, clearDarts: true });
    }
  }
}
