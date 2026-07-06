import Phaser from 'phaser';

import { GAME_SIZE } from '../constants';
import { applyHiDpiCanvas } from '../renderScale';
import { DesktopInputAdapter } from '../../input/DesktopInputAdapter';
import { InputController } from '../../input/InputController';
import { PlayerHealth } from '../PlayerHealth';
import { HeartsHud } from '../../ui/HeartsHud';
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
import { CombatFeedbackRenderer } from '../../render/feedback';
import {
  ArrowProjectileRenderer,
  EnemyDartProjectileRenderer,
  preloadArrowProjectileAssets,
  preloadEnemyDartProjectileAssets
} from '../../render/projectiles';

type CameraShakeKind = 'arrow-fire' | 'hit' | 'damage' | 'dodge' | 'room-clear';

const CAMERA_FRAME = {
  x: 0,
  y: 0,
  width: GAME_SIZE.width,
  height: GAME_SIZE.height
} as const;

const CAMERA_SHAKES: Record<CameraShakeKind, { readonly durationMs: number; readonly intensity: number }> = {
  'arrow-fire': { durationMs: 28, intensity: 0.0006 },
  hit: { durationMs: 42, intensity: 0.001 },
  damage: { durationMs: 90, intensity: 0.0032 },
  dodge: { durationMs: 36, intensity: 0.0014 },
  'room-clear': { durationMs: 130, intensity: 0.0018 }
};

export class CombatRoomScene extends Phaser.Scene {
  private readonly inputController = new InputController();
  private player = new BowbertPlayerModel({
    x: referenceCombatRoom.trigger.x - 132,
    y: referenceCombatRoom.trigger.y + 118
  });
  private readonly playerHealth = new PlayerHealth(3);
  private readonly projectiles = new ArrowProjectileSystem();
  private readonly enemies = new DartGooberSystem();
  private readonly enemyDarts = new EnemyDartProjectileSystem();
  private desktopInput?: DesktopInputAdapter;
  private heartsHud?: HeartsHud;
  private touchOverlay?: TouchInputOverlay;
  private roomRenderer?: CombatRoomRenderer;
  private playerRenderer?: BowbertRenderer;
  private projectileRenderer?: ArrowProjectileRenderer;
  private enemyRenderer?: DartGooberRenderer;
  private enemyDartRenderer?: EnemyDartProjectileRenderer;
  private feedbackRenderer?: CombatFeedbackRenderer;
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
    this.cameras.main.setRoundPixels(true);

    this.roomState = createInitialCombatRoomState();
    this.player = new BowbertPlayerModel({
      x: referenceCombatRoom.trigger.x - 132,
      y: referenceCombatRoom.trigger.y + 118
    });
    this.projectiles.clear();
    this.enemies.clear();
    this.enemyDarts.clear();
    this.playerHealth.reset();

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
    this.feedbackRenderer = new CombatFeedbackRenderer(this);
    this.feedbackRenderer.create();

