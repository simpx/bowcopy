import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

export type DartGooberPhase = 'spawning' | 'moving' | 'shooting' | 'recovering';

export interface DartGooberEnemy {
  readonly id: number;
  readonly spawnId: string;
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: DartGooberPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  shootCharge: number;
  moveAmount: number;
  walkPhase: number;
  hitFlashMs: number;
  radius: number;
}

interface DartGooberRuntime extends DartGooberEnemy {
  moveDirection: SimVector;
  moveSpeed: number;
  shootFired: boolean;
}

export type DartGooberEvent =
  | {
      type: 'dart-goober-spawned';
      id: number;
      position: SimVector;
    }
  | {
      type: 'dart-goober-hit';
      id: number;
      arrowId: number;
      position: SimVector;
      hp: number;
      damage: number;
    }
  | {
      type: 'dart-goober-killed';
      id: number;
      position: SimVector;
    }
  | {
      type: 'enemy-dart-fired';
      enemyId: number;
      origin: SimVector;
      direction: SimVector;
      damage: number;
      speed: number;
    }
  | {
      type: 'dart-goober-encounter-cleared';
    };

export interface DartGooberFrame {
  readonly events: DartGooberEvent[];
  readonly consumedArrowIds: number[];
}

const ENCOUNTER_SIZE = 3;
const FIRST_SPAWN_DELAY_MS = 260;
const SPAWN_CADENCE_MS = 720;
const SPAWN_DURATION_MS = 430;
const MOVE_MIN_MS = 560;
const MOVE_MAX_MS = 940;
const MOVE_MIN_SPEED = 62;
const MOVE_MAX_SPEED = 102;
const MOVE_ANGLE_OFFSET = 0.58;
const SHOOT_FIRE_AT_MS = 330;
const SHOOT_DURATION_MS = 560;
const RECOVERY_DURATION_MS = 170;
const MAX_HP = 3;
const HIT_FLASH_MS = 170;
const ENEMY_RADIUS = 28;
const ENEMY_HIT_RADIUS = 35;
const DART_DAMAGE = 1;
const DART_SPEED = 248;
const DART_MUZZLE_DISTANCE = 32;
const DART_AIM_OFFSET = 0.08;
const DEAD_ZONE = 0.001;

const copyVector = (vector: SimVector): SimVector => ({
  x: vector.x,
  y: vector.y
});

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const decay = (value: number, deltaMs: number): number => Math.max(0, value - deltaMs);

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= DEAD_ZONE) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
};

const rotateVector = (vector: SimVector, radians: number): SimVector => {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    x: vector.x * cos - vector.y * sin,
    y: vector.x * sin + vector.y * cos
  };
};

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

const vectorTo = (from: SimVector, to: SimVector): SimVector =>
  normalize({
    x: to.x - from.x,
    y: to.y - from.y
  });

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

