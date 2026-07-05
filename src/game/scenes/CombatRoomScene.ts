import Phaser from 'phaser';

import { DesktopInputAdapter } from '../../input/DesktopInputAdapter';
import { InputController } from '../../input/InputController';
import { TouchInputOverlay } from '../../ui/TouchInputOverlay';
import { BowbertPlayerModel, type BowbertPlayerEvent } from '../../sim/player';
import { DartGooberSystem } from '../../sim/enemies';
import { ArrowProjectileSystem, EnemyDartProjectileSystem } from '../../sim/projectiles';
import {
  clearCombatRoom,
  createInitialCombatRoomState,
  referenceCombatRoom,
  startCombatFromTrigger,
  type CombatRoomState
} from '../../sim/rooms';
import { CombatRoomRenderer, preloadCombatRoomAssets } from '../../render/rooms';
import { BowbertRenderer, preloadBowbertPlayerAssets } from '../../render/player';
import { DartGooberRenderer, preloadDartGooberAssets } from '../../render/enemies';
import {
  ArrowProjectileRenderer,
  EnemyDartProjectileRenderer,
  preloadArrowProjectileAssets,
  preloadEnemyDartProjectileAssets
} from '../../render/projectiles';

export class CombatRoomScene extends Phaser.Scene {
  private readonly inputController = new InputController();
  private player = new BowbertPlayerModel({
    x: referenceCombatRoom.trigger.x - 132,
    y: referenceCombatRoom.trigger.y + 118
  });
  private readonly projectiles = new ArrowProjectileSystem();
  private readonly enemies = new DartGooberSystem();
  private readonly enemyDarts = new EnemyDartProjectileSystem();
  private desktopInput?: DesktopInputAdapter;
  private touchOverlay?: TouchInputOverlay;
  private roomRenderer?: CombatRoomRenderer;
  private playerRenderer?: BowbertRenderer;
  private projectileRenderer?: ArrowProjectileRenderer;
  private enemyRenderer?: DartGooberRenderer;
  private enemyDartRenderer?: EnemyDartProjectileRenderer;
  private roomState: CombatRoomState = createInitialCombatRoomState();

  constructor() {
    super('CombatRoomScene');
  }

  preload() {
    preloadCombatRoomAssets(this);
    preloadBowbertPlayerAssets(this);
    preloadArrowProjectileAssets(this);
    preloadEnemyDartProjectileAssets(this);
    preloadDartGooberAssets(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b120d');
    this.cameras.main.setRoundPixels(false);

    this.roomState = createInitialCombatRoomState();
    this.player = new BowbertPlayerModel({
      x: referenceCombatRoom.trigger.x - 132,
      y: referenceCombatRoom.trigger.y + 118
    });
    this.projectiles.clear();
    this.enemies.clear();
    this.enemyDarts.clear();

    this.roomRenderer = new CombatRoomRenderer(this, referenceCombatRoom);
    this.roomRenderer.create();
    this.applyRoomState(this.roomState);

    this.projectileRenderer = new ArrowProjectileRenderer(this);
    this.projectileRenderer.create();
    this.enemyDartRenderer = new EnemyDartProjectileRenderer(this);
    this.enemyDartRenderer.create();
    this.enemyRenderer = new DartGooberRenderer(this);
    this.enemyRenderer.create();
    this.playerRenderer = new BowbertRenderer(this);
    this.playerRenderer.create();
    this.playerRenderer.update(0, 0, this.player.state);

    this.desktopInput = new DesktopInputAdapter(this, this.inputController, () => this.player.state.position);
    this.createTouchInput();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.disposeRuntime, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeRuntime, this);
  }

