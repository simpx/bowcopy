import Phaser from 'phaser';

import { GAME_SIZE } from '../constants';
import { applyHiDpiCanvas } from '../renderScale';
import { DesktopInputAdapter } from '../../input/DesktopInputAdapter';
import { InputController } from '../../input/InputController';
import { PlayerHealth } from '../PlayerHealth';
import { DungeonMinimap } from '../../ui/DungeonMinimap';
import { HeartsHud } from '../../ui/HeartsHud';
import { TouchInputOverlay } from '../../ui/TouchInputOverlay';
import { BowbertPlayerModel, type BowbertPlayerEvent } from '../../sim/player';
import { DartGooberSystem, RedShroomSystem, type ShroomVariant } from '../../sim/enemies';
import { ArrowProjectileSystem, EnemyDartProjectileSystem, ShroomSporeProjectileSystem } from '../../sim/projectiles';
import { CombatSfxDirector, preloadCombatSfx } from '../../audio/CombatSfxDirector';
import {
  OPPOSITE_DOOR_SIDE,
  clearCurrentDungeonRoom,
  createCombatRoomDefinitionForDungeonRoom,
  createInitialDungeonState,
  enterDungeonRoom,
  getCurrentDungeonRoom,
  getNeighborDungeonRoom,
  referenceCombatRoom,
  startCurrentDungeonRoomCombat,
  type CombatRoomDefinition,
  type DungeonState,
  type RoomDoorSide
} from '../../sim/rooms';
import { CombatRoomRenderer, preloadCombatRoomAssets } from '../../render/rooms';
import { BowbertRenderer, preloadBowbertPlayerAssets } from '../../render/player';
import { DartGooberRenderer, RedShroomRenderer, preloadDartGooberAssets, preloadRedShroomAssets } from '../../render/enemies';
import { CombatFeedbackRenderer } from '../../render/feedback';
import {
  ArrowProjectileRenderer,
  EnemyDartProjectileRenderer,
  ShroomSporeProjectileRenderer,
  preloadArrowProjectileAssets,
  preloadEnemyDartProjectileAssets,
  preloadShroomSporeProjectileAssets
} from '../../render/projectiles';

type CameraShakeKind = 'arrow-fire' | 'hit' | 'damage' | 'dodge' | 'room-clear';
type EncounterKind = 'dart-goober' | 'red-shroom';

