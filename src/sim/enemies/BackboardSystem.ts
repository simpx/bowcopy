import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

/**
 * Backboard: anti-ranged plank on a fixed, learnable rhythm
 * (drift -> brace -> parry -> recover). Arrows that land during the parry
 * window are consumed and reported as reflections (the kit fires them back
 * as enemy projectiles); the plank is invulnerable while parrying and wide
 * open during recover.
 */

export type BackboardPhase = 'spawning' | 'drift' | 'brace' | 'parry' | 'recover';

export interface BackboardEnemy {
  readonly id: number;
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: BackboardPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  moveAmount: number;
  walkPhase: number;
  hitFlashMs: number;
  driftDirection: SimVector;
}

export type BackboardEvent =
  | { type: 'backboard-spawned'; id: number; position: SimVector }
  | { type: 'backboard-parry-start'; id: number; position: SimVector }
  | { type: 'backboard-reflected'; id: number; origin: SimVector; direction: SimVector; damage: number }
  | { type: 'backboard-hit'; id: number; arrowId: number; position: SimVector; hp: number; damage: number }
  | { type: 'backboard-killed'; id: number; position: SimVector }
  | { type: 'backboard-encounter-cleared' };

export interface BackboardFrame {
  readonly events: BackboardEvent[];
  readonly consumedArrowIds: number[];
}

export interface BackboardEncounterOptions {
  readonly enemyCount?: number;
  readonly waveIndex?: number;
}

const DEFAULT_ENCOUNTER_SIZE = 2;
const FIRST_SPAWN_DELAY_MS = 260;
const SPAWN_CADENCE_MS = 620;
const SPAWN_DURATION_MS = 360;
const DRIFT_MS = 2600;
const BRACE_MS = 420;
const PARRY_MS = 1150;
const RECOVER_MS = 1400;
const DRIFT_SPEED = 26;
const REFLECT_DAMAGE = 1;
const MAX_HP = 4;
const HIT_FLASH_MS = 170;
const ENEMY_RADIUS = 26;
const ENEMY_HIT_RADIUS = 34;
const DEAD_ZONE = 0.001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

const copyVector = (vector: SimVector): SimVector => ({ x: vector.x, y: vector.y });

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= DEAD_ZONE) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

const vectorTo = (from: SimVector, to: SimVector): SimVector =>
  normalize({ x: to.x - from.x, y: to.y - from.y });

const randomDirection = (): SimVector => {
  const angle = Math.random() * Math.PI * 2;

  return { x: Math.cos(angle), y: Math.sin(angle) };
};

const clampPositionToBounds = (position: SimVector, bounds: RoomBounds): SimVector => ({
  x: clamp(
    position.x,
    bounds.x + bounds.border + ENEMY_RADIUS,
    bounds.x + bounds.width - bounds.border - ENEMY_RADIUS
  ),
  y: clamp(
    position.y,
    bounds.y + bounds.border + ENEMY_RADIUS,
    bounds.y + bounds.height - bounds.border - ENEMY_RADIUS
  )
});

