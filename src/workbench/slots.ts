import type Phaser from 'phaser';

import {
  BackboardSystem,
  DartGooberSystem,
  DoorbertSystem,
  HexbrimSystem,
  KaboomletSystem,
  RedShroomSystem,
  SlimeSystem,
  SpooperGooperSystem,
  SwitcherooSystem
} from '../sim/enemies';
import { BowbertPlayerModel, type SimVector } from '../sim/player';
import {
  ArrowProjectileSystem,
  EnemyDartProjectileSystem,
  ShroomSporeProjectileSystem,
  type ArrowProjectile
} from '../sim/projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../sim/rooms';
import {
  BackboardRenderer,
  DartGooberRenderer,
  DartTriGooberRenderer,
  DoorbertRenderer,
  HexbrimRenderer,
  KaboomletRenderer,
  RedShroomRenderer,
  SlimeRenderer,
  SpooperGooperRenderer,
  SwitcherooRenderer
} from '../render/enemies';
import { CombatFeedbackRenderer } from '../render/feedback';
import { BowbertRenderer } from '../render/player';
import {
  ArrowProjectileRenderer,
  EnemyDartProjectileRenderer,
  ShroomSporeProjectileRenderer
} from '../render/projectiles';
import type { InputSnapshot } from '../input/types';
import { createDisplaySlots } from './displaySlot';

/**
 * The workbench runs the exact same sim systems and renderers as the game
 * scene, one isolated cell per character, so what a human reviews here is
 * byte-for-byte the runtime behavior (gaze, squash, VFX, projectiles).
 */
export interface WorkbenchCell {
  readonly bounds: RoomBounds;
  readonly center: SimVector;
  readonly spawnPoints: readonly RoomSpawnPoint[];
}

export interface WorkbenchSlot {
  readonly id: string;
  readonly label: string;
  readonly kind: 'player' | 'enemy';
  create(scene: Phaser.Scene, cell: WorkbenchCell, feedback: CombatFeedbackRenderer): void;
  start(): void;
  update(timeMs: number, deltaMs: number, target: SimVector): void;
  /** Injects a real arrow through the sim hit path (player slot: markHit). */
  hit(damage: number): void;
  aliveCount(): number;
  destroy(): void;
  /** Skill-specific debug actions rendered as extra buttons on the card. */
  actions?: ReadonlyArray<{ label: string; run(): void }>;
  /** Fires a real arrow from `origin` toward the slot's enemy (canvas click). */
  shootArrowFrom?(origin: SimVector): void;
  /** Player-only extras; undefined on enemy slots. */
  toggleFiring?(): boolean;
  togglePatrol?(): boolean;
  dodge?(): void;
}

const RESTART_DELAY_MS = 1100;
const ENCOUNTER_SIZE = 2;

let syntheticArrowId = 1_000_000;

const syntheticArrow = (position: SimVector, damage: number): ArrowProjectile => ({
  id: (syntheticArrowId += 1),
  position: { ...position },
  previousPosition: { ...position },
  direction: { x: 0, y: -1 },
  speed: 0,
  damage,
  ageMs: 0,
  ttlMs: 60,
  trail: []
});

const clampToBounds = (point: SimVector, bounds: RoomBounds): SimVector => ({
  x: Math.min(bounds.x + bounds.width, Math.max(bounds.x, point.x)),
  y: Math.min(bounds.y + bounds.height, Math.max(bounds.y, point.y))
});

abstract class EnemySlotBase implements WorkbenchSlot {
  readonly kind = 'enemy' as const;

  protected scene!: Phaser.Scene;
  protected cell!: WorkbenchCell;
  protected feedback!: CombatFeedbackRenderer;

  private pendingArrows: ArrowProjectile[] = [];
  private restartInMs = -1;
  private readonly liveArrows = new ArrowProjectileSystem();
  private liveArrowRenderer?: ArrowProjectileRenderer;

  constructor(
    readonly id: string,
    readonly label: string
  ) {}

  create(scene: Phaser.Scene, cell: WorkbenchCell, feedback: CombatFeedbackRenderer) {
    this.scene = scene;
    this.cell = cell;
    this.feedback = feedback;
    this.onCreate();
    this.liveArrowRenderer = new ArrowProjectileRenderer(scene);
    this.liveArrowRenderer.create();
    this.start();
  }

