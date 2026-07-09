import type Phaser from 'phaser';

import { HexbrimRenderer, preloadHexbrimAssets } from '../../render/enemies';
import { HexbrimSystem, type HexbrimEvent } from '../../sim/enemies';
import { DoorbertKit } from './doorbertKit';
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
 * summons a Doorbert — a door that keeps letting random minions through
 * until it is destroyed (embedded DoorbertKit); it dissolves with the boss.
 * Reports getBossStatus for the boss HUD bar.
 */
export class HexbrimKit implements EnemyKit {
  readonly kinds: readonly EncounterKind[] = ['hexbrim'];

  private readonly system = new HexbrimSystem();
  private readonly door = new DoorbertKit();
  private services!: EnemyKitServices;
  private renderer?: HexbrimRenderer;

  preload(scene: Phaser.Scene) {
    preloadHexbrimAssets(scene);
    this.door.preload(scene);
  }

  create(services: EnemyKitServices) {
    this.services = services;
    this.renderer = new HexbrimRenderer(services.scene);
    this.renderer.create();
    // The summoned door must never end the boss room on its own.
    this.door.create({ ...services, encounterCleared: () => {} });
  }

  startEncounter(context: EncounterContext) {
    this.door.clear();
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

    this.handleEvents(frame.events, bounds);
    this.renderer?.playEvents(frame.events);

    const show = activeKind === 'hexbrim';
    const doorConsumed = this.door.update(
      timeMs,
      deltaMs,
      bounds,
      playerPosition,
      arrows,
      show ? 'doorbert' : activeKind
    );

    this.renderer?.update(
      timeMs,
      deltaMs,
      show ? this.system.getActiveEntities() : [],
      show ? this.system.getActiveHexOrbs() : [],
      show ? this.system.getActiveFirePatches() : []
    );

    return [...frame.consumedArrowIds, ...doorConsumed];
  }

  debugStep(timeMs: number, deltaMs: number, bounds: RoomBounds, _kind: EncounterKind) {
    const frame = this.system.update(deltaMs, bounds, this.services.getPlayerPosition(), []);

    this.handleEvents(frame.events, bounds);
    this.renderer?.playEvents(frame.events);
    this.door.debugStep(timeMs, deltaMs, bounds, 'doorbert');
    this.renderer?.update(
      timeMs,
      deltaMs,
      this.system.getActiveEntities(),
      this.system.getActiveHexOrbs(),
      this.system.getActiveFirePatches()
    );
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
    this.door.clear();
  }

  destroy() {
    this.renderer?.destroy();
    this.renderer = undefined;
    this.door.destroy();
    this.system.clear();
  }

  private handleEvents(events: readonly HexbrimEvent[], bounds: RoomBounds) {
    const feedback = this.services.getFeedback();
    const sfx = this.services.getSfx();

    for (const event of events) {
      if (event.type === 'hexbrim-spawned') {
        feedback?.playEnemySpawn(event.position);
        sfx?.playPortal(event.position);
        this.services.shakeCamera('room-clear');
        continue;
      }

      if (event.type === 'hexbrim-teleport-out' || event.type === 'hexbrim-teleport-in') {
        sfx?.playPortal(event.position);
        continue;
      }

      if (event.type === 'hexbrim-hexcast') {
        sfx?.playHexOrbLaunch(event.position);
        continue;
      }

      if (event.type === 'hexbrim-witchfire') {
        if (event.positions.length > 0) {
          sfx?.playWitchfireIgnite(event.positions[0]);
        }
        continue;
      }

      if (event.type === 'hexbrim-clones-split') {
        for (const position of event.positions) {
          sfx?.playPortal(position);
        }
        continue;
      }

      if (event.type === 'hexbrim-volley') {
        // 'fan' sprays one bolt per direction; 'stream' fires a speed-staggered
        // three-bolt train down a single lane.
        const speeds = event.pattern === 'stream' ? STREAM_BOLT_SPEEDS : [220];

        sfx?.playSpellBolt(event.origin);

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
        // The witch calls a door; the door keeps calling minions.
        const position = event.positions[0] ?? this.services.getPlayerPosition();

        feedback?.playAnnouncement('THE DOOR ANSWERS', bounds, 'damage');
        sfx?.playShadeSummon(position);
        this.services.duckMusic?.(1200);
        this.services.flashCamera?.(320, 90, 140, 90);
        this.services.shakeCamera('damage');
        this.door.startEncounter({
          kind: 'doorbert',
          spawnPoints: [{ id: 'hexbrim-door', x: position.x, y: position.y }],
          remainingSpawnMarkers: 1,
          wave: 1,
          shroomVariant: 'red'
        });
        continue;
      }

      if (event.type === 'hexbrim-hex-caught') {
        // The orb touched Bowbert (markHexed no-ops during i-frames, so a
        // well-timed tumble phases straight through the orb).
        this.services.hexPlayer?.(event.morphMs);
        sfx?.playSheepMorph(event.position);
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
        sfx?.playRitualBlast(this.services.getPlayerPosition());
        this.services.flashCamera?.(420, 210, 40, 60);
        this.services.damagePlayer(this.services.getPlayerPosition(), event.damage);
        this.services.shakeCamera('damage');
        continue;
      }

      if (event.type === 'hexbrim-channel-started') {
        feedback?.playAnnouncement('THE RITUAL BEGINS', bounds, 'damage');
        sfx?.playRitualChannel(this.services.getPlayerPosition());
        this.services.duckMusic?.(event.durationMs);
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
        sfx?.playEnemyHit(event.position, event.damage, 'magic');
        feedback?.playArrowEnemy(event.position, event.damage);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'hexbrim-clone-dispelled') {
        feedback?.playSporeBreak(event.position);
        continue;
      }

      if (event.type === 'hexbrim-killed') {
        // The summoned door is bound to the boss: it dissolves with it.
        for (const doorPosition of this.door.getDoorPositions()) {
          feedback?.playSporeBreak(doorPosition);
        }

        this.door.clear();
        // A vanish, not a blast: dark moan, soft violet flash, gentle rumble.
        sfx?.playEnemyDeath(event.position, 'magic');
        feedback?.playAnnouncement('HEXBRIM UNRAVELED', bounds, 'clear');
        this.services.flashCamera?.(700, 90, 50, 130);
        this.services.shakeCamera('hit');
        continue;
      }

      if (event.type === 'hexbrim-encounter-cleared') {
        this.services.encounterCleared({ clearSpores: false, clearDarts: true });
      }
    }
  }
}