const getSegmentDistanceSquared = (point: SimVector, start: SimVector, end: SimVector): number => {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (lengthSquared <= DEAD_ZONE) {
    const deltaX = point.x - start.x;
    const deltaY = point.y - start.y;

    return deltaX * deltaX + deltaY * deltaY;
  }

  const projection = clamp(
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
    0,
    1
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;
  const deltaX = point.x - closestX;
  const deltaY = point.y - closestY;

  return deltaX * deltaX + deltaY * deltaY;
};

export class BackboardSystem {
  private readonly enemies = new Map<number, BackboardEnemy>();
  private pendingSpawns: RoomSpawnPoint[] = [];
  private nextId = 1;
  private nextSpawnMs = 0;
  private encounterStarted = false;
  private encounterCleared = false;

  startEncounter(spawnPoints: readonly RoomSpawnPoint[], options: BackboardEncounterOptions = {}) {
    this.clear();
    this.encounterStarted = true;
    this.pendingSpawns = Array.from(spawnPoints).slice(
      0,
      Math.max(1, Math.floor(options.enemyCount ?? DEFAULT_ENCOUNTER_SIZE))
    );
    this.nextSpawnMs = Math.max(130, FIRST_SPAWN_DELAY_MS - (options.waveIndex ?? 1) * 14);
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): BackboardFrame {
    const events: BackboardEvent[] = [];
    const consumedArrowIds = new Set<number>();

    if (!this.encounterStarted || this.encounterCleared) {
      return { events, consumedArrowIds: [] };
    }

    this.updateSpawnQueue(deltaMs, events);
    this.applyArrowHits(arrows, events, consumedArrowIds);

    for (const enemy of Array.from(this.enemies.values())) {
      this.updateEnemy(enemy, deltaMs, bounds, playerPosition, events);
    }

    if (this.pendingSpawns.length === 0 && this.enemies.size === 0 && !this.encounterCleared) {
      this.encounterCleared = true;
      events.push({ type: 'backboard-encounter-cleared' });
    }

    return { events, consumedArrowIds: Array.from(consumedArrowIds) };
  }

  getActiveEnemies(): readonly BackboardEnemy[] {
    return Array.from(this.enemies.values());
  }

  hasEncounterStarted(): boolean {
    return this.encounterStarted;
  }

  isEncounterCleared(): boolean {
    return this.encounterCleared;
  }

  /** Debug hook: force every plank straight into its parry stance. */
  debugForceParry() {
    for (const enemy of this.enemies.values()) {
      if (enemy.phase !== 'spawning') {
        this.enterPhase(enemy, 'parry');
      }
    }
  }

  clear() {
    this.enemies.clear();
    this.pendingSpawns = [];
    this.nextId = 1;
    this.nextSpawnMs = 0;
    this.encounterStarted = false;
    this.encounterCleared = false;
  }

  private updateSpawnQueue(deltaMs: number, events: BackboardEvent[]) {
    if (this.pendingSpawns.length === 0) {
      return;
    }

    this.nextSpawnMs -= deltaMs;

    if (this.nextSpawnMs > 0) {
      return;
    }

    const spawn = this.pendingSpawns.shift();

    if (!spawn) {
      return;
    }

    const enemy: BackboardEnemy = {
      id: this.nextId++,
      position: { x: spawn.x, y: spawn.y },
      velocity: zeroVector(),
      facing: { x: 0, y: 1 },
      hp: MAX_HP,
      maxHp: MAX_HP,
      phase: 'spawning',
      phaseElapsedMs: 0,
      phaseDurationMs: SPAWN_DURATION_MS,
      spawnProgress: 0,
      moveAmount: 0,
      walkPhase: Math.random() * Math.PI * 2,
      hitFlashMs: 0,
      driftDirection: randomDirection()
    };

    this.enemies.set(enemy.id, enemy);
    this.nextSpawnMs = SPAWN_CADENCE_MS;
    events.push({ type: 'backboard-spawned', id: enemy.id, position: copyVector(enemy.position) });
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: BackboardEvent[],
    consumedArrowIds: Set<number>
  ) {
    const hitRadiusSquared = ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS;

    for (const enemy of Array.from(this.enemies.values())) {
      for (const arrow of arrows) {
        if (consumedArrowIds.has(arrow.id)) {
          continue;
        }

        if (
          getSegmentDistanceSquared(enemy.position, arrow.previousPosition, arrow.position) >
          hitRadiusSquared
        ) {
          continue;
        }

        consumedArrowIds.add(arrow.id);

        if (enemy.phase === 'parry') {
          const incoming = normalize(arrow.direction);

          events.push({
            type: 'backboard-reflected',
            id: enemy.id,
            origin: copyVector(enemy.position),
            direction: { x: -incoming.x, y: -incoming.y },
            damage: REFLECT_DAMAGE
          });
          continue;
        }

        enemy.hp -= arrow.damage;
        enemy.hitFlashMs = HIT_FLASH_MS;

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({ type: 'backboard-killed', id: enemy.id, position: copyVector(enemy.position) });
          break;
        }

        events.push({
          type: 'backboard-hit',
          id: enemy.id,
          arrowId: arrow.id,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: arrow.damage
        });
      }
    }
  }

  private enterPhase(enemy: BackboardEnemy, phase: BackboardPhase) {
    enemy.phase = phase;
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs =
      phase === 'spawning'
        ? SPAWN_DURATION_MS
        : phase === 'drift'
          ? DRIFT_MS * (0.8 + Math.random() * 0.4)
          : phase === 'brace'
            ? BRACE_MS
            : phase === 'parry'
              ? PARRY_MS
              : RECOVER_MS;

    if (phase === 'drift') {
      enemy.driftDirection = randomDirection();
    }
  }

  private updateEnemy(
    enemy: BackboardEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: BackboardEvent[]
  ) {
    enemy.phaseElapsedMs += deltaMs;
    enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
    enemy.facing = vectorTo(enemy.position, playerPosition);
    enemy.walkPhase += deltaMs * 0.008;

    if (enemy.phase === 'spawning') {
      enemy.spawnProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      enemy.moveAmount = 0;

      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.enterPhase(enemy, 'drift');
      }

      return;
    }

    if (enemy.phase === 'drift') {
      enemy.position.x += enemy.driftDirection.x * DRIFT_SPEED * (deltaMs / 1000);
      enemy.position.y += enemy.driftDirection.y * DRIFT_SPEED * (deltaMs / 1000);
      enemy.position = clampPositionToBounds(enemy.position, bounds);
      enemy.moveAmount = 1;

      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.enterPhase(enemy, 'brace');
      }

      return;
    }

    enemy.moveAmount = 0;

    if (enemy.phase === 'brace' && enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.enterPhase(enemy, 'parry');
      events.push({
        type: 'backboard-parry-start',
        id: enemy.id,
        position: copyVector(enemy.position)
      });
      return;
    }

    if (enemy.phase === 'parry' && enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.enterPhase(enemy, 'recover');
      return;
    }

    if (enemy.phase === 'recover' && enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.enterPhase(enemy, 'drift');
    }
  }
}