  /** Canvas click: fire a real arrow from the click point at the enemy. */
  shootArrowFrom(origin: SimVector) {
    const target = this.enemyPositions()[0] ?? this.cell.center;
    const length = Math.hypot(target.x - origin.x, target.y - origin.y) || 1;

    this.liveArrows.fireArrow({
      origin: { ...origin },
      direction: { x: (target.x - origin.x) / length, y: (target.y - origin.y) / length },
      speed: 360,
      damage: 1
    });
  }

  hit(damage: number) {
    const target = this.enemyPositions()[0];

    if (target) {
      this.pendingArrows.push(syntheticArrow(target, damage));
    }
  }

  aliveCount(): number {
    return this.enemyPositions().length;
  }

  update(timeMs: number, deltaMs: number, target: SimVector) {
    const synthetic = this.pendingArrows;

    this.pendingArrows = [];

    const arrowEvents = this.liveArrows.update(deltaMs, this.cell.bounds);

    this.liveArrowRenderer?.playEvents(arrowEvents);

    const arrows = [...synthetic, ...this.liveArrows.getActiveArrows()];
    const consumedArrowIds = this.step(timeMs, deltaMs, target, arrows);

    for (const arrowId of consumedArrowIds) {
      this.liveArrows.removeArrow(arrowId);
    }

    this.liveArrowRenderer?.update(deltaMs, this.liveArrows.getActiveArrows());

    if (!this.cleared()) {
      this.restartInMs = -1;
      return;
    }

    if (this.restartInMs < 0) {
      this.restartInMs = RESTART_DELAY_MS;
    }

    this.restartInMs -= deltaMs;

    if (this.restartInMs <= 0) {
      this.restartInMs = -1;
      this.start();
    }
  }

  abstract start(): void;
  abstract destroy(): void;
  protected abstract onCreate(): void;
  protected abstract step(
    timeMs: number,
    deltaMs: number,
    target: SimVector,
    arrows: readonly ArrowProjectile[]
  ): readonly number[];
  protected abstract cleared(): boolean;
  protected abstract enemyPositions(): readonly SimVector[];
}

class DartGooberSlot extends EnemySlotBase {
  private readonly system = new DartGooberSystem();
  private readonly darts = new EnemyDartProjectileSystem();
  private renderer!: DartGooberRenderer | DartTriGooberRenderer;
  private dartRenderer!: EnemyDartProjectileRenderer;

  constructor(private readonly variant: 'dart-goober' | 'dart-tri-goober') {
    super(variant, variant === 'dart-goober' ? 'Dart Goober' : 'Dart Tri Goober');
  }

  protected onCreate() {
    this.renderer =
      this.variant === 'dart-goober'
        ? new DartGooberRenderer(this.scene)
        : new DartTriGooberRenderer(this.scene);
    this.renderer.create();
    this.dartRenderer = new EnemyDartProjectileRenderer(this.scene);
    this.dartRenderer.create();
  }

  start() {
    this.darts.clear();
    this.system.startEncounter(this.cell.spawnPoints, { enemyCount: ENCOUNTER_SIZE });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'dart-goober-spawned') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'enemy-dart-fired') {
        this.darts.fireDart(event);
      } else if (event.type === 'dart-goober-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'dart-goober-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    const dartEvents = this.darts.update(deltaMs, this.cell.bounds, clampToBounds(target, this.cell.bounds));

    this.renderer.playEvents(frame.events);
    this.dartRenderer.playEvents(dartEvents);
    this.renderer.update(timeMs, deltaMs, this.system.getActiveEnemies());
    this.dartRenderer.update(deltaMs, this.darts.getActiveDarts());

    return frame.consumedArrowIds;
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  destroy() {
    this.renderer.destroy();
    this.dartRenderer.destroy();
    this.system.clear();
    this.darts.clear();
  }
}

class ShroomSlot extends EnemySlotBase {
  private readonly system = new RedShroomSystem();
  private readonly spores = new ShroomSporeProjectileSystem();
  private renderer!: RedShroomRenderer;
  private sporeRenderer!: ShroomSporeProjectileRenderer;

  constructor(private readonly variant: 'red' | 'purple') {
    super(
      variant === 'red' ? 'red-shroom' : 'purple-shroom',
      variant === 'red' ? 'Red Shroom' : 'Purple Shroom'
    );
  }