    this.desktopInput = new DesktopInputAdapter(this, this.inputController, () => this.player.state.position);
    this.createHeartsHud();
    this.createTouchInput();
    this.configureCamera();
    this.centerCameraOnPlayer();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.disposeRuntime, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeRuntime, this);
  }

  update(time: number, delta: number) {
    this.desktopInput?.update();

    const snapshot = this.inputController.consumeSnapshot();
    const playerFrame = this.player.update(snapshot, delta, referenceCombatRoom.bounds);

    this.centerCameraOnPlayer();
    this.handlePlayerEvents(playerFrame.events);
    this.updateRoomTrigger();
    this.updateEnemyEncounter();

    const projectileEvents = this.projectiles.update(delta, referenceCombatRoom.bounds);
    this.handleProjectileEvents(projectileEvents);
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
    this.feedbackRenderer?.update(delta);
  }

  private createTouchInput() {
    const parent = this.game.canvas.parentElement;

    if (parent) {
      this.touchOverlay = new TouchInputOverlay(parent, this.inputController);
    }
  }

  private createHeartsHud() {
    const parent = this.game.canvas.parentElement;

    if (parent) {
      this.heartsHud = new HeartsHud(parent, this.playerHealth.state);
    }
  }

  private handlePlayerEvents(events: readonly BowbertPlayerEvent[]) {
    for (const event of events) {
      if (event.type === 'arrow-fired') {
        this.projectiles.fireArrow(event);
        this.shakeCamera('arrow-fire');
        continue;
      }

      this.feedbackRenderer?.playDodge(this.player.state.position, event.direction);
      this.shakeCamera('dodge');
    }
  }

  private handleProjectileEvents(events: ReturnType<ArrowProjectileSystem['update']>) {
    for (const event of events) {
      if (event.type === 'arrow-hit-boundary') {
        this.feedbackRenderer?.playArrowWall(this.clampToRoomFeedbackPosition(event.position));
      }
    }
  }

  private handleEnemyEvents(events: ReturnType<DartGooberSystem['update']>['events']) {
    for (const event of events) {
      if (event.type === 'dart-goober-spawned') {
        this.feedbackRenderer?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'enemy-dart-fired') {
        this.enemyDarts.fireDart(event);
        continue;
      }

      if (event.type === 'dart-goober-hit') {
        this.feedbackRenderer?.playArrowEnemy(event.position, event.damage);
        this.shakeCamera('hit');
        continue;
      }

      if (event.type === 'dart-goober-killed') {
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.shakeCamera('hit');
        continue;
      }

      if (event.type === 'dart-goober-encounter-cleared') {
        this.applyRoomState(clearCombatRoom(this.roomState));
        this.feedbackRenderer?.playRoomClear(referenceCombatRoom.bounds);
        this.shakeCamera('room-clear');
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

      if (this.player.state.dodge.invulnerableMs > 0) {
        this.feedbackRenderer?.playDodge(this.player.state.position, this.player.state.dodge.direction);
        this.shakeCamera('dodge');
        continue;
      }

      this.player.markHit();
      this.playerHealth.damage(event.damage);
      this.heartsHud?.update(this.playerHealth.state);
      this.heartsHud?.flashDamage();
      this.feedbackRenderer?.playDamage(this.player.state.position, event.damage);
      this.shakeCamera('damage');
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

  private clampToRoomFeedbackPosition(position: { readonly x: number; readonly y: number }) {
    const { bounds } = referenceCombatRoom;
    const readableMargin = bounds.border + 54;

    return {
      x: Phaser.Math.Clamp(position.x, bounds.x + readableMargin, bounds.x + bounds.width - readableMargin),
      y: Phaser.Math.Clamp(position.y, bounds.y + readableMargin, bounds.y + bounds.height - readableMargin)
    };
  }

  private shakeCamera(kind: CameraShakeKind) {
    const shake = CAMERA_SHAKES[kind];

    this.cameras.main.shake(shake.durationMs, shake.intensity);
  }

  private readonly handleScaleResize = () => {
    this.configureCamera();
    this.centerCameraOnPlayer();
  };

  private configureCamera() {
    const camera = this.cameras.main;
    const viewport = applyHiDpiCanvas(this);
    const zoom = Math.max(
      viewport.cssWidth / CAMERA_FRAME.width,
      viewport.cssHeight / CAMERA_FRAME.height
    ) * viewport.pixelRatio;

    camera.setViewport(0, 0, viewport.renderWidth, viewport.renderHeight);
    camera.setZoom(zoom);
    camera.setBounds(CAMERA_FRAME.x, CAMERA_FRAME.y, CAMERA_FRAME.width, CAMERA_FRAME.height);
  }

  private centerCameraOnPlayer() {
    const camera = this.cameras.main;
    const visibleWidth = camera.width / camera.zoom;
    const visibleHeight = camera.height / camera.zoom;
    const minCenterX = CAMERA_FRAME.x + visibleWidth / 2;
    const maxCenterX = CAMERA_FRAME.x + CAMERA_FRAME.width - visibleWidth / 2;
    const minCenterY = CAMERA_FRAME.y + visibleHeight / 2;
    const maxCenterY = CAMERA_FRAME.y + CAMERA_FRAME.height - visibleHeight / 2;
    const centerX =
      minCenterX > maxCenterX
        ? CAMERA_FRAME.x + CAMERA_FRAME.width / 2
        : Phaser.Math.Clamp(this.player.state.position.x, minCenterX, maxCenterX);
    const centerY =
      minCenterY > maxCenterY
        ? CAMERA_FRAME.y + CAMERA_FRAME.height / 2
        : Phaser.Math.Clamp(this.player.state.position.y, minCenterY, maxCenterY);

    camera.centerOn(centerX, centerY);
  }

  private disposeRuntime() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize);
    this.desktopInput?.dispose();
    this.desktopInput = undefined;
    this.heartsHud?.dispose();
    this.heartsHud = undefined;
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
    this.feedbackRenderer?.destroy();
    this.feedbackRenderer = undefined;
    this.projectiles.clear();
    this.enemyDarts.clear();
    this.enemies.clear();
  }
}
