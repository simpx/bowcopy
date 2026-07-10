import Phaser from 'phaser';

import { GAME_SIZE } from '../constants';
import { applyHiDpiCanvas } from '../renderScale';
import { DesktopInputAdapter } from '../../input/DesktopInputAdapter';
import { InputController } from '../../input/InputController';
import { PlayerHealth } from '../PlayerHealth';
import { DungeonMinimap } from '../../ui/DungeonMinimap';
import { BossHud } from '../../ui/BossHud';
import { HeartsHud } from '../../ui/HeartsHud';
import { TouchInputOverlay } from '../../ui/TouchInputOverlay';
import { BowbertPlayerModel, type BowbertPlayerEvent, type SimVector } from '../../sim/player';
import { type ShroomVariant } from '../../sim/enemies';
import {
  createEnemyKits,
  ENCOUNTER_KINDS,
  type EncounterKind,
  type EnemyKit,
  type EnemyKitServices
} from '../enemies';
import { ArrowProjectileSystem, EnemyDartProjectileSystem, ShroomSporeProjectileSystem } from '../../sim/projectiles';
import { CombatSfxDirector, preloadCombatSfx } from '../../audio/CombatSfxDirector';
import { MusicDirector, preloadMusic } from '../../audio/MusicDirector';
import {
  OPPOSITE_DOOR_SIDE,
  ROOM_THEME_NAMES,
  clearCurrentDungeonRoom,
  createCombatRoomDefinitionForDungeonRoom,
  createInitialDungeonState,
  enterDungeonRoom,
  isCombatDungeonRoom,
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
  'spooper-gooper': 'boss',
  backboard: 'wood',
  switcheroo: 'stone',
  doorbert: 'boss',
  hexbrim: 'boss'
};

export class CombatRoomScene extends Phaser.Scene {
  private readonly inputController = new InputController();
  private player = new BowbertPlayerModel({
    x: PLAYER_START.x,
    y: PLAYER_START.y
  });
  private readonly playerHealth = new PlayerHealth(5);
  private readonly projectiles = new ArrowProjectileSystem();
  private readonly enemyKits = createEnemyKits();
  private readonly enemyKitByKind = new Map<EncounterKind, EnemyKit>();
  private readonly enemyDarts = new EnemyDartProjectileSystem();
  private readonly shroomSpores = new ShroomSporeProjectileSystem();
  private desktopInput?: DesktopInputAdapter;
  private dungeonMinimap?: DungeonMinimap;
  private heartsHud?: HeartsHud;
  private bossHud?: BossHud;
  private bossIntroShownFor = '';
  private touchOverlay?: TouchInputOverlay;
  private roomRenderer?: CombatRoomRenderer;
  private playerRenderer?: BowbertRenderer;
  private projectileRenderer?: ArrowProjectileRenderer;
  private enemyDartRenderer?: EnemyDartProjectileRenderer;
  private shroomSporeRenderer?: ShroomSporeProjectileRenderer;
  private feedbackRenderer?: CombatFeedbackRenderer;
  private sfx?: CombatSfxDirector;
  private music?: MusicDirector;
  private bossMusicActive = false;
  private nextSheepBleatAt = 0;
  private runPhase: 'playing' | 'defeat' | 'victory' = 'playing';
  private healedRoomIds = new Set<string>();
  private pendingEncounterClears = 0;
  private dungeonState: DungeonState = createInitialDungeonState();
  private currentRoomDefinition: CombatRoomDefinition = referenceCombatRoom;
  private debugPlayerDemoElapsedMs = 0;
  private debugPlayerDemoDodgeCycle = -1;

  constructor() {
    super('CombatRoomScene');

    for (const kit of this.enemyKits) {
      for (const kind of kit.kinds) {
        this.enemyKitByKind.set(kind, kit);
      }
    }
  }