  protected onCreate() {
    this.renderer = new RedShroomRenderer(this.scene);
    this.renderer.create();
    this.sporeRenderer = new ShroomSporeProjectileRenderer(this.scene);
    this.sporeRenderer.create();
  }

  start() {
    this.spores.clear();
    this.system.startEncounter(this.cell.spawnPoints, {
      enemyCount: ENCOUNTER_SIZE,
      variant: this.variant
    });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'red-shroom-spawned') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'red-shroom-spore-burst') {
        this.spores.fireBurst(event);
      } else if (event.type === 'red-shroom-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'red-shroom-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    const sporeEvents = this.spores.update(deltaMs, this.cell.bounds, clampToBounds(target, this.cell.bounds), {
      playerBreaksSpores: false
    });

    this.renderer.playEvents(frame.events);
    this.sporeRenderer.playEvents(sporeEvents);
    this.renderer.update(timeMs, deltaMs, this.system.getActiveEnemies());
    this.sporeRenderer.update(deltaMs, this.spores.getActiveSpores());

    return frame.consumedArrowIds;
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  destroy() {
    this.renderer.destroy();
    this.sporeRenderer.destroy();
    this.system.clear();
    this.spores.clear();
  }
}

class KaboomletSlot extends EnemySlotBase {
  private readonly system = new KaboomletSystem();
  private renderer!: KaboomletRenderer;

  constructor() {
    super('kaboomlet', 'Kaboomlet');
  }

  protected onCreate() {
    this.renderer = new KaboomletRenderer(this.scene);
    this.renderer.create();
  }

  start() {
    this.system.startEncounter(this.cell.spawnPoints, { enemyCount: ENCOUNTER_SIZE });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'kaboomlet-spawned' || event.type === 'kaboomlet-armed') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'kaboomlet-exploded') {
        this.feedback.playEnemyDeath(event.position);
      } else if (event.type === 'kaboomlet-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'kaboomlet-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    this.renderer.playEvents(frame.events);
    this.renderer.update(timeMs, deltaMs, this.system.getActiveEnemies());

    return frame.consumedArrowIds;
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  destroy() {
    this.renderer.destroy();
    this.system.clear();
  }
}

class SlimeSlot extends EnemySlotBase {
  private readonly system = new SlimeSystem();
  private renderer!: SlimeRenderer;

  constructor() {
    super('slime', 'Slime (parent + split)');
  }

  protected onCreate() {
    this.renderer = new SlimeRenderer(this.scene);
    this.renderer.create();
  }

  start() {
    this.system.startEncounter(this.cell.spawnPoints, { enemyCount: 1, role: 'parent' });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'slime-spawned' || event.type === 'slime-split') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'slime-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'slime-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    this.renderer.playEvents(frame.events);
    this.renderer.update(timeMs, deltaMs, this.system.getActiveEnemies());

    return frame.consumedArrowIds;
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  destroy() {
    this.renderer.destroy();
    this.system.clear();
  }
}

class SpooperGooperSlot extends EnemySlotBase {
  private readonly system = new SpooperGooperSystem();
  private readonly darts = new EnemyDartProjectileSystem();
  private renderer!: SpooperGooperRenderer;
  private dartRenderer!: EnemyDartProjectileRenderer;

  constructor() {
    super('spooper-gooper', 'Spooper Gooper');
  }

  protected onCreate() {
    this.renderer = new SpooperGooperRenderer(this.scene);
    this.renderer.create();
    this.dartRenderer = new EnemyDartProjectileRenderer(this.scene);
    this.dartRenderer.create();
  }

  start() {
    this.darts.clear();
    this.system.startEncounter(this.cell.spawnPoints, { enemyCount: ENCOUNTER_SIZE });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'spooper-gooper-spawned' || event.type === 'spooper-gooper-appeared') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'spooper-gooper-attacked') {
        this.darts.fireDart({
          origin: event.position,
          direction: event.direction,
          speed: 150,
          damage: event.damage,
          style: 'black-ink',
          ttlMs: 4200
        });
      } else if (event.type === 'spooper-gooper-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'spooper-gooper-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    const dartEvents = this.darts.update(deltaMs, this.cell.bounds, clampToBounds(target, this.cell.bounds));

    this.renderer.playEvents(frame.events);
    this.dartRenderer.playEvents(dartEvents);
    this.renderer.update(timeMs, deltaMs, this.system.getActiveEnemies());
    this.dartRenderer.update(deltaMs, this.darts.getActiveDarts());

    return frame.consumedArrowIds;
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  destroy() {
    this.renderer.destroy();
    this.dartRenderer.destroy();
    this.system.clear();
    this.darts.clear();
  }
}

