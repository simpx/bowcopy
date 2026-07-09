import type Phaser from 'phaser';

import {
  HexbrimRenderer,
  SpooperGooperRenderer,
  preloadHexbrimAssets,
  preloadSpooperGooperAssets
} from '../../render/enemies';
import {
  HexbrimSystem,
  SpooperGooperSystem,
  type HexbrimEvent,
  type SpooperGooperEvent
} from '../../sim/enemies';
import type { SimVector } from '../../sim/player';
import type { ArrowProjectile } from '../../sim/projectiles';
import type { RoomBounds } from '../../sim/rooms';
import type { EncounterContext, EncounterKind, EnemyKit, EnemyKitServices } from './EnemyKit';

/** Stream volley: same lane, staggered speeds, arrives as a bolt train. */
const STREAM_BOLT_SPEEDS = [170, 225, 285] as const;

/**
 * Chapter boss: floating witch hat + cloak (Hades II headmistress homage).
 * Volleys fire through the shared enemy dart system; the hex circle
 * polymorphs Bowbert into Sheepbert; witchfire leaves burning ground; the
 * ritual (clone split) must be interrupted by hitting the real boss before
 * the channel completes or an arena blast lands. At half health the boss
 * summons two Spooper Gooper shades (an embedded spooper sim); they dissipate
 * when the boss dies. Reports getBossStatus for the boss HUD bar.
 */
