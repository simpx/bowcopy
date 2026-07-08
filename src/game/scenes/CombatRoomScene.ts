import Phaser from 'phaser';

import { GAME_SIZE } from '../constants';
import { applyHiDpiCanvas } from '../renderScale';
import { DesktopInputAdapter } from '../../input/DesktopInputAdapter';
import { InputController } from '../../input/InputController';
import { PlayerHealth } from '../PlayerHealth';
import { DungeonMinimap } from '../../ui/DungeonMinimap';
import { HeartsHud } from '../../ui/HeartsHud';
import { TouchInputOverlay } from '../../ui/TouchInputOverlay';
import { BowbertPlayerModel, type BowbertPlayerEvent, type SimVector } from '../../sim/player';
import {
  DartGooberSystem,
  KaboomletSystem,
  RedShroomSystem,
  SlimeSystem,
  SpooperGooperSystem,
  type ShroomVariant
} from '../../sim/enemies';
import { ArrowProjectileSystem, EnemyDartProjectileSystem, ShroomSporeProjectileSystem } from '../../sim/projectiles';
import { CombatSfxDirector, preloadCombatSfx } from '../../audio/CombatSfxDirector';
import {
  OPPOSITE_DOOR_SIDE,
  ROOM_THEME_NAMES,
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
  type RoomDoorSide,
  type RoomTheme
} from '../../sim/rooms';
import { CombatRoomRenderer, preloadCombatRoomAssets } from '../../render/rooms';
import { BowbertRenderer, preloadBowbertPlayerAssets } from '../../render/player';
import {
  DartGooberRenderer,
  DartTriGooberRenderer,
  KaboomletRenderer,
  RedShroomRenderer,
  SlimeRenderer,
  SpooperGooperRenderer,
  preloadKaboomletAssets,
  preloadDartGooberAssets,
  preloadDartTriGooberAssets,
  preloadRedShroomAssets,
  preloadSlimeAssets,
  preloadSpooperGooperAssets
} from '../../render/enemies';
import { CombatFeedbackRenderer } from '../../render/feedback';
import {
  ArrowProjectileRenderer,
  EnemyDartProjectileRenderer,
  ShroomSporeProjectileRenderer,
  preloadArrowProjectileAssets,
  preloadEnemyDartProjectileAssets,
  preloadShroomSporeProjectileAssets
} from '../../render/projectiles';
import { PURPLE_SHROOM_CHARACTER, RED_SHROOM_CHARACTER } from '../../render/characters/layeredCharacterConfig';