class BowbertSlot implements WorkbenchSlot {
  readonly id = 'bowbert';
  readonly label = 'Bowbert (player)';
  readonly kind = 'player' as const;

  readonly actions = [{ label: '变羊4秒', run: () => this.player.markHexed(4000) }];

  private scene!: Phaser.Scene;
  private cell!: WorkbenchCell;
  private feedback!: CombatFeedbackRenderer;
  private player!: BowbertPlayerModel;
  private renderer!: BowbertRenderer;
  private readonly arrows = new ArrowProjectileSystem();
  private arrowRenderer!: ArrowProjectileRenderer;
  private firing = true;
  private patrol = true;
  private dodgeQueued = false;
  private patrolPhase = 0;

  create(scene: Phaser.Scene, cell: WorkbenchCell, feedback: CombatFeedbackRenderer) {
    this.scene = scene;
    this.cell = cell;
    this.feedback = feedback;
    this.player = new BowbertPlayerModel(cell.center);
    this.renderer = new BowbertRenderer(this.scene);
    this.renderer.create();
    this.arrowRenderer = new ArrowProjectileRenderer(this.scene);
    this.arrowRenderer.create();
    this.renderer.update(0, 0, this.player.state);
  }

  start() {
    this.player = new BowbertPlayerModel(this.cell.center);
    this.arrows.clear();
  }

  toggleFiring(): boolean {
    this.firing = !this.firing;
    return this.firing;
  }

  togglePatrol(): boolean {
    this.patrol = !this.patrol;
    return this.patrol;
  }

  dodge() {
    this.dodgeQueued = true;
  }

  hit(_damage: number) {
    this.player.markHit();
    this.feedback.playDamage(this.player.state.position, 1);
  }

  aliveCount(): number {
    return 1;
  }

  update(timeMs: number, deltaMs: number, target: SimVector) {
    const position = this.player.state.position;
    const aim = { x: target.x - position.x, y: target.y - position.y };
    let move = { x: 0, y: 0 };

    if (this.patrol) {
      this.patrolPhase += deltaMs * 0.0011;

      const waypoint = {
        x: this.cell.center.x + Math.cos(this.patrolPhase) * (this.cell.bounds.width * 0.22),
        y: this.cell.center.y + Math.sin(this.patrolPhase * 2) * (this.cell.bounds.height * 0.18)
      };
      const toWaypoint = { x: waypoint.x - position.x, y: waypoint.y - position.y };
      const distance = Math.hypot(toWaypoint.x, toWaypoint.y);

      if (distance > 6) {
        move = { x: toWaypoint.x / distance, y: toWaypoint.y / distance };
      }
    }

    const snapshot: InputSnapshot = {
      move,
      aim,
      facing: aim,
      firing: this.firing,
      actions: { dodge: this.dodgeQueued },
      source: 'desktop'
    };

    this.dodgeQueued = false;

    const frame = this.player.update(snapshot, deltaMs, this.cell.bounds);

    for (const event of frame.events) {
      if (event.type === 'arrow-fired') {
        this.arrows.fireArrow(event);
      } else if (event.type === 'dodge-started') {
        this.feedback.playDodge(this.player.state.position, event.direction);
      }
    }

    const arrowEvents = this.arrows.update(deltaMs, this.cell.bounds);

    this.arrowRenderer.playEvents(arrowEvents);
    this.arrowRenderer.update(deltaMs, this.arrows.getActiveArrows());
    this.renderer.update(timeMs, deltaMs, frame.state);
  }

  destroy() {
    this.renderer.destroy();
    this.arrowRenderer.destroy();
    this.arrows.clear();
  }
}


class BackboardSlot extends EnemySlotBase {
  private readonly system = new BackboardSystem();
  private readonly darts = new EnemyDartProjectileSystem();
  private renderer!: BackboardRenderer;
  private dartRenderer!: EnemyDartProjectileRenderer;