const CAMERA_VIEW = GAME_SIZE;
const PLAYER_START = {
  x: referenceCombatRoom.bounds.x + referenceCombatRoom.bounds.width / 2,
  y: referenceCombatRoom.bounds.y + referenceCombatRoom.bounds.height / 2 + 120
} as const;
const DOOR_EXIT_MOVE_THRESHOLD = 0.32;
const DOOR_EXIT_INSET = 38;
const DOOR_ENTRY_INSET = 64;

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
    x: PLAYER_START.x,
    y: PLAYER_START.y
  });
  private readonly playerHealth = new PlayerHealth(5);
  private readonly projectiles = new ArrowProjectileSystem();
  private readonly enemies = new DartGooberSystem();
  private readonly redShrooms = new RedShroomSystem();
  private readonly enemyDarts = new EnemyDartProjectileSystem();
  private readonly shroomSpores = new ShroomSporeProjectileSystem();
  private desktopInput?: DesktopInputAdapter;
  private dungeonMinimap?: DungeonMinimap;
  private heartsHud?: HeartsHud;
  private touchOverlay?: TouchInputOverlay;
  private roomRenderer?: CombatRoomRenderer;
  private playerRenderer?: BowbertRenderer;
  private projectileRenderer?: ArrowProjectileRenderer;
  private enemyRenderer?: DartGooberRenderer;
  private redShroomRenderer?: RedShroomRenderer;
  private enemyDartRenderer?: EnemyDartProjectileRenderer;
  private shroomSporeRenderer?: ShroomSporeProjectileRenderer;
  private feedbackRenderer?: CombatFeedbackRenderer;
  private sfx?: CombatSfxDirector;
  private dungeonState: DungeonState = createInitialDungeonState();
  private currentRoomDefinition: CombatRoomDefinition = referenceCombatRoom;

  constructor() {
    super('CombatRoomScene');
  }

  preload() {
    preloadCombatRoomAssets(this);
    preloadBowbertPlayerAssets(this);
    preloadArrowProjectileAssets(this);
    preloadEnemyDartProjectileAssets(this);
    preloadShroomSporeProjectileAssets(this);
    preloadDartGooberAssets(this);
    preloadRedShroomAssets(this);
    preloadCombatSfx(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b120d');
    this.cameras.main.setRoundPixels(true);

    this.dungeonState = createInitialDungeonState();
    this.currentRoomDefinition = createCombatRoomDefinitionForDungeonRoom(
      this.dungeonState,
      getCurrentDungeonRoom(this.dungeonState)
    );
    this.player = new BowbertPlayerModel({
      x: PLAYER_START.x,
      y: PLAYER_START.y
    });
    this.projectiles.clear();
    this.enemies.clear();
    this.redShrooms.clear();
    this.enemyDarts.clear();
    this.shroomSpores.clear();
    this.playerHealth.reset();

    this.roomRenderer = new CombatRoomRenderer(this, this.currentRoomDefinition);
    this.roomRenderer.create();
    this.applyCurrentRoomState();

    this.projectileRenderer = new ArrowProjectileRenderer(this);
    this.projectileRenderer.create();
    this.enemyDartRenderer = new EnemyDartProjectileRenderer(this);
    this.enemyDartRenderer.create();
    this.shroomSporeRenderer = new ShroomSporeProjectileRenderer(this);
    this.shroomSporeRenderer.create();
    this.enemyRenderer = new DartGooberRenderer(this);
    this.enemyRenderer.create();
    this.redShroomRenderer = new RedShroomRenderer(this);
    this.redShroomRenderer.create();
    this.playerRenderer = new BowbertRenderer(this);
    this.playerRenderer.create();
    this.playerRenderer.update(0, 0, this.player.state);
    this.feedbackRenderer = new CombatFeedbackRenderer(this);
    this.feedbackRenderer.create();
    this.sfx = new CombatSfxDirector(this);

    this.desktopInput = new DesktopInputAdapter(this, this.inputController, () => this.player.state.position);
    this.createHeartsHud();
    this.createDungeonMinimap();
    this.createTouchInput();
    this.configureCamera();
    this.centerCameraOnRoom();

    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleScaleResize);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.disposeRuntime, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeRuntime, this);
  }

  update(time: number, delta: number) {
    this.desktopInput?.update();

    const snapshot = this.inputController.consumeSnapshot();
    const playerFrame = this.player.update(snapshot, delta, this.currentRoomDefinition.bounds);

    this.tryMoveThroughOpenDoor(snapshot.move);
    this.centerCameraOnRoom();
    this.handlePlayerEvents(playerFrame.events);
    this.updateEnemyEncounter();

    const projectileEvents = this.projectiles.update(delta, this.currentRoomDefinition.bounds);
    this.handleProjectileEvents(projectileEvents);
    const enemyFrame = this.enemies.update(
      delta,
      this.currentRoomDefinition.bounds,
      playerFrame.state.position,
      this.projectiles.getActiveArrows()
    );

    for (const arrowId of enemyFrame.consumedArrowIds) {
      this.projectiles.removeArrow(arrowId);
    }

    this.handleEnemyEvents(enemyFrame.events);
    const redShroomFrame = this.redShrooms.update(
      delta,
      this.currentRoomDefinition.bounds,
      playerFrame.state.position,
      this.projectiles.getActiveArrows()
    );

    for (const arrowId of redShroomFrame.consumedArrowIds) {
      this.projectiles.removeArrow(arrowId);
    }

    this.handleRedShroomEvents(redShroomFrame.events);

    const enemyDartEvents = this.enemyDarts.update(
      delta,
      this.currentRoomDefinition.bounds,
      playerFrame.state.position
    );
    const shroomSporeEvents = this.shroomSpores.update(
      delta,
      this.currentRoomDefinition.bounds,
      playerFrame.state.position,
      {
        playerBreaksSpores: playerFrame.state.dodge.activeMs > 0 || playerFrame.state.dodge.invulnerableMs > 0
      }
    );

    this.handleEnemyDartEvents(enemyDartEvents);
    this.handleShroomSporeEvents(shroomSporeEvents);

    this.projectileRenderer?.playEvents(projectileEvents);
    this.enemyRenderer?.playEvents(enemyFrame.events);
    this.redShroomRenderer?.playEvents(redShroomFrame.events);
    this.enemyDartRenderer?.playEvents(enemyDartEvents);
    this.shroomSporeRenderer?.playEvents(shroomSporeEvents);
    this.projectileRenderer?.update(delta, this.projectiles.getActiveArrows());
    this.enemyDartRenderer?.update(delta, this.enemyDarts.getActiveDarts());
    this.shroomSporeRenderer?.update(delta, this.shroomSpores.getActiveSpores());
    this.enemyRenderer?.update(time, delta, this.enemies.getActiveEnemies());
    this.redShroomRenderer?.update(time, delta, this.redShrooms.getActiveEnemies());
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

  private createDungeonMinimap() {
    const parent = this.game.canvas.parentElement;

    if (parent) {
      this.dungeonMinimap = new DungeonMinimap(parent, this.dungeonState);
    }
  }

  private handlePlayerEvents(events: readonly BowbertPlayerEvent[]) {
    for (const event of events) {
      if (event.type === 'arrow-fired') {
        this.projectiles.fireArrow(event);
        this.sfx?.playArrowFire(event.origin);
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
        if (event.hp > 0) {
          this.sfx?.playEnemyHit(event.position, event.damage);
          this.feedbackRenderer?.playArrowEnemy(event.position, event.damage);
          this.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'dart-goober-killed') {
        this.sfx?.playEnemyDeath(event.position);
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.shakeCamera('hit');
        continue;
      }

      if (event.type === 'dart-goober-encounter-cleared') {
        clearCurrentDungeonRoom(this.dungeonState);
        this.applyCurrentRoomState();
        this.feedbackRenderer?.playRoomClear(this.currentRoomDefinition.bounds);
        this.shakeCamera('room-clear');
      }
    }
  }

  private handleRedShroomEvents(events: ReturnType<RedShroomSystem['update']>['events']) {
    for (const event of events) {
      if (event.type === 'red-shroom-spawned') {
        this.feedbackRenderer?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'red-shroom-spore-burst') {
        this.shroomSpores.fireBurst(event);
        continue;
      }

      if (event.type === 'red-shroom-hit') {
        if (event.hp > 0) {
          this.sfx?.playEnemyHit(event.position, event.damage);
          this.feedbackRenderer?.playArrowEnemy(event.position, event.damage);
          this.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'red-shroom-killed') {
        this.sfx?.playEnemyDeath(event.position);
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.shakeCamera('hit');
        continue;
      }

      if (event.type === 'red-shroom-encounter-cleared') {
        clearCurrentDungeonRoom(this.dungeonState);
        this.shroomSpores.clear();
        this.applyCurrentRoomState();
        this.feedbackRenderer?.playRoomClear(this.currentRoomDefinition.bounds);
        this.shakeCamera('room-clear');
      }
    }
  }

  private handleEnemyDartEvents(
    events: ReturnType<EnemyDartProjectileSystem['update']>
  ) {
    for (const event of events) {
      if (event.type === 'enemy-dart-hit-boundary') {
        this.sfx?.playDartWall(event.position);
        continue;
      }

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
      this.sfx?.playPlayerDamage(event.position, event.damage);
      this.heartsHud?.update(this.playerHealth.state);
      this.heartsHud?.flashDamage();
      this.feedbackRenderer?.playDamage(this.player.state.position, event.damage);
      this.shakeCamera('damage');
    }
  }

  private handleShroomSporeEvents(
    events: ReturnType<ShroomSporeProjectileSystem['update']>
  ) {
    for (const event of events) {
      if (event.type === 'shroom-spore-dodge-broken') {
        this.sfx?.playSporeBreak(event.position);
        this.feedbackRenderer?.playSporeBreak(event.position);
        this.shakeCamera('dodge');
        continue;
      }

      if (event.type !== 'shroom-spore-hit-player') {
        continue;
      }

      if (this.player.state.dodge.invulnerableMs > 0) {
        this.feedbackRenderer?.playDodge(this.player.state.position, this.player.state.dodge.direction);
        this.shakeCamera('dodge');
        continue;
      }

      this.player.markHit();
      this.playerHealth.damage(event.damage);
      this.sfx?.playPlayerDamage(event.position, event.damage);
      this.heartsHud?.update(this.playerHealth.state);
      this.heartsHud?.flashDamage();
      this.feedbackRenderer?.playDamage(this.player.state.position, event.damage);
      this.shakeCamera('damage');
    }
  }

  private updateEnemyEncounter() {
    const roomState = getCurrentDungeonRoom(this.dungeonState);

    if (roomState.phase !== 'combat' || this.hasCurrentEncounterStarted()) {
      return;
    }

    this.startCurrentRoomEncounter();
  }

  private startCurrentRoomEncounter() {
    const roomState = getCurrentDungeonRoom(this.dungeonState);

    if (this.getCurrentEncounterKind() === 'red-shroom') {
      this.redShrooms.startEncounter(this.currentRoomDefinition.spawnPoints, {
        enemyCount: Math.max(4, Math.ceil(roomState.remainingSpawnMarkers * 0.95)),
        waveIndex: roomState.wave,
        variant: this.getCurrentShroomVariant()
      });
    } else {
      this.enemies.startEncounter(this.currentRoomDefinition.spawnPoints, {
        enemyCount: roomState.remainingSpawnMarkers,
        waveIndex: roomState.wave
      });
    }
  }

  private startCombatInCurrentRoomIfNeeded() {
    const roomState = getCurrentDungeonRoom(this.dungeonState);

    if (roomState.phase !== 'open') {
      return;
    }

    startCurrentDungeonRoomCombat(this.dungeonState);
    this.enemies.clear();
    this.redShrooms.clear();
    this.enemyDarts.clear();
    this.shroomSpores.clear();
    this.projectiles.clear();
    this.applyCurrentRoomState();
  }

  private getCurrentEncounterKind(): EncounterKind {
    return this.currentRoomDefinition.theme === 'mushroom' ? 'red-shroom' : 'dart-goober';
  }

  private getCurrentShroomVariant(): ShroomVariant {
    return (this.currentRoomDefinition.decorSeed ?? 0) > 0.5 ? 'purple' : 'red';
  }

  private hasCurrentEncounterStarted(): boolean {
    return this.getCurrentEncounterKind() === 'red-shroom'
      ? this.redShrooms.hasEncounterStarted()
      : this.enemies.hasEncounterStarted();
  }

  private applyCurrentRoomState() {
    this.roomRenderer?.setState(getCurrentDungeonRoom(this.dungeonState));
    this.dungeonMinimap?.update(this.dungeonState);
  }

  private tryMoveThroughOpenDoor(move: { readonly x: number; readonly y: number }) {
    const currentRoom = getCurrentDungeonRoom(this.dungeonState);

    if (currentRoom.phase === 'combat') {
      return;
    }

    const exitSide = this.getRequestedExitSide(move);

    if (!exitSide) {
      return;
    }

    const nextRoom = getNeighborDungeonRoom(this.dungeonState, currentRoom, exitSide);

    if (!nextRoom) {
      return;
    }

    enterDungeonRoom(this.dungeonState, nextRoom.id);
    this.currentRoomDefinition = createCombatRoomDefinitionForDungeonRoom(
      this.dungeonState,
      nextRoom
    );
    this.rebuildRoomRenderer();
    this.clearRoomRuntime();
    this.placePlayerAtEntry(OPPOSITE_DOOR_SIDE[exitSide]);
    this.startCombatInCurrentRoomIfNeeded();
    this.centerCameraOnRoom();
  }

  private getRequestedExitSide(move: { readonly x: number; readonly y: number }): RoomDoorSide | undefined {
    const { bounds } = this.currentRoomDefinition;
    const position = this.player.state.position;
    const minX = bounds.x + bounds.border + DOOR_EXIT_INSET;
    const maxX = bounds.x + bounds.width - bounds.border - DOOR_EXIT_INSET;
    const minY = bounds.y + bounds.border + DOOR_EXIT_INSET;
    const maxY = bounds.y + bounds.height - bounds.border - DOOR_EXIT_INSET;

    if (move.x > DOOR_EXIT_MOVE_THRESHOLD && position.x >= maxX && this.isPlayerAlignedWithDoor('east')) return 'east';
    if (move.x < -DOOR_EXIT_MOVE_THRESHOLD && position.x <= minX && this.isPlayerAlignedWithDoor('west')) return 'west';
    if (move.y > DOOR_EXIT_MOVE_THRESHOLD && position.y >= maxY && this.isPlayerAlignedWithDoor('south')) return 'south';
    if (move.y < -DOOR_EXIT_MOVE_THRESHOLD && position.y <= minY && this.isPlayerAlignedWithDoor('north')) return 'north';

    return undefined;
  }

  private isPlayerAlignedWithDoor(side: RoomDoorSide): boolean {
    const door = this.currentRoomDefinition.doors.find((candidate) => candidate.side === side);

    if (!door) {
      return false;
    }

    const position = this.player.state.position;
    const margin = 30;
    const axisPosition = side === 'east' || side === 'west' ? position.y : position.x;

    return axisPosition >= door.center - door.span / 2 - margin && axisPosition <= door.center + door.span / 2 + margin;
  }

  private rebuildRoomRenderer() {
    this.roomRenderer?.destroy();
    this.roomRenderer = new CombatRoomRenderer(this, this.currentRoomDefinition);
    this.roomRenderer.create();
    this.applyCurrentRoomState();
  }

  private clearRoomRuntime() {
    this.enemies.clear();
    this.redShrooms.clear();
    this.projectiles.clear();
    this.enemyDarts.clear();
    this.shroomSpores.clear();
  }

  private placePlayerAtEntry(entrySide: RoomDoorSide) {
    const { bounds, doors } = this.currentRoomDefinition;
    const entryDoor = doors.find((door) => door.side === entrySide);
    const horizontalCenter = bounds.x + bounds.width / 2;
    const verticalCenter = bounds.y + bounds.height / 2;

    if (entrySide === 'west') {
      this.player.state.position = {
        x: bounds.x + bounds.border + DOOR_ENTRY_INSET,
        y: entryDoor?.center ?? verticalCenter
      };
    } else if (entrySide === 'east') {
      this.player.state.position = {
        x: bounds.x + bounds.width - bounds.border - DOOR_ENTRY_INSET,
        y: entryDoor?.center ?? verticalCenter
      };
    } else if (entrySide === 'north') {
      this.player.state.position = {
        x: entryDoor?.center ?? horizontalCenter,
        y: bounds.y + bounds.border + DOOR_ENTRY_INSET
      };
    } else {
      this.player.state.position = {
        x: entryDoor?.center ?? horizontalCenter,
        y: bounds.y + bounds.height - bounds.border - DOOR_ENTRY_INSET
      };
    }

    this.player.state.velocity = { x: 0, y: 0 };
  }

  private clampToRoomFeedbackPosition(position: { readonly x: number; readonly y: number }) {
    const { bounds } = this.currentRoomDefinition;
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
    this.centerCameraOnRoom();
  };

  private configureCamera() {
    const camera = this.cameras.main;
    const viewport = applyHiDpiCanvas(this);
    const targetWidth = Math.max(CAMERA_VIEW.width, this.currentRoomDefinition.bounds.width + 44);
    const targetHeight = Math.max(CAMERA_VIEW.height, this.currentRoomDefinition.bounds.height + 44);
    const zoom = Math.min(
      viewport.cssWidth / targetWidth,
      viewport.cssHeight / targetHeight
    ) * viewport.pixelRatio;

    camera.setViewport(0, 0, viewport.renderWidth, viewport.renderHeight);
    camera.setZoom(zoom);
    camera.setBounds(
      this.currentRoomDefinition.bounds.x - 96,
      this.currentRoomDefinition.bounds.y - 96,
      this.currentRoomDefinition.bounds.width + 192,
      this.currentRoomDefinition.bounds.height + 192
    );
  }

  private centerCameraOnRoom() {
    const camera = this.cameras.main;
    const { bounds } = this.currentRoomDefinition;

    camera.centerOn(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  }

  private disposeRuntime() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize);
    this.desktopInput?.dispose();
    this.desktopInput = undefined;
    this.heartsHud?.dispose();
    this.heartsHud = undefined;
    this.dungeonMinimap?.dispose();
    this.dungeonMinimap = undefined;
    this.touchOverlay?.dispose();
    this.touchOverlay = undefined;
    this.roomRenderer?.destroy();
    this.roomRenderer = undefined;
    this.playerRenderer?.destroy();
    this.playerRenderer = undefined;
    this.projectileRenderer?.destroy();
    this.projectileRenderer = undefined;
    this.enemyRenderer?.destroy();
    this.enemyRenderer = undefined;
    this.redShroomRenderer?.destroy();
    this.redShroomRenderer = undefined;
    this.enemyDartRenderer?.destroy();
    this.enemyDartRenderer = undefined;
    this.shroomSporeRenderer?.destroy();
    this.shroomSporeRenderer = undefined;
    this.feedbackRenderer?.destroy();
    this.feedbackRenderer = undefined;
    this.sfx?.destroy();
    this.sfx = undefined;
    this.projectiles.clear();
    this.enemyDarts.clear();
    this.shroomSpores.clear();
    this.enemies.clear();
    this.redShrooms.clear();
  }
}