  preload() {
    preloadCombatRoomAssets(this);
    preloadBowbertPlayerAssets(this);
    preloadArrowProjectileAssets(this);
    preloadEnemyDartProjectileAssets(this);
    preloadShroomSporeProjectileAssets(this);
    for (const kit of this.enemyKits) {
      kit.preload(this);
    }
    preloadCombatSfx(this);

    // Boot overlay defined inline in index.html.
    const boot = window as typeof window & {
      __bootProgress?: (value: number, note?: string) => void;
      __bootDone?: () => void;
    };

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      boot.__bootProgress?.(value, '正在加载素材');
    });
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      boot.__bootDone?.();
    });
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
    this.applyDebugRoomFromUrl();
    this.player = new BowbertPlayerModel({
      x: PLAYER_START.x,
      y: PLAYER_START.y
    });
    this.projectiles.clear();

    for (const kit of this.enemyKits) {
      kit.clear();
    }

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

    const kitServices = this.createEnemyKitServices();

    for (const kit of this.enemyKits) {
      kit.create(kitServices);
    }

    this.playerRenderer = new BowbertRenderer(this);
    this.playerRenderer.create();
    this.playerRenderer.update(0, 0, this.player.state);
    this.feedbackRenderer = new CombatFeedbackRenderer(this);
    this.feedbackRenderer.create();
    this.sfx = new CombatSfxDirector(this);
    this.music = new MusicDirector(this);
    this.music.play('combat');
    // Music is heavyweight and not needed for the first seconds: stream it
    // in after boot instead of blocking the loading screen.
    preloadMusic(this);
    this.load.once(Phaser.Loader.Events.COMPLETE, () => this.music?.notifyLoaded());
    this.load.start();
    this.bootstrapDebugEncounter();
    this.bootstrapDebugFeedback();

    this.desktopInput = new DesktopInputAdapter(this, this.inputController, () => this.player.state.position);
    this.createHeartsHud();
    this.applyDebugHpFromUrl();
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

    const rawSnapshot = this.inputController.consumeSnapshot();
    // After defeat the player goes limp; the world keeps moving around them.
    const snapshot =
      this.runPhase === 'defeat'
        ? {
            ...rawSnapshot,
            move: { x: 0, y: 0 },
            firing: false,
            actions: { ...rawSnapshot.actions, dodge: false }
          }
        : rawSnapshot;
    const playerFrame = this.player.update(snapshot, delta, this.currentRoomDefinition.bounds);

    this.tryMoveThroughOpenDoor(snapshot.move);
    this.centerCameraOnRoom();
    this.handlePlayerEvents(playerFrame.events);
    this.updateEnemyEncounter();

    const projectileEvents = this.projectiles.update(delta, this.currentRoomDefinition.bounds);
    this.handleProjectileEvents(projectileEvents);
    const encounterKind = this.getCurrentEncounterKind();
    const activeKinds = new Set(this.getCurrentEncounterKinds());

    for (const kit of this.enemyKits) {
      // Mixed rooms: each kit sees its own kind as active when it is in
      // the room's set; other kits see a kind that hides their renderer.
      const kitActiveKind = kit.kinds.find((kind) => activeKinds.has(kind)) ?? encounterKind;
      const consumedArrowIds = kit.update(
        time,
        delta,
        this.currentRoomDefinition.bounds,
        playerFrame.state.position,
        this.projectiles.getActiveArrows(),
        kitActiveKind
      );

      for (const arrowId of consumedArrowIds) {
        this.projectiles.removeArrow(arrowId);
      }
    }

    const bossStatus = this.kitFor(encounterKind)?.getBossStatus?.();

    if (bossStatus && this.bossIntroShownFor !== bossStatus.name) {
      this.bossIntroShownFor = bossStatus.name;
      this.bossHud?.showIntro(bossStatus.name, 'NOTHING INSIDE');
      this.cameras.main.flash(500, 120, 60, 170);
      this.shakeCamera('room-clear');
    }

    if (bossStatus && !this.bossMusicActive) {
      this.bossMusicActive = true;
      this.music?.play('boss');
    } else if (!bossStatus && this.bossMusicActive) {
      this.bossMusicActive = false;
      this.music?.play('combat');
    }

    this.updateSheepBleats(time, playerFrame.state.hexedMs);
    this.bossHud?.update(bossStatus);

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

    this.projectileRenderer?.playEvents(projectileEvents);
    this.enemyDartRenderer?.playEvents(enemyDartEvents);
    this.shroomSporeRenderer?.playEvents(shroomSporeEvents);
    this.projectileRenderer?.update(delta, this.projectiles.getActiveArrows());
    this.enemyDartRenderer?.update(delta, this.enemyDarts.getActiveDarts());
    this.shroomSporeRenderer?.update(delta, this.shroomSpores.getActiveSpores());
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
      this.bossHud = new BossHud(parent);
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

  private handleEnemyDartEvents(events: ReturnType<EnemyDartProjectileSystem['update']>) {
    for (const event of events) {
      if (event.type === 'enemy-dart-hit-boundary') {
        this.sfx?.playDartWall(event.position);
        continue;
      }

      if (event.type !== 'enemy-dart-hit-player') {
        continue;
      }

      this.damagePlayerFromEnemy(event.position, event.damage);
    }
  }

  private handleShroomSporeEvents(events: ReturnType<ShroomSporeProjectileSystem['update']>) {
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

      this.damagePlayerFromEnemy(event.position, event.damage);
    }
  }

  private damagePlayerFromEnemy(sourcePosition: SimVector, damage: number) {
    if (this.runPhase !== 'playing') {
      return;
    }

    if (this.player.state.dodge.invulnerableMs > 0) {
      this.feedbackRenderer?.playDodge(this.player.state.position, this.player.state.dodge.direction);
      this.shakeCamera('dodge');
      return;
    }

    this.player.markHit();
    this.playerHealth.damage(damage);
    this.sfx?.playPlayerDamage(sourcePosition, damage);
    this.heartsHud?.update(this.playerHealth.state);
    this.heartsHud?.flashDamage();
    this.feedbackRenderer?.playDamage(this.player.state.position, damage);
    this.shakeCamera('damage');
    this.checkDefeat();
  }

  private kitFor(kind: EncounterKind): EnemyKit | undefined {
    return this.enemyKitByKind.get(kind);
  }

  private createEnemyKitServices(): EnemyKitServices {
    return {
      scene: this,
      enemyDarts: this.enemyDarts,
      shroomSpores: this.shroomSpores,
      getFeedback: () => this.feedbackRenderer,
      getSfx: () => this.sfx,
      duckMusic: (holdMs) => this.music?.duck(holdMs),
      getPlayerPosition: () => this.player.state.position,
      isPlayerInvulnerable: () => this.player.state.dodge.invulnerableMs > 0,
      shakeCamera: (kind) => this.shakeCamera(kind),
      damagePlayer: (sourcePosition, damage) => this.damagePlayerFromEnemy(sourcePosition, damage),
      damageEnemiesFromRadius: (position, radius, damage) => {
        for (const kit of this.enemyKits) {
          kit.damageArea?.(position, radius, damage);
        }
      },
      getOtherEnemyPositions: (excludeKind) => {
        const positions: SimVector[] = [];

        for (const kit of this.enemyKits) {
          if (kit.kinds.includes(excludeKind)) {
            continue;
          }

          positions.push(...(kit.getEnemyPositions?.() ?? []));
        }

        return positions;
      },
      teleportPlayer: (position) => {
        this.player.state.position.x = position.x;
        this.player.state.position.y = position.y;
      },
      flashCamera: (durationMs, red = 255, green = 255, blue = 255) => {
        this.cameras.main.flash(durationMs, red, green, blue);
      },
      hexPlayer: (durationMs) => {
        this.player.markHexed(durationMs);

        if (this.player.state.hexedMs > 0) {
          this.feedbackRenderer?.playSporeBreak(this.player.state.position);
        }
      },
      damagePlayerFromRadius: (position, radius, damage) =>
        this.damagePlayerFromRadius(position, radius, damage),
      encounterCleared: (options) => this.encounterClearedByKit(options),
      debugStepEnemyDarts: (deltaMs, bounds) => {
        const events = this.enemyDarts.update(deltaMs, bounds, this.player.state.position);

        this.handleEnemyDartEvents(events);
        this.enemyDartRenderer?.playEvents(events);
        this.enemyDartRenderer?.update(deltaMs, this.enemyDarts.getActiveDarts());
      },
      debugPumpShroomSpores: (times, deltaMs, bounds) => {
        for (let step = 0; step < times; step += 1) {
          const events = this.shroomSpores.update(deltaMs, bounds, this.player.state.position, {
            playerBreaksSpores: false
          });

          this.shroomSporeRenderer?.playEvents(events);
        }

        this.shroomSporeRenderer?.update(deltaMs, this.shroomSpores.getActiveSpores());
      }
    };
  }

  private encounterClearedByKit(options: { clearSpores: boolean; clearDarts: boolean }) {
    this.pendingEncounterClears = Math.max(0, this.pendingEncounterClears - 1);

    if (this.pendingEncounterClears > 0) {
      // Mixed room: other encounters still fighting.
      return;
    }

    const clearedRoom = getCurrentDungeonRoom(this.dungeonState);

    clearCurrentDungeonRoom(this.dungeonState);

    if (clearedRoom.kind === 'boss' && this.runPhase === 'playing') {
      this.startVictory();
    }

    if (options.clearSpores) {
      this.shroomSpores.clear();
    }

    if (options.clearDarts) {
      this.enemyDarts.clear();
    }

    this.applyCurrentRoomState();
    this.sfx?.playRoomClear(this.currentRoomDefinition.bounds);
    this.feedbackRenderer?.playRoomClear(this.currentRoomDefinition.bounds);
    this.shakeCamera('room-clear');
  }

  private startCurrentRoomEncounter() {
    const roomState = getCurrentDungeonRoom(this.dungeonState);
    const kinds = this.getCurrentEncounterKinds();
    const budgets = new Map<EncounterKind, number>(
      (roomState.encounters ?? []).map((entry) => [entry.kind as EncounterKind, entry.budget])
    );

    this.pendingEncounterClears = kinds.length;

    // Rotate the spawn markers per kind so mixed encounters don't stack
    // their enemies on the same points.
    const spawnPoints = this.currentRoomDefinition.spawnPoints;
    let spawnOffset = 0;

    for (const kind of kinds) {
      const budget = budgets.get(kind) ?? roomState.remainingSpawnMarkers;
      const rotated = [
        ...spawnPoints.slice(spawnOffset % spawnPoints.length),
        ...spawnPoints.slice(0, spawnOffset % spawnPoints.length)
      ];

      this.kitFor(kind)?.startEncounter({
        kind,
        spawnPoints: rotated,
        remainingSpawnMarkers: budget,
        wave: roomState.wave,
        shroomVariant: this.getCurrentShroomVariant()
      });
      spawnOffset += Math.max(2, Math.min(budget, 3));
    }
  }

  private hasCurrentEncounterStarted(): boolean {
    return this.getCurrentEncounterKinds().some(
      (kind) => this.kitFor(kind)?.hasEncounterStarted() ?? false
    );
  }

  private stepDebugEncounter(encounterKind: EncounterKind, timeMs: number, deltaMs: number) {
    this.kitFor(encounterKind)?.debugStep(
      timeMs,
      deltaMs,
      this.currentRoomDefinition.bounds,
      encounterKind
    );
  }

  private publishDebugEncounterState(encounterKind: EncounterKind) {
    const debugWindow = window as typeof window & {
      __bowbertDebugState?: {
        encounterKind: EncounterKind;
        activeEnemies: number;
      };
    };

    debugWindow.__bowbertDebugState = {
      encounterKind,
      activeEnemies: this.kitFor(encounterKind)?.activeEnemyCount() ?? 0
    };
  }

  private updateEnemyEncounter() {
    const roomState = getCurrentDungeonRoom(this.dungeonState);

    if (roomState.phase !== 'combat' || this.hasCurrentEncounterStarted()) {
      return;
    }

    this.startCurrentRoomEncounter();
  }

  private startCombatInCurrentRoomIfNeeded() {
    const roomState = getCurrentDungeonRoom(this.dungeonState);

    if (roomState.phase !== 'open') {
      return;
    }

    startCurrentDungeonRoomCombat(this.dungeonState);

    for (const kit of this.enemyKits) {
      kit.clear();
    }

    this.enemyDarts.clear();
    this.shroomSpores.clear();
    this.projectiles.clear();
    this.applyCurrentRoomState();
  }

  /** All encounter kinds this room hosts (mixed rooms run several at once). */
  private getCurrentEncounterKinds(): readonly EncounterKind[] {
    const debugEncounter = this.getDebugEncounterKind();

    if (debugEncounter) {
      return [debugEncounter];
    }

    const room = getCurrentDungeonRoom(this.dungeonState);
    const mixed = (room.encounters ?? [])
      .map((entry) => entry.kind)
      .filter((kind): kind is EncounterKind =>
        (ENCOUNTER_KINDS as readonly string[]).includes(kind)
      );

    if (mixed.length > 0) {
      return mixed;
    }

    return [this.getCurrentEncounterKind()];
  }

  private getCurrentEncounterKind(): EncounterKind {
    const debugEncounter = this.getDebugEncounterKind();

    if (debugEncounter) {
      return debugEncounter;
    }

    // Level design: rooms pin their encounter in the dungeon blueprint.
    const pinned = getCurrentDungeonRoom(this.dungeonState).encounterKind;

    if (pinned && (ENCOUNTER_KINDS as readonly string[]).includes(pinned)) {
      return pinned as EncounterKind;
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

  /** Review aid: /?debugroom=X,Y starts the run inside that dungeon room. */
  private applyDebugRoomFromUrl() {
    const raw = new URLSearchParams(window.location.search).get('debugroom');

    if (!raw || this.getDebugEncounterKind()) {
      return;
    }

    if (!this.dungeonState.rooms.has(raw)) {
      return;
    }

    const room = enterDungeonRoom(this.dungeonState, raw);

    this.currentRoomDefinition = createCombatRoomDefinitionForDungeonRoom(this.dungeonState, room);

    if (isCombatDungeonRoom(room) && room.phase === 'open') {
      startCurrentDungeonRoomCombat(this.dungeonState);
    }
  }

  /** Review aid: /?debughp=N starts the run at N hearts. */
  private applyDebugHpFromUrl() {
    const raw = new URLSearchParams(window.location.search).get('debughp');
    const target = raw === null ? Number.NaN : Number.parseFloat(raw);

    if (!Number.isFinite(target)) {
      return;
    }

    this.playerHealth.reset();
    this.playerHealth.damage(Math.max(0.5, this.playerHealth.state.max - target));
    this.heartsHud?.update(this.playerHealth.state);
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

    return ENCOUNTER_KINDS.includes(value as EncounterKind)
      ? (value as EncounterKind)
      : undefined;
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
    this.healInWizardRoomIfNeeded(nextRoom.id, nextRoom.kind);
    this.startCombatInCurrentRoomIfNeeded();
    this.centerCameraOnRoom();
  }

  /** The wizard's den restores all hearts, once per room per run. */
  private healInWizardRoomIfNeeded(roomId: string, kind: string) {
    if (kind !== 'wizard' || this.healedRoomIds.has(roomId)) {
      return;
    }

    this.healedRoomIds.add(roomId);
    this.playerHealth.reset();
    this.heartsHud?.update(this.playerHealth.state);
    this.feedbackRenderer?.playAnnouncement('RESTORED', this.currentRoomDefinition.bounds, 'clear');
    this.feedbackRenderer?.playRoomClear(this.currentRoomDefinition.bounds);
    this.sfx?.playPortal(this.player.state.position);
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
    for (const kit of this.enemyKits) {
      kit.clear();
    }

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
    this.checkDefeat();
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

    const debugKit = this.kitFor(debugEncounter);
    const bounds = this.currentRoomDefinition.bounds;

    if (debugEncounter === 'slime-parent' && this.shouldForceDebugSlimeSplit()) {
      debugKit?.debugForceEffect?.('split', debugEncounter, bounds);
      for (let step = 0; step < 3; step += 1) {
        this.stepDebugEncounter(debugEncounter, 2100 + step * 260, 260);
      }
    }

    if ((debugEncounter === 'slime' || debugEncounter === 'slime-parent') && this.shouldForceDebugSlimeDamage()) {
      debugKit?.debugForceEffect?.('damage', debugEncounter, bounds);
    }

    if (debugEncounter === 'kaboomlet' && this.shouldForceDebugKaboomletExplosion()) {
      debugKit?.debugForceEffect?.('explosion', debugEncounter, bounds);
    }

    if (debugEncounter === 'red-shroom' && this.shouldForceDebugShroomSpore()) {
      debugKit?.debugForceEffect?.('spore', debugEncounter, bounds);
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

  private checkDefeat() {
    if (this.runPhase !== 'playing' || this.playerHealth.state.current > 0) {
      return;
    }

    this.runPhase = 'defeat';
    this.feedbackRenderer?.playAnnouncement('YOU CAME UNDONE', this.currentRoomDefinition.bounds, 'damage');
    this.music?.stop(1400);
    this.cameras.main.fadeOut(1700, 8, 4, 16);
    this.time.delayedCall(2300, () => this.resetRun());
  }

  private startVictory() {
    this.runPhase = 'victory';
    this.music?.stop(2400);
    // Let the boss dissolve finish before the title card lands.
    this.time.delayedCall(1900, () => {
      if (this.runPhase !== 'victory') {
        return;
      }

      this.bossHud?.showIntro('CHAPTER CLEARED', 'THE HAT LIES EMPTY');
    });
    this.time.delayedCall(4800, () => {
      if (this.runPhase !== 'victory') {
        return;
      }

      this.cameras.main.fadeOut(900, 8, 4, 16);
      this.time.delayedCall(1000, () => this.resetRun());
    });
  }

  /** Fresh run: new dungeon, full hearts, back to the start room. */
  private resetRun() {
    this.runPhase = 'playing';
    this.healedRoomIds.clear();
    this.pendingEncounterClears = 0;
    this.dungeonState = createInitialDungeonState();
    this.currentRoomDefinition = createCombatRoomDefinitionForDungeonRoom(
      this.dungeonState,
      getCurrentDungeonRoom(this.dungeonState)
    );
    this.player = new BowbertPlayerModel({ x: PLAYER_START.x, y: PLAYER_START.y });
    this.playerHealth.reset();
    this.heartsHud?.update(this.playerHealth.state);
    this.rebuildRoomRenderer();
    this.clearRoomRuntime();
    this.bossIntroShownFor = '';
    this.bossMusicActive = false;
    this.nextSheepBleatAt = 0;
    this.bossHud?.update(null);
    this.music?.play('combat');
    this.centerCameraOnRoom();
    this.cameras.main.fadeIn(700, 8, 4, 16);
  }

  /** Sheepbert complains every second or two while polymorphed. */
  private updateSheepBleats(timeMs: number, hexedMs: number) {
    if (hexedMs <= 0) {
      this.nextSheepBleatAt = 0;
      return;
    }

    if (this.nextSheepBleatAt === 0) {
      this.nextSheepBleatAt = timeMs + 1200;
      return;
    }

    if (timeMs >= this.nextSheepBleatAt) {
      this.sfx?.playSheepBleat(this.player.state.position);
      this.nextSheepBleatAt = timeMs + 1300 + Math.random() * 900;
    }
  }

  private disposeRuntime() {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleScaleResize);
    this.music?.destroy();
    this.music = undefined;
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

    for (const kit of this.enemyKits) {
      kit.destroy();
    }

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
  }
}