  readonly actions = [{ label: '强制招架', run: () => this.system.debugForceParry() }];

  constructor() {
    super('backboard', 'Backboard');
  }

  protected onCreate() {
    this.renderer = new BackboardRenderer(this.scene);
    this.renderer.create();
    this.dartRenderer = new EnemyDartProjectileRenderer(this.scene);
    this.dartRenderer.create();
  }

  start() {
    this.darts.clear();
    this.system.startEncounter(this.cell.spawnPoints, { enemyCount: ENCOUNTER_SIZE });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'backboard-spawned') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'backboard-reflected') {
        this.darts.fireDart({
          origin: event.origin,
          direction: event.direction,
          speed: 250,
          damage: event.damage,
          style: 'goober-dart'
        });
      } else if (event.type === 'backboard-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'backboard-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    const dartEvents = this.darts.update(deltaMs, this.cell.bounds, clampToBounds(target, this.cell.bounds));

    this.renderer.playEvents(frame.events);
    this.dartRenderer.playEvents(dartEvents);
    this.renderer.update(timeMs, deltaMs, this.system.getActiveEnemies());
    this.dartRenderer.update(deltaMs, this.darts.getActiveDarts());

    return frame.consumedArrowIds;
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  destroy() {
    this.renderer.destroy();
    this.dartRenderer.destroy();
    this.system.clear();
    this.darts.clear();
  }
}

class SwitcherooSlot extends EnemySlotBase {
  private readonly system = new SwitcherooSystem();
  private renderer!: SwitcherooRenderer;

  readonly actions = [{ label: '强制交换', run: () => this.system.debugForceSwap() }];

  constructor() {
    super('switcheroo', 'Switcheroo');
  }

  protected onCreate() {
    this.renderer = new SwitcherooRenderer(this.scene);
    this.renderer.create();
  }

  start() {
    this.system.startEncounter(this.cell.spawnPoints, { enemyCount: ENCOUNTER_SIZE });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'switcheroo-spawned') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'switcheroo-windup') {
        this.feedback.playSporeBreak(event.position);
        this.feedback.playSporeBreak(event.targetPosition);
      } else if (event.type === 'switcheroo-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'switcheroo-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    this.renderer.playEvents(frame.events);
    this.renderer.update(timeMs, deltaMs, this.system.getActiveEnemies(), clampToBounds(target, this.cell.bounds));

    return frame.consumedArrowIds;
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return this.system.getActiveEnemies().map((enemy) => enemy.position);
  }

  destroy() {
    this.renderer.destroy();
    this.system.clear();
  }
}

class DoorbertSlot extends EnemySlotBase {
  private readonly system = new DoorbertSystem();
  private readonly minions = new SpooperGooperSystem();
  private renderer!: DoorbertRenderer;
  private minionRenderer!: SpooperGooperRenderer;
  private lastTarget: SimVector = { x: 0, y: 0 };

  readonly actions = [{ label: '强制开门', run: () => this.system.debugForceOpen() }];

  constructor() {
    super('doorbert', 'Doorbert (随机放怪)');
  }

  protected onCreate() {
    this.renderer = new DoorbertRenderer(this.scene);
    this.renderer.create();
    this.minionRenderer = new SpooperGooperRenderer(this.scene);
    this.minionRenderer.create();
  }