export class HexbrimKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['hexbrim'];

  private readonly system = new HexbrimSystem();
  private readonly shades = new SpooperGooperSystem();
  private services!: EnemyKitServices;
  private renderer?: HexbrimRenderer;
  private shadeRenderer?: SpooperGooperRenderer;

  preload(scene: Phaser.Scene) {
    preloadHexbrimAssets(scene);
    preloadSpooperGooperAssets(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new HexbrimRenderer(services.scene);
    this.renderer.create();
    this.shadeRenderer = new SpooperGooperRenderer(services.scene);
    this.shadeRenderer.create();
  }

  startEncounter(context: EncounterContext) {
    this.shades.clear();
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

    return status
      ? { name: 'HEXBRIM', ...status, castProgress: this.system.channelProgress() }
      : null;
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
    const shadeFrame = this.shades.update(deltaMs, bounds, playerPosition, arrows);

    this.handleEvents(frame.events, bounds);
    this.handleShadeEvents(shadeFrame.events);
    this.renderer?.playEvents(frame.events);
    this.shadeRenderer?.playEvents(shadeFrame.events);

    const show = activeKind === 'hexbrim';

    this.renderer?.update(
      timeMs,
      deltaMs,
      show ? this.system.getActiveEntities() : [],
      show ? this.system.getActiveHexOrbs() : [],
      show ? this.system.getActiveFirePatches() : []
    );
    this.shadeRenderer?.update(timeMs, deltaMs, show ? this.shades.getActiveEnemies() : []);

    return [...frame.consumedArrowIds, ...shadeFrame.consumedArrowIds];
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    const frame = this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);
    const shadeFrame = this.shades.update(deltaMs, bounds, this.services.getPlayerPosition(), []);

    this.handleEvents(frame.events, bounds);
    this.handleShadeEvents(shadeFrame.events);
    this.renderer?.playEvents(frame.events);
    this.shadeRenderer?.playEvents(shadeFrame.events);
    this.renderer?.update(
      timeMs,
      deltaMs,
      this.system.getActiveEntities(),
      this.system.getActiveHexOrbs(),
      this.system.getActiveFirePatches()
    );
    this.shadeRenderer?.update(timeMs, deltaMs, this.shades.getActiveEnemies());
  }

  debugForceEffect(effect: string, _kind: EncounterKind, _bounds: RoomBounds) {
    if (
      effect === 'volley' ||
      effect === 'hexcast' ||
      effect === 'witchfire' ||
      effect === 'teleport' ||
      effect === 'clones' ||
      effect === 'summon'
    ) {
      this.system.debugForce(effect);
    }
  }

  clear() {
    this.system.clear();
    this.shades.clear();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.shadeRenderer?.destroy();
    this.shadeRenderer = undefined;
    this.system.clear();
    this.shades.clear();
  }

  private handleEvents(events: readonly HexbrimEvent[], bounds: RoomBounds) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'hexbrim-spawned') {
        feedback?.playEnemySpawn(event.position);
        this.services.shakeCamera('room-clear');
        continue;
      }

      if (event.type === 'hexbrim-volley') {
        // 'fan' sprays one bolt per direction; 'stream' fires a speed-staggered
        // three-bolt train down a single lane.
        const speeds = event.pattern === 'stream' ? STREAM_BOLT_SPEEDS : [220];

        for (const direction of event.directions) {
          for (const speed of speeds) {
            this.services.enemyDarts.fireDart({
              origin: event.origin,
              direction,
              speed,
              damage: 1,
              style: 'black-ink'
            });
          }
        }
        continue;
      }

      if (event.type === 'hexbrim-summon') {
        feedback?.playAnnouncement('SHADES ANSWER', bounds, 'damage');
        this.services.flashCamera?.(320, 90, 140, 90);
        this.services.shakeCamera('damage');
        this.shades.startEncounter(
          event.positions.map((position, index) => ({
            id: `hexbrim-shade-${index}`,
            x: position.x,
            y: position.y
          })),
          { enemyCount: event.positions.length }
        );
        continue;
      }

      if (event.type === 'hexbrim-hex-caught') {
        // The orb touched Bowbert (markHexed no-ops during i-frames, so a
        // well-timed tumble phases straight through the orb).
        this.services.hexPlayer?.(event.morphMs);
        this.services.shakeCamera('dodge');
        continue;
      }

      if (event.type === 'hexbrim-witchfire-burn') {
        this.services.damagePlayer(event.position, event.damage);
        continue;
      }

      if (event.type === 'hexbrim-ritual-complete') {
        // The finished ritual detonates the whole arena; a well-timed
        // tumble (i-frames) is the only out — damagePlayer respects it.
        feedback?.playAnnouncement('TOO SLOW', bounds, 'damage');
        this.services.flashCamera?.(420, 210, 40, 60);
        this.services.damagePlayer(this.services.getPlayerPosition(), event.damage);
        this.services.shakeCamera('damage');
        continue;
      }

      if (event.type === 'hexbrim-channel-started') {
        feedback?.playAnnouncement('THE RITUAL BEGINS', bounds, 'damage');
        this.services.flashCamera?.(320, 138, 60, 190);
        this.services.shakeCamera('damage');
        continue;
      }

      if (event.type === 'hexbrim-channel-interrupted') {
        feedback?.playAnnouncement('RITUAL BROKEN', bounds, 'clear');
        this.services.flashCamera?.(200, 255, 255, 255);
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
        // Shades are bound to the boss: they dissipate the moment it dies.
        for (const shade of this.shades.getActiveEnemies()) {
          feedback?.playSporeBreak(shade.position);
        }

        this.shades.clear();
        sfx?.playEnemyDeath(event.position);
        feedback?.playEnemyDeath(event.position);
        feedback?.playAnnouncement('HEXBRIM UNRAVELED', bounds, 'clear');
        this.services.flashCamera?.(600, 255, 255, 255);
        this.services.shakeCamera('room-clear');
        continue;
      }

      if (event.type === 'hexbrim-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: false, clearDarts: true });
      }
    }
  }

  /** Mirrors spooperGooperKit's routing, minus encounter-cleared (the shades
   *  are adds — only the boss ends the encounter). */
  private handleShadeEvents(events: readonly SpooperGooperEvent[]) {
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
        sfx?.playEnemyHit(event.position, event.damage);
        feedback?.playArrowEnemy(event.position, event.damage);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'spooper-gooper-killed') {
        sfx?.playEnemyDeath(event.position);
        feedback?.playEnemyDeath(event.position);
        this.services.shakeCamera('hit');
      }
    }
  }
}