type CameraShakeKind = 'arrow-fire' | 'hit' | 'damage' | 'dodge' | 'room-clear';
type EncounterKind =
  | 'dart-goober'
  | 'dart-tri-goober'
  | 'red-shroom'
  | 'kaboomlet'
  | 'slime'
  | 'slime-parent'
  | 'spooper-gooper';

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
const DEBUG_ENCOUNTER_THEMES: Partial<Record<EncounterKind, RoomTheme>> = {
  'dart-goober': 'wood',
  'dart-tri-goober': 'stone',
  'red-shroom': 'mushroom',
  kaboomlet: 'wood',
  slime: 'stone',
  'slime-parent': 'stone',
  'spooper-gooper': 'boss'
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
  private readonly kaboomlets = new KaboomletSystem();
  private readonly slimes = new SlimeSystem();
  private readonly spooperGoopers = new SpooperGooperSystem();
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
  private dartTriGooberRenderer?: DartTriGooberRenderer;
  private redShroomRenderer?: RedShroomRenderer;
  private kaboomletRenderer?: KaboomletRenderer;
  private slimeRenderer?: SlimeRenderer;
  private spooperGooperRenderer?: SpooperGooperRenderer;
  private enemyDartRenderer?: EnemyDartProjectileRenderer;
  private shroomSporeRenderer?: ShroomSporeProjectileRenderer;
  private feedbackRenderer?: CombatFeedbackRenderer;
  private sfx?: CombatSfxDirector;
  private dungeonState: DungeonState = createInitialDungeonState();
  private currentRoomDefinition: CombatRoomDefinition = referenceCombatRoom;
  private debugPlayerDemoElapsedMs = 0;
  private debugPlayerDemoDodgeCycle = -1;

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
    preloadDartTriGooberAssets(this);
    preloadRedShroomAssets(this);
    preloadKaboomletAssets(this);
    preloadSlimeAssets(this);
    preloadSpooperGooperAssets(this);
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
    this.applyDebugEncounterFromUrl();
    this.player = new BowbertPlayerModel({
      x: PLAYER_START.x,
      y: PLAYER_START.y
    });
    this.projectiles.clear();
    this.enemies.clear();
    this.redShrooms.clear();
    this.kaboomlets.clear();
    this.slimes.clear();
    this.spooperGoopers.clear();
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
    this.dartTriGooberRenderer = new DartTriGooberRenderer(this);
    this.dartTriGooberRenderer.create();
    this.redShroomRenderer = new RedShroomRenderer(this);
    this.redShroomRenderer.create();
    this.kaboomletRenderer = new KaboomletRenderer(this);
    this.kaboomletRenderer.create();
    this.slimeRenderer = new SlimeRenderer(this);
    this.slimeRenderer.create();
    this.spooperGooperRenderer = new SpooperGooperRenderer(this);
    this.spooperGooperRenderer.create();
    this.playerRenderer = new BowbertRenderer(this);
    this.playerRenderer.create();
    this.playerRenderer.update(0, 0, this.player.state);
    this.feedbackRenderer = new CombatFeedbackRenderer(this);
    this.feedbackRenderer.create();
    this.sfx = new CombatSfxDirector(this);
    this.bootstrapDebugEncounter();
    this.bootstrapDebugFeedback();

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
    this.updateDebugPlayerDemo(delta);

    const snapshot = this.inputController.consumeSnapshot();
    const playerFrame = this.player.update(snapshot, delta, this.currentRoomDefinition.bounds);

    this.tryMoveThroughOpenDoor(snapshot.move);
    this.centerCameraOnRoom();
    this.handlePlayerEvents(playerFrame.events);
    this.updateEnemyEncounter();

    const projectileEvents = this.projectiles.update(delta, this.currentRoomDefinition.bounds);
    this.handleProjectileEvents(projectileEvents);
    const encounterKind = this.getCurrentEncounterKind();
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
    const kaboomletFrame = this.kaboomlets.update(
      delta,
      this.currentRoomDefinition.bounds,
      playerFrame.state.position,
      this.projectiles.getActiveArrows()
    );

    for (const arrowId of kaboomletFrame.consumedArrowIds) {
      this.projectiles.removeArrow(arrowId);
    }

    this.handleKaboomletEvents(kaboomletFrame.events);
    const slimeFrame = this.slimes.update(
      delta,
      this.currentRoomDefinition.bounds,
      playerFrame.state.position,
      this.projectiles.getActiveArrows()
    );

    for (const arrowId of slimeFrame.consumedArrowIds) {
      this.projectiles.removeArrow(arrowId);
    }

    this.handleSlimeEvents(slimeFrame.events);
    const spooperGooperFrame = this.spooperGoopers.update(
      delta,
      this.currentRoomDefinition.bounds,
      playerFrame.state.position,
      this.projectiles.getActiveArrows()
    );

    for (const arrowId of spooperGooperFrame.consumedArrowIds) {
      this.projectiles.removeArrow(arrowId);
    }

    this.handleSpooperGooperEvents(spooperGooperFrame.events);

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
    this.sfx?.playWalk(
      playerFrame.state.position,
      playerFrame.state.moveAmount,
      playerFrame.state.dodge.activeMs > 0 || playerFrame.state.dodge.invulnerableMs > 0
    );

    const activeDartGoobers = encounterKind === 'dart-goober' ? this.enemies.getActiveEnemies() : [];
    const activeDartTriGoobers = encounterKind === 'dart-tri-goober' ? this.enemies.getActiveEnemies() : [];
    const activeRedShrooms = encounterKind === 'red-shroom' ? this.redShrooms.getActiveEnemies() : [];
    const activeKaboomlets = encounterKind === 'kaboomlet' ? this.kaboomlets.getActiveEnemies() : [];
    const activeSlimes = encounterKind === 'slime' || encounterKind === 'slime-parent'
      ? this.slimes.getActiveEnemies()
      : [];
    const activeSpooperGoopers = encounterKind === 'spooper-gooper' ? this.spooperGoopers.getActiveEnemies() : [];

    this.projectileRenderer?.playEvents(projectileEvents);
    if (encounterKind === 'dart-tri-goober') {
      this.dartTriGooberRenderer?.playEvents(enemyFrame.events);
    } else if (encounterKind === 'dart-goober') {
      this.enemyRenderer?.playEvents(enemyFrame.events);
    }
    this.redShroomRenderer?.playEvents(redShroomFrame.events);
    this.kaboomletRenderer?.playEvents(kaboomletFrame.events);
    this.slimeRenderer?.playEvents(slimeFrame.events);
    this.spooperGooperRenderer?.playEvents(spooperGooperFrame.events);
    this.enemyDartRenderer?.playEvents(enemyDartEvents);
    this.shroomSporeRenderer?.playEvents(shroomSporeEvents);
    this.projectileRenderer?.update(delta, this.projectiles.getActiveArrows());
    this.enemyDartRenderer?.update(delta, this.enemyDarts.getActiveDarts());
    this.shroomSporeRenderer?.update(delta, this.shroomSpores.getActiveSpores());
    this.enemyRenderer?.update(time, delta, activeDartGoobers);
    this.dartTriGooberRenderer?.update(time, delta, activeDartTriGoobers);
    this.redShroomRenderer?.update(time, delta, activeRedShrooms);
    this.kaboomletRenderer?.update(time, delta, activeKaboomlets);
    this.slimeRenderer?.update(time, delta, activeSlimes);
    this.spooperGooperRenderer?.update(time, delta, activeSpooperGoopers);
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

      this.sfx?.playDodge(this.player.state.position);
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
        this.sfx?.playRoomClear(this.currentRoomDefinition.bounds);
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
          this.sfx?.playShroomHit(event.position, event.damage);
          this.feedbackRenderer?.playArrowEnemy(event.position, event.damage);
          this.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'red-shroom-killed') {
        this.sfx?.playShroomDeath(event.position);
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.shakeCamera('hit');
        continue;
      }

      if (event.type === 'red-shroom-encounter-cleared') {
        clearCurrentDungeonRoom(this.dungeonState);
        this.shroomSpores.clear();
        this.applyCurrentRoomState();
        this.sfx?.playRoomClear(this.currentRoomDefinition.bounds);
        this.feedbackRenderer?.playRoomClear(this.currentRoomDefinition.bounds);
        this.shakeCamera('room-clear');
      }
    }
  }

  private handleKaboomletEvents(events: ReturnType<KaboomletSystem['update']>['events']) {
    for (const event of events) {
      if (event.type === 'kaboomlet-spawned') {
        this.feedbackRenderer?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'kaboomlet-armed') {
        this.feedbackRenderer?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'kaboomlet-exploded') {
        this.sfx?.playEnemyDeath(event.position);
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.damagePlayerFromRadius(event.position, event.radius, event.damage);
        this.shakeCamera('damage');
        continue;
      }

      if (event.type === 'kaboomlet-hit') {
        if (event.hp > 0) {
          this.sfx?.playEnemyHit(event.position, event.damage);
          this.feedbackRenderer?.playArrowEnemy(event.position, event.damage);
          this.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'kaboomlet-killed') {
        this.sfx?.playEnemyDeath(event.position);
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.shakeCamera('hit');
        continue;
      }

      this.clearCurrentEncounter();
    }
  }

  private handleSlimeEvents(events: ReturnType<SlimeSystem['update']>['events']) {
    for (const event of events) {
      if (event.type === 'slime-spawned') {
        this.feedbackRenderer?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'slime-jumped') {
        continue;
      }

      if (event.type === 'slime-landed') {
        continue;
      }

      if (event.type === 'slime-split') {
        this.feedbackRenderer?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'slime-damaged-player') {
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
        continue;
      }

      if (event.type === 'slime-hit') {
        if (event.hp > 0) {
          this.sfx?.playShroomHit(event.position, event.damage);
          this.feedbackRenderer?.playArrowEnemy(event.position, event.damage);
          this.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'slime-killed') {
        this.sfx?.playShroomDeath(event.position);
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.shakeCamera('hit');
        continue;
      }

      this.clearCurrentEncounter();
    }
  }

  private handleSpooperGooperEvents(events: ReturnType<SpooperGooperSystem['update']>['events']) {
    for (const event of events) {
      if (event.type === 'spooper-gooper-spawned' || event.type === 'spooper-gooper-appeared') {
        this.feedbackRenderer?.playEnemySpawn(event.position);
        continue;
      }

      if (event.type === 'spooper-gooper-vanished') {
        continue;
      }

      if (event.type === 'spooper-gooper-attacked') {
        this.enemyDarts.fireDart({
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
        if (event.hp > 0) {
          this.sfx?.playEnemyHit(event.position, event.damage);
          this.feedbackRenderer?.playArrowEnemy(event.position, event.damage);
          this.shakeCamera('hit');
        }
        continue;
      }

      if (event.type === 'spooper-gooper-killed') {
        this.sfx?.playEnemyDeath(event.position);
        this.feedbackRenderer?.playEnemyDeath(event.position);
        this.shakeCamera('hit');
        continue;
      }

      this.clearCurrentEncounter();
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
    const encounterKind = this.getCurrentEncounterKind();

    if (encounterKind === 'red-shroom') {
      this.redShrooms.startEncounter(this.currentRoomDefinition.spawnPoints, {
        enemyCount: Math.max(4, Math.ceil(roomState.remainingSpawnMarkers * 0.95)),
        waveIndex: roomState.wave,
        variant: this.getCurrentShroomVariant()
      });
    } else if (encounterKind === 'kaboomlet') {
      this.kaboomlets.startEncounter(this.currentRoomDefinition.spawnPoints, {
        enemyCount: Math.max(2, Math.ceil(roomState.remainingSpawnMarkers * 0.55)),
        waveIndex: roomState.wave
      });
    } else if (encounterKind === 'slime') {
      this.slimes.startEncounter(this.currentRoomDefinition.spawnPoints, {
        enemyCount: Math.max(4, Math.ceil(roomState.remainingSpawnMarkers * 1.05)),
        waveIndex: roomState.wave,
        role: 'child'
      });
    } else if (encounterKind === 'slime-parent') {
      this.slimes.startEncounter(this.currentRoomDefinition.spawnPoints, {
        enemyCount: Math.max(1, Math.ceil(roomState.remainingSpawnMarkers * 0.35)),
        waveIndex: roomState.wave,
        role: 'parent'
      });
    } else if (encounterKind === 'spooper-gooper') {
      this.spooperGoopers.startEncounter(this.currentRoomDefinition.spawnPoints, {
        enemyCount: Math.max(2, Math.ceil(roomState.remainingSpawnMarkers * 0.45)),
        waveIndex: roomState.wave
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
    this.kaboomlets.clear();
    this.slimes.clear();
    this.spooperGoopers.clear();
    this.enemyDarts.clear();
    this.shroomSpores.clear();
    this.projectiles.clear();
    this.applyCurrentRoomState();
  }

  private getCurrentEncounterKind(): EncounterKind {
    const debugEncounter = this.getDebugEncounterKind();

    if (debugEncounter) {
      return debugEncounter;
    }

    if (this.currentRoomDefinition.theme === 'mushroom') {
      return 'red-shroom';
    }

    if (this.currentRoomDefinition.theme === 'wood') {
      return 'kaboomlet';
    }

    if (this.currentRoomDefinition.theme === 'stone') {
      return 'slime-parent';
    }

    if (this.currentRoomDefinition.theme === 'boss') {
      return 'spooper-gooper';
    }

    return 'dart-goober';
  }

  private applyDebugEncounterFromUrl() {
    const debugEncounter = this.getDebugEncounterKind();

    if (!debugEncounter) {
      return;
    }

    const theme = DEBUG_ENCOUNTER_THEMES[debugEncounter] ?? 'wood';
    const roomState = getCurrentDungeonRoom(this.dungeonState);

    roomState.phase = 'combat';
    roomState.remainingSpawnMarkers = debugEncounter === 'spooper-gooper'
      ? 5
      : debugEncounter === 'slime-parent'
        ? 2
        : 4;
    roomState.wave = 2;
    this.currentRoomDefinition = {
      ...referenceCombatRoom,
      id: `debug-${debugEncounter}`,
      theme,
      typeName: ROOM_THEME_NAMES[theme],
      decorSeed: 0.63,
      doors: []
    };
  }

  private getDebugEncounterKind(): EncounterKind | undefined {
    const value = new URLSearchParams(window.location.search).get('encounter');

    if (
      value === 'dart-goober' ||
      value === 'dart-tri-goober' ||
      value === 'red-shroom' ||
      value === 'kaboomlet' ||
      value === 'slime' ||
      value === 'slime-parent' ||
      value === 'spooper-gooper'
    ) {
      return value;
    }

    return undefined;
  }

  private isDebugPlayerDemoEnabled(): boolean {
    return new URLSearchParams(window.location.search).get('playerDemo') === 'motion';
  }

  private updateDebugPlayerDemo(deltaMs: number) {
    if (!this.isDebugPlayerDemoEnabled()) {
      return;
    }

    this.debugPlayerDemoElapsedMs += deltaMs;
    const cycleMs = 4300;
    const cycleIndex = Math.floor(this.debugPlayerDemoElapsedMs / cycleMs);
    const cycleTime = this.debugPlayerDemoElapsedMs % cycleMs;

    if (cycleTime < 1050) {
      this.inputController.setMoveVector({ x: 1, y: 0.22 }, 'desktop');
      this.inputController.setAimVector({ x: 1, y: -0.12 }, 'desktop');
      this.inputController.setFiring(false, 'desktop');
      return;
    }

    if (cycleTime < 2150) {
      this.inputController.setMoveVector({ x: -0.55, y: 0.38 }, 'desktop');
      this.inputController.setAimVector({ x: 1, y: -0.18 }, 'desktop');
      this.inputController.setFiring(true, 'desktop');
      return;
    }

    if (cycleTime < 2850) {
      this.inputController.setMoveVector({ x: 0.12, y: -1 }, 'desktop');
      this.inputController.setAimVector({ x: 1, y: 0.15 }, 'desktop');
      this.inputController.setFiring(true, 'desktop');

      if (cycleTime > 2320 && this.debugPlayerDemoDodgeCycle !== cycleIndex) {
        this.inputController.emitDodge('desktop');
        this.debugPlayerDemoDodgeCycle = cycleIndex;
      }
      return;
    }

    if (cycleTime < 3500) {
      this.inputController.setMoveVector({ x: 0, y: 0 }, 'desktop');
      this.inputController.releaseAim('desktop');
      return;
    }

    this.inputController.setMoveVector({ x: -1, y: -0.12 }, 'desktop');
    this.inputController.setAimVector({ x: -1, y: -0.1 }, 'desktop');
    this.inputController.setFiring(false, 'desktop');
  }

  private getCurrentShroomVariant(): ShroomVariant {
    const debugVariant = new URLSearchParams(window.location.search).get('variant');

    if (debugVariant === 'red' || debugVariant === 'purple') {
      return debugVariant;
    }

    return (this.currentRoomDefinition.decorSeed ?? 0) > 0.5 ? 'purple' : 'red';
  }

  private hasCurrentEncounterStarted(): boolean {
    const encounterKind = this.getCurrentEncounterKind();

    if (encounterKind === 'red-shroom') return this.redShrooms.hasEncounterStarted();
    if (encounterKind === 'kaboomlet') return this.kaboomlets.hasEncounterStarted();
    if (encounterKind === 'slime' || encounterKind === 'slime-parent') return this.slimes.hasEncounterStarted();
    if (encounterKind === 'spooper-gooper') return this.spooperGoopers.hasEncounterStarted();

    return this.enemies.hasEncounterStarted();
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
    this.kaboomlets.clear();
    this.slimes.clear();
    this.spooperGoopers.clear();
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

  private clearCurrentEncounter() {
    clearCurrentDungeonRoom(this.dungeonState);
    this.shroomSpores.clear();
    this.enemyDarts.clear();
    this.applyCurrentRoomState();
    this.sfx?.playRoomClear(this.currentRoomDefinition.bounds);
    this.feedbackRenderer?.playRoomClear(this.currentRoomDefinition.bounds);
    this.shakeCamera('room-clear');
  }

  private damagePlayerFromRadius(position: SimVector, radius: number, damage: number) {
    const playerPosition = this.player.state.position;
    const distance = Math.hypot(playerPosition.x - position.x, playerPosition.y - position.y);

    if (distance > radius || this.player.state.dodge.invulnerableMs > 0) {
      return;
    }

    this.player.markHit();
    this.playerHealth.damage(damage);
    this.sfx?.playPlayerDamage(position, damage);
    this.heartsHud?.update(this.playerHealth.state);
    this.heartsHud?.flashDamage();
    this.feedbackRenderer?.playDamage(playerPosition, damage);
  }

  private bootstrapDebugEncounter() {
    const debugEncounter = this.getDebugEncounterKind();

    if (!debugEncounter) {
      return;
    }

    if (!this.hasCurrentEncounterStarted()) {
      this.startCurrentRoomEncounter();
    }

    const stepCount = debugEncounter === 'spooper-gooper' ? 7 : 5;

    for (let step = 0; step < stepCount; step += 1) {
      this.stepDebugEncounter(debugEncounter, step * 420, 420);
    }

    if (debugEncounter === 'slime-parent' && this.shouldForceDebugSlimeSplit()) {
      this.forceDebugSlimeParentSplit();
      for (let step = 0; step < 3; step += 1) {
        this.stepDebugEncounter(debugEncounter, 2100 + step * 260, 260);
      }
    }

    if ((debugEncounter === 'slime' || debugEncounter === 'slime-parent') && this.shouldForceDebugSlimeDamage()) {
      this.forceDebugSlimeDamagePreview(debugEncounter);
    }

    if (debugEncounter === 'kaboomlet' && this.shouldForceDebugKaboomletExplosion()) {
      this.forceDebugKaboomletExplosionPreview();
    }

    if (debugEncounter === 'red-shroom' && this.shouldForceDebugShroomSpore()) {
      this.forceDebugShroomSporePreview();
    }

    this.publishDebugEncounterState(debugEncounter);
  }

  private shouldForceDebugSlimeSplit(): boolean {
    return new URLSearchParams(window.location.search).get('split') === '1';
  }

  private shouldForceDebugKaboomletExplosion(): boolean {
    return new URLSearchParams(window.location.search).get('effect') === 'explosion';
  }

  private shouldForceDebugSlimeDamage(): boolean {
    return new URLSearchParams(window.location.search).get('effect') === 'damage';
  }

  private shouldForceDebugShroomSpore(): boolean {
    return new URLSearchParams(window.location.search).get('effect') === 'spore';
  }

  private bootstrapDebugFeedback() {
    if (new URLSearchParams(window.location.search).get('feedback') !== 'combat') {
      return;
    }

    const feedback = this.feedbackRenderer;

    if (!feedback) {
      return;
    }

    const bounds = this.currentRoomDefinition.bounds;
    const center = {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };

    feedback.playEnemySpawn({ x: center.x - 230, y: center.y - 72 });
    feedback.playArrowEnemy({ x: center.x - 78, y: center.y - 108 }, 1);
    feedback.playEnemyDeath({ x: center.x + 98, y: center.y - 78 });
    feedback.playDodge({ x: center.x - 142, y: center.y + 118 }, { x: 1, y: 0.25 });
    feedback.playDamage({ x: center.x + 158, y: center.y + 112 }, 0.5);
    feedback.playRoomClear(bounds);

    for (let step = 0; step < 3; step += 1) {
      feedback.update(90);
    }
  }

  private forceDebugKaboomletExplosionPreview() {
    const bounds = this.currentRoomDefinition.bounds;
    const position = {
      x: bounds.x + bounds.width * 0.46,
      y: bounds.y + bounds.height * 0.36
    };

    this.kaboomletRenderer?.playEvents([
      {
        type: 'kaboomlet-exploded',
        id: -1,
        position,
        radius: 92,
        damage: 1
      }
    ]);
    this.kaboomletRenderer?.update(2400, 16, this.kaboomlets.getActiveEnemies());
  }

  private forceDebugShroomSporePreview() {
    const variant = this.getCurrentShroomVariant();
    const character = variant === 'purple' ? PURPLE_SHROOM_CHARACTER : RED_SHROOM_CHARACTER;
    const bounds = this.currentRoomDefinition.bounds;
    const shrooms = this.redShrooms.getActiveEnemies();
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

    this.shroomSpores.fireBurst({
      variant,
      origin,
      distance: character.spores.burstDistance,
      travelMs: character.spores.travelMs,
      lingerMs: character.spores.lingerMs,
      damage: 0.5,
      radius: 15,
      color: character.spores.trailColor
    });

    this.redShroomRenderer?.update(2600, 16, shrooms);

    for (let step = 0; step < 4; step += 1) {
      const events = this.shroomSpores.update(120, bounds, this.player.state.position, {
        playerBreaksSpores: false
      });
      this.shroomSporeRenderer?.playEvents(events);
    }

    this.shroomSporeRenderer?.update(120, this.shroomSpores.getActiveSpores());
  }

  private forceDebugSlimeParentSplit() {
    const parent = this.slimes.getActiveEnemies().find((enemy) => enemy.role === 'parent');

    if (!parent) {
      return;
    }

    const arrow = {
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
    const frame = this.slimes.update(
      16,
      this.currentRoomDefinition.bounds,
      this.player.state.position,
      [arrow]
    );

    this.handleSlimeEvents(frame.events);
    this.slimeRenderer?.playEvents(frame.events);
    this.slimeRenderer?.update(2100, 16, this.slimes.getActiveEnemies());
  }

  private forceDebugSlimeDamagePreview(encounterKind: EncounterKind) {
    const targetRole = encounterKind === 'slime-parent' ? 'parent' : 'child';
    const playerPosition = this.player.state.position;
    const slime = this.slimes.getActiveEnemies().find((enemy) => enemy.role === targetRole);

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

    const frame = this.slimes.update(
      16,
      this.currentRoomDefinition.bounds,
      playerPosition,
      []
    );

    this.handleSlimeEvents(frame.events);
    this.slimeRenderer?.playEvents(frame.events);
    this.slimeRenderer?.update(2300, 16, this.slimes.getActiveEnemies());
  }

  private stepDebugEncounter(encounterKind: EncounterKind, timeMs: number, deltaMs: number) {
    const playerPosition = this.player.state.position;

    if (encounterKind === 'kaboomlet') {
      const frame = this.kaboomlets.update(deltaMs, this.currentRoomDefinition.bounds, playerPosition, []);
      this.handleKaboomletEvents(frame.events);
      this.kaboomletRenderer?.playEvents(frame.events);
      this.kaboomletRenderer?.update(timeMs, deltaMs, this.kaboomlets.getActiveEnemies());
      return;
    }

    if (encounterKind === 'slime' || encounterKind === 'slime-parent') {
      this.slimes.update(deltaMs, this.currentRoomDefinition.bounds, playerPosition, []);
      this.slimeRenderer?.update(timeMs, deltaMs, this.slimes.getActiveEnemies());
      return;
    }

    if (encounterKind === 'spooper-gooper') {
      const frame = this.spooperGoopers.update(
        deltaMs,
        this.currentRoomDefinition.bounds,
        playerPosition,
        []
      );
      this.handleSpooperGooperEvents(frame.events);
      const enemyDartEvents = this.enemyDarts.update(
        deltaMs,
        this.currentRoomDefinition.bounds,
        playerPosition
      );
      this.handleEnemyDartEvents(enemyDartEvents);
      this.spooperGooperRenderer?.playEvents(frame.events);
      this.enemyDartRenderer?.playEvents(enemyDartEvents);
      this.enemyDartRenderer?.update(deltaMs, this.enemyDarts.getActiveDarts());
      this.spooperGooperRenderer?.update(timeMs, deltaMs, this.spooperGoopers.getActiveEnemies());
      return;
    }

    if (encounterKind === 'red-shroom') {
      this.redShrooms.update(deltaMs, this.currentRoomDefinition.bounds, playerPosition, []);
      this.redShroomRenderer?.update(timeMs, deltaMs, this.redShrooms.getActiveEnemies());
      return;
    }

    this.enemies.update(deltaMs, this.currentRoomDefinition.bounds, playerPosition, []);
    if (encounterKind === 'dart-tri-goober') {
      this.dartTriGooberRenderer?.update(timeMs, deltaMs, this.enemies.getActiveEnemies());
    } else {
      this.enemyRenderer?.update(timeMs, deltaMs, this.enemies.getActiveEnemies());
    }
  }

  private publishDebugEncounterState(encounterKind: EncounterKind) {
    const debugWindow = window as typeof window & {
      __bowbertDebugState?: {
        encounterKind: EncounterKind;
        activeEnemies: number;
      };
    };

    const activeEnemies =
      encounterKind === 'kaboomlet'
        ? this.kaboomlets.getActiveEnemies().length
        : encounterKind === 'slime' || encounterKind === 'slime-parent'
          ? this.slimes.getActiveEnemies().length
          : encounterKind === 'spooper-gooper'
            ? this.spooperGoopers.getActiveEnemies().length
            : encounterKind === 'red-shroom'
              ? this.redShrooms.getActiveEnemies().length
              : this.enemies.getActiveEnemies().length;

    debugWindow.__bowbertDebugState = {
      encounterKind,
      activeEnemies
    };
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
    this.dartTriGooberRenderer?.destroy();
    this.dartTriGooberRenderer = undefined;
    this.redShroomRenderer?.destroy();
    this.redShroomRenderer = undefined;
    this.kaboomletRenderer?.destroy();
    this.kaboomletRenderer = undefined;
    this.slimeRenderer?.destroy();
    this.slimeRenderer = undefined;
    this.spooperGooperRenderer?.destroy();
    this.spooperGooperRenderer = undefined;
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
    this.kaboomlets.clear();
    this.slimes.clear();
    this.spooperGoopers.clear();
  }
}