  start() {
    this.minions.clear();
    this.system.startEncounter(this.cell.spawnPoints, { enemyCount: 1, spawnKeylets: false });
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    this.lastTarget = target;

    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);
    const minionFrame = this.minions.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'doorbert-spawned') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'doorbert-burst') {
        this.minions.startEncounter(
          [
            { id: 'wb-door-minion-0', x: event.position.x - 26, y: event.position.y },
            { id: 'wb-door-minion-1', x: event.position.x + 26, y: event.position.y }
          ],
          { enemyCount: 2 }
        );
      } else if (event.type === 'doorbert-blocked') {
        this.feedback.playArrowWall(event.position);
      } else if (event.type === 'doorbert-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'doorbert-killed') {
        for (const minion of this.minions.getActiveEnemies()) {
          this.feedback.playSporeBreak(minion.position);
        }

        this.minions.clear();
        this.feedback.playEnemyDeath(event.position);
      }
    }

    for (const event of minionFrame.events) {
      if (event.type === 'spooper-gooper-appeared') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'spooper-gooper-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'spooper-gooper-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    this.renderer.playEvents(frame.events);
    this.minionRenderer.playEvents(minionFrame.events);
    this.renderer.update(
      timeMs,
      deltaMs,
      this.system.getActiveDoors(),
      this.system.getActiveKeylets(),
      this.lastTarget
    );
    this.minionRenderer.update(timeMs, deltaMs, this.minions.getActiveEnemies());

    return [...frame.consumedArrowIds, ...minionFrame.consumedArrowIds];
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return [
      ...this.system.getActiveDoors().map((door) => door.position),
      ...this.minions.getActiveEnemies().map((minion) => minion.position)
    ];
  }

  destroy() {
    this.renderer.destroy();
    this.minionRenderer.destroy();
    this.system.clear();
    this.minions.clear();
  }
}


class HexbrimSlot extends EnemySlotBase {
  private readonly system = new HexbrimSystem();
  private readonly door = new DoorbertSystem();
  private readonly shades = new SpooperGooperSystem();
  private readonly darts = new EnemyDartProjectileSystem();
  private renderer!: HexbrimRenderer;
  private doorRenderer!: DoorbertRenderer;
  private shadeRenderer!: SpooperGooperRenderer;
  private dartRenderer!: EnemyDartProjectileRenderer;

  readonly actions = [
    { label: '强制弹幕', run: () => this.system.debugForce('volley') },
    { label: '强制咒术', run: () => this.system.debugForce('hexcast') },
    { label: '强制巫火', run: () => this.system.debugForce('witchfire') },
    { label: '强制传送', run: () => this.system.debugForce('teleport') },
    { label: '强制分身', run: () => this.system.debugForce('clones') },
    { label: '强制召唤', run: () => this.system.debugForce('summon') }
  ];

  constructor() {
    super('hexbrim', 'Hexbrim (BOSS)');
  }

  protected onCreate() {
    this.renderer = new HexbrimRenderer(this.scene);
    this.renderer.create();
    this.doorRenderer = new DoorbertRenderer(this.scene);
    this.doorRenderer.create();
    this.shadeRenderer = new SpooperGooperRenderer(this.scene);
    this.shadeRenderer.create();
    this.dartRenderer = new EnemyDartProjectileRenderer(this.scene);
    this.dartRenderer.create();
  }

  start() {
    this.darts.clear();
    this.door.clear();
    this.shades.clear();
    this.system.startEncounter(this.cell.spawnPoints);
  }