const getSegmentDistanceSquared = (
  point: SimVector,
  start: SimVector,
  end: SimVector
): number => {
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

const pickEncounterSpawns = (spawnPoints: readonly RoomSpawnPoint[]): RoomSpawnPoint[] => {
  if (spawnPoints.length <= ENCOUNTER_SIZE) {
    return Array.from(spawnPoints);
  }

  const preferredIndexes = [0, Math.floor(spawnPoints.length / 2), spawnPoints.length - 1];
  const selected: RoomSpawnPoint[] = [];

  for (const index of preferredIndexes) {
    const spawn = spawnPoints[index];

    if (spawn && !selected.includes(spawn)) {
      selected.push(spawn);
    }
  }

  for (const spawn of spawnPoints) {
    if (selected.length >= ENCOUNTER_SIZE) {
      break;
    }

    if (!selected.includes(spawn)) {
      selected.push(spawn);
    }
  }

  return selected.slice(0, ENCOUNTER_SIZE);
};

export class DartGooberSystem {
  private readonly enemies = new Map<number, DartGooberRuntime>();
  private pendingSpawns: RoomSpawnPoint[] = [];
  private nextId = 1;
  private nextSpawnMs = 0;
  private encounterStarted = false;
  private encounterCleared = false;

  startEncounter(spawnPoints: readonly RoomSpawnPoint[]) {
    this.clear();
    this.encounterStarted = true;
    this.pendingSpawns = pickEncounterSpawns(spawnPoints);
    this.nextSpawnMs = FIRST_SPAWN_DELAY_MS;
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): DartGooberFrame {
    const events: DartGooberEvent[] = [];
    const consumedArrowIds = new Set<number>();

    if (!this.encounterStarted || this.encounterCleared) {
      return {
        events,
        consumedArrowIds: []
      };
    }

    this.updateSpawnQueue(deltaMs, events);
    this.applyArrowHits(arrows, events, consumedArrowIds);

    for (const enemy of this.enemies.values()) {
      this.updateEnemy(enemy, deltaMs, bounds, playerPosition, events);
    }

    this.updateEncounterCleared(events);

    return {
      events,
      consumedArrowIds: Array.from(consumedArrowIds)
    };
  }

  getActiveEnemies(): readonly DartGooberEnemy[] {
    return Array.from(this.enemies.values());
  }

  hasEncounterStarted(): boolean {
    return this.encounterStarted;
  }

  isEncounterCleared(): boolean {
    return this.encounterCleared;
  }

  clear() {
    this.enemies.clear();
    this.pendingSpawns = [];
    this.nextId = 1;
    this.nextSpawnMs = 0;
    this.encounterStarted = false;
    this.encounterCleared = false;
  }

  private updateSpawnQueue(deltaMs: number, events: DartGooberEvent[]) {
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

    const enemy = this.createEnemy(spawn);

    this.enemies.set(enemy.id, enemy);
    this.nextSpawnMs = SPAWN_CADENCE_MS;
    events.push({
      type: 'dart-goober-spawned',
      id: enemy.id,
      position: copyVector(enemy.position)
    });
  }

  private createEnemy(spawn: RoomSpawnPoint): DartGooberRuntime {
    return {
      id: this.nextId++,
      spawnId: spawn.id,
      position: { x: spawn.x, y: spawn.y },
      velocity: zeroVector(),
      facing: { x: 0, y: 1 },
      hp: MAX_HP,
      maxHp: MAX_HP,
      phase: 'spawning',
      phaseElapsedMs: 0,
      phaseDurationMs: SPAWN_DURATION_MS,
      spawnProgress: 0,
      shootCharge: 0,
      moveAmount: 0,
      walkPhase: randomRange(0, Math.PI * 2),
      hitFlashMs: 0,
      radius: ENEMY_HIT_RADIUS,
      moveDirection: zeroVector(),
      moveSpeed: 0,
      shootFired: false
    };
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: DartGooberEvent[],
    consumedArrowIds: Set<number>
  ) {
    const hitRadiusSquared = ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS;

    for (const enemy of Array.from(this.enemies.values())) {
      for (const arrow of arrows) {
        if (consumedArrowIds.has(arrow.id)) {
          continue;
        }

        const distanceSquared = getSegmentDistanceSquared(
          enemy.position,
          arrow.previousPosition,
          arrow.position
        );

        if (distanceSquared > hitRadiusSquared) {
          continue;
        }

        consumedArrowIds.add(arrow.id);
        enemy.hp -= arrow.damage;
        enemy.hitFlashMs = HIT_FLASH_MS;

        events.push({
          type: 'dart-goober-hit',
          id: enemy.id,
          arrowId: arrow.id,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: arrow.damage
        });

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({
            type: 'dart-goober-killed',
            id: enemy.id,
            position: copyVector(enemy.position)
          });
          break;
        }
      }
    }
  }

  private updateEnemy(
    enemy: DartGooberRuntime,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: DartGooberEvent[]
  ) {
    enemy.phaseElapsedMs += deltaMs;
    enemy.hitFlashMs = decay(enemy.hitFlashMs, deltaMs);

    if (enemy.phase === 'spawning') {
      enemy.velocity = zeroVector();
      enemy.moveAmount = 0;
      enemy.spawnProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);

      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginMoving(enemy, playerPosition);
      }

      return;
    }

    enemy.spawnProgress = 1;

    if (enemy.phase === 'moving') {
      this.updateMoving(enemy, deltaMs, bounds, playerPosition);
      return;
    }

    if (enemy.phase === 'shooting') {
      this.updateShooting(enemy, playerPosition, events);
      return;
    }

    this.updateRecovering(enemy, playerPosition);
  }

  private updateMoving(
    enemy: DartGooberRuntime,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector
  ) {
    const deltaSeconds = deltaMs / 1000;

    enemy.velocity = {
      x: enemy.moveDirection.x * enemy.moveSpeed,
      y: enemy.moveDirection.y * enemy.moveSpeed
    };
    enemy.position = clampPositionToBounds(
      {
        x: enemy.position.x + enemy.velocity.x * deltaSeconds,
        y: enemy.position.y + enemy.velocity.y * deltaSeconds
      },
      bounds
    );
    enemy.facing = copyVector(enemy.moveDirection);
    enemy.moveAmount = clamp01(enemy.moveSpeed / MOVE_MAX_SPEED);
    enemy.walkPhase += deltaMs * 0.014 * enemy.moveAmount;
    enemy.shootCharge = 0;

    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.beginShooting(enemy, playerPosition);
    }
  }

  private updateShooting(
    enemy: DartGooberRuntime,
    playerPosition: SimVector,
    events: DartGooberEvent[]
  ) {
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.facing = vectorTo(enemy.position, playerPosition);
    enemy.shootCharge = clamp01(enemy.phaseElapsedMs / SHOOT_FIRE_AT_MS);

    if (!enemy.shootFired && enemy.phaseElapsedMs >= SHOOT_FIRE_AT_MS) {
      const direction = normalize(rotateVector(enemy.facing, randomRange(-DART_AIM_OFFSET, DART_AIM_OFFSET)));
      const origin = {
        x: enemy.position.x + direction.x * DART_MUZZLE_DISTANCE,
        y: enemy.position.y + direction.y * DART_MUZZLE_DISTANCE - 12
      };

      enemy.shootFired = true;
      events.push({
        type: 'enemy-dart-fired',
        enemyId: enemy.id,
        origin,
        direction,
        damage: DART_DAMAGE,
        speed: DART_SPEED
      });
    }

    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.beginRecovering(enemy);
    }
  }

  private updateRecovering(enemy: DartGooberRuntime, playerPosition: SimVector) {
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.shootCharge = 0;
    enemy.facing = vectorTo(enemy.position, playerPosition);

    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.beginMoving(enemy, playerPosition);
    }
  }

  private beginMoving(enemy: DartGooberRuntime, playerPosition: SimVector) {
    const targetDirection = vectorTo(enemy.position, playerPosition);
    const moveDirection = normalize(
      rotateVector(targetDirection, randomRange(-MOVE_ANGLE_OFFSET, MOVE_ANGLE_OFFSET))
    );

    enemy.phase = 'moving';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = randomRange(MOVE_MIN_MS, MOVE_MAX_MS);
    enemy.moveDirection = moveDirection;
    enemy.moveSpeed = randomRange(MOVE_MIN_SPEED, MOVE_MAX_SPEED);
    enemy.facing = copyVector(moveDirection);
    enemy.shootFired = false;
    enemy.shootCharge = 0;
  }

  private beginShooting(enemy: DartGooberRuntime, playerPosition: SimVector) {
    enemy.phase = 'shooting';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = SHOOT_DURATION_MS;
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.facing = vectorTo(enemy.position, playerPosition);
    enemy.shootFired = false;
    enemy.shootCharge = 0;
  }

  private beginRecovering(enemy: DartGooberRuntime) {
    enemy.phase = 'recovering';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = RECOVERY_DURATION_MS;
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.shootCharge = 0;
  }

  private updateEncounterCleared(events: DartGooberEvent[]) {
    if (this.pendingSpawns.length > 0 || this.enemies.size > 0 || this.encounterCleared) {
      return;
    }

    this.encounterCleared = true;
    events.push({
      type: 'dart-goober-encounter-cleared'
    });
  }
}
