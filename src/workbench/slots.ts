import type Phaser from 'phaser';

import {
  DartGooberSystem,
  KaboomletSystem,
  RedShroomSystem,
  SlimeSystem,
  SpooperGooperSystem
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
  DartGooberRenderer,
  DartTriGooberRenderer,
  KaboomletRenderer,
  RedShroomRenderer,
  SlimeRenderer,
  SpooperGooperRenderer
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

  constructor(
    readonly id: string,
    readonly label: string
  ) {}

  create(scene: Phaser.Scene, cell: WorkbenchCell, feedback: CombatFeedbackRenderer) {
    this.scene = scene;
    this.cell = cell;
    this.feedback = feedback;
    this.onCreate();
    this.start();
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
    const arrows = this.pendingArrows;

    this.pendingArrows = [];
    this.step(timeMs, deltaMs, target, arrows);

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
  ): void;
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
          speed: 92,
          damage: event.damage,
          style: 'black-ink',
          ttlMs: 1800
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

export const createWorkbenchSlots = (): WorkbenchSlot[] => [
  new BowbertSlot(),
  new DartGooberSlot('dart-goober'),
  new DartGooberSlot('dart-tri-goober'),
  new ShroomSlot('red'),
  new ShroomSlot('purple'),
  new KaboomletSlot(),
  new SlimeSlot(),
  new SpooperGooperSlot(),
  // Rigged-but-not-integrated characters review on display stands.
  ...createDisplaySlots()
];