  protected step(timeMs: number, deltaMs: number, target: SimVector, arrows: readonly ArrowProjectile[]) {
    const frame = this.system.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of frame.events) {
      if (event.type === 'hexbrim-spawned') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'hexbrim-volley') {
        const speeds = event.pattern === 'stream' ? [170, 225, 285] : [220];

        for (const direction of event.directions) {
          for (const speed of speeds) {
            this.darts.fireDart({
              origin: event.origin,
              direction,
              speed,
              damage: 1,
              style: 'black-ink'
            });
          }
        }
      } else if (event.type === 'hexbrim-summon') {
        const position = event.positions[0] ?? clampToBounds(target, this.cell.bounds);

        this.feedback.playAnnouncement('THE DOOR ANSWERS', this.cell.bounds, 'damage');
        this.door.startEncounter([{ id: 'wb-hexbrim-door', x: position.x, y: position.y }], {
          enemyCount: 1,
          spawnKeylets: false
        });
      } else if (event.type === 'hexbrim-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'hexbrim-witchfire-burn') {
        this.feedback.playDamage(event.position, event.damage);
      } else if (event.type === 'hexbrim-channel-started') {
        this.feedback.playAnnouncement('THE RITUAL BEGINS', this.cell.bounds, 'damage');
      } else if (event.type === 'hexbrim-ritual-complete') {
        this.feedback.playAnnouncement('TOO SLOW', this.cell.bounds, 'damage');
        this.feedback.playDamage(clampToBounds(target, this.cell.bounds), event.damage);
      } else if (event.type === 'hexbrim-channel-interrupted') {
        this.feedback.playAnnouncement('RITUAL BROKEN', this.cell.bounds, 'clear');
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'hexbrim-clone-dispelled') {
        this.feedback.playSporeBreak(event.position);
      } else if (event.type === 'hexbrim-killed') {
        for (const door of this.door.getActiveDoors()) {
          this.feedback.playSporeBreak(door.position);
        }

        for (const shade of this.shades.getActiveEnemies()) {
          this.feedback.playSporeBreak(shade.position);
        }

        this.door.clear();
        this.shades.clear();
        this.feedback.playEnemyDeath(event.position);
      }
    }

    const doorFrame = this.door.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of doorFrame.events) {
      if (event.type === 'doorbert-spawned') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'doorbert-burst') {
        this.shades.startEncounter(
          [
            { id: 'wb-hexdoor-minion-0', x: event.position.x - 26, y: event.position.y },
            { id: 'wb-hexdoor-minion-1', x: event.position.x + 26, y: event.position.y }
          ],
          { enemyCount: 2 }
        );
      } else if (event.type === 'doorbert-blocked') {
        this.feedback.playArrowWall(event.position);
      } else if (event.type === 'doorbert-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'doorbert-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    const shadeFrame = this.shades.update(deltaMs, this.cell.bounds, target, arrows);

    for (const event of shadeFrame.events) {
      if (event.type === 'spooper-gooper-appeared') {
        this.feedback.playEnemySpawn(event.position);
      } else if (event.type === 'spooper-gooper-attacked') {
        this.darts.fireDart({
          origin: event.position,
          direction: event.direction,
          speed: 150,
          damage: event.damage,
          style: 'black-ink',
          ttlMs: 4200
        });
      } else if (event.type === 'spooper-gooper-hit' && event.hp > 0) {
        this.feedback.playArrowEnemy(event.position, event.damage);
      } else if (event.type === 'spooper-gooper-killed') {
        this.feedback.playEnemyDeath(event.position);
      }
    }

    const dartEvents = this.darts.update(deltaMs, this.cell.bounds, clampToBounds(target, this.cell.bounds));

    this.renderer.playEvents(frame.events);
    this.doorRenderer.playEvents(doorFrame.events);
    this.shadeRenderer.playEvents(shadeFrame.events);
    this.dartRenderer.playEvents(dartEvents);
    this.renderer.update(
      timeMs,
      deltaMs,
      this.system.getActiveEntities(),
      this.system.getActiveHexOrbs(),
      this.system.getActiveFirePatches()
    );
    this.doorRenderer.update(
      timeMs,
      deltaMs,
      this.door.getActiveDoors(),
      this.door.getActiveKeylets(),
      clampToBounds(target, this.cell.bounds)
    );
    this.shadeRenderer.update(timeMs, deltaMs, this.shades.getActiveEnemies());
    this.dartRenderer.update(deltaMs, this.darts.getActiveDarts());

    return [
      ...frame.consumedArrowIds,
      ...doorFrame.consumedArrowIds,
      ...shadeFrame.consumedArrowIds
    ];
  }

  protected cleared(): boolean {
    return this.system.isEncounterCleared();
  }

  protected enemyPositions(): readonly SimVector[] {
    return [
      ...this.system.getActiveEntities().filter((e) => e.visible).map((e) => e.position),
      ...this.door.getActiveDoors().map((door) => door.position),
      ...this.shades.getActiveEnemies().map((shade) => shade.position)
    ];
  }

  destroy() {
    this.renderer.destroy();
    this.doorRenderer.destroy();
    this.shadeRenderer.destroy();
    this.dartRenderer.destroy();
    this.system.clear();
    this.door.clear();
    this.shades.clear();
    this.darts.clear();
  }
}

export const createWorkbenchSlots = (): WorkbenchSlot[] => [
  new BowbertSlot(),
  new DartGooberSlot('dart-goober'),
  new DartGooberSlot('dart-tri-goober'),
  new ShroomSlot('red'),
  new ShroomSlot('purple'),
  new KaboomletSlot(),
  new SlimeSlot(),
  new SpooperGooperSlot(),
  new BackboardSlot(),
  new SwitcherooSlot(),
  new DoorbertSlot(),
  new HexbrimSlot(),
  // Rigged-but-not-integrated characters review on display stands.
  ...createDisplaySlots()
];