  update(time: number, delta: number) {
    this.desktopInput?.update();

    const snapshot = this.inputController.consumeSnapshot();
    const playerFrame = this.player.update(snapshot, delta, referenceCombatRoom.bounds);

    this.handlePlayerEvents(playerFrame.events);
    this.updateRoomTrigger();
    this.updateEnemyEncounter();

    const projectileEvents = this.projectiles.update(delta, referenceCombatRoom.bounds);
    const enemyFrame = this.enemies.update(
      delta,
      referenceCombatRoom.bounds,
      playerFrame.state.position,
      this.projectiles.getActiveArrows()
    );

    for (const arrowId of enemyFrame.consumedArrowIds) {
      this.projectiles.removeArrow(arrowId);
    }

    this.handleEnemyEvents(enemyFrame.events);

    const enemyDartEvents = this.enemyDarts.update(
      delta,
      referenceCombatRoom.bounds,
      playerFrame.state.position
    );

    this.handleEnemyDartEvents(enemyDartEvents);

    this.projectileRenderer?.playEvents(projectileEvents);
    this.enemyRenderer?.playEvents(enemyFrame.events);
    this.enemyDartRenderer?.playEvents(enemyDartEvents);
    this.projectileRenderer?.update(delta, this.projectiles.getActiveArrows());
    this.enemyDartRenderer?.update(delta, this.enemyDarts.getActiveDarts());
    this.enemyRenderer?.update(time, delta, this.enemies.getActiveEnemies());
    this.playerRenderer?.update(time, delta, playerFrame.state);
  }

  private createTouchInput() {
    const parent = this.game.canvas.parentElement;

    if (parent) {
      this.touchOverlay = new TouchInputOverlay(parent, this.inputController);
    }
  }

  private handlePlayerEvents(events: readonly BowbertPlayerEvent[]) {
    for (const event of events) {
      if (event.type === 'arrow-fired') {
        this.projectiles.fireArrow(event);
        this.cameras.main.shake(35, 0.0008);
        continue;
      }

      this.cameras.main.shake(45, 0.0011);
    }
  }

  private handleEnemyEvents(events: ReturnType<DartGooberSystem['update']>['events']) {
    for (const event of events) {
      if (event.type === 'enemy-dart-fired') {
        this.enemyDarts.fireDart(event);
        continue;
      }

      if (event.type === 'dart-goober-hit') {
        this.cameras.main.shake(35, 0.0008);
        continue;
      }

      if (event.type === 'dart-goober-killed') {
        this.cameras.main.shake(70, 0.0015);
        continue;
      }

      if (event.type === 'dart-goober-encounter-cleared') {
        this.applyRoomState(clearCombatRoom(this.roomState));
      }
    }
  }

  private handleEnemyDartEvents(
    events: ReturnType<EnemyDartProjectileSystem['update']>
  ) {
    for (const event of events) {
      if (event.type !== 'enemy-dart-hit-player') {
        continue;
      }

      this.player.markHit();
      this.cameras.main.shake(45, 0.001);
    }
  }

  private updateRoomTrigger() {
    if (this.roomState.phase !== 'open') {
      return;
    }

    const nextState = startCombatFromTrigger(
      referenceCombatRoom,
      this.roomState,
      this.player.state.position
    );

    if (nextState !== this.roomState) {
      this.applyRoomState(nextState);
    }
  }

  private updateEnemyEncounter() {
    if (this.roomState.phase !== 'combat' || this.enemies.hasEncounterStarted()) {
      return;
    }

    this.enemies.startEncounter(referenceCombatRoom.spawnPoints);
  }

  private applyRoomState(state: CombatRoomState) {
    this.roomState = state;
    this.roomRenderer?.setState(this.roomState);
  }

  private disposeRuntime() {
    this.desktopInput?.dispose();
    this.desktopInput = undefined;
    this.touchOverlay?.dispose();
    this.touchOverlay = undefined;
    this.playerRenderer?.destroy();
    this.playerRenderer = undefined;
    this.projectileRenderer?.destroy();
    this.projectileRenderer = undefined;
    this.enemyRenderer?.destroy();
    this.enemyRenderer = undefined;
    this.enemyDartRenderer?.destroy();
    this.enemyDartRenderer = undefined;
    this.projectiles.clear();
    this.enemyDarts.clear();
    this.enemies.clear();
  }
}
