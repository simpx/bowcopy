import type { SimVector } from '../player';
import type { ArrowProjectile, ShroomSporeBurstRequest } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

export type ShroomVariant = 'red' | 'purple';
export type RedShroomPhase = 'spawning' | 'moving' | 'charging' | 'recovering';

export interface RedShroomEnemy {
  readonly id: number;
  readonly spawnId: string;
  readonly variant: ShroomVariant;
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: RedShroomPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  sporeCharge: number;
  releasePulse: number;
  dizzyMs: number;
  idlePhase: number;
  moveAmount: number;
  walkPhase: number;
  hitFlashMs: number;
  radius: number;
}

interface RedShroomRuntime extends RedShroomEnemy {
  moveDirection: SimVector;
  moveSpeed: number;
  burstFired: boolean;
}

export type RedShroomEvent =
  | {
      type: 'red-shroom-spawned';
      id: number;
      variant: ShroomVariant;
      position: SimVector;
    }
  | {
      type: 'red-shroom-hit';
      id: number;
      variant: ShroomVariant;
      arrowId: number;
      position: SimVector;
      hp: number;
      damage: number;
    }
  | {
      type: 'red-shroom-killed';
      id: number;
      variant: ShroomVariant;
      position: SimVector;
    }
  | ({
      type: 'red-shroom-spore-burst';
      enemyId: number;
    } & ShroomSporeBurstRequest)
  | {
      type: 'red-shroom-encounter-cleared';
    };

export interface RedShroomFrame {
  readonly events: RedShroomEvent[];
  readonly consumedArrowIds: number[];
}

export interface RedShroomEncounterOptions {
  readonly enemyCount?: number;
  readonly waveIndex?: number;
  readonly variant?: ShroomVariant;
}

const DEFAULT_ENCOUNTER_SIZE = 4;
const FIRST_SPAWN_DELAY_MS = 220;
const SPAWN_CADENCE_MS = 640;
const SPAWN_DURATION_MS = 430;
const MOVE_MIN_MS = 620;
const MOVE_MAX_MS = 1040;
const MOVE_MIN_SPEED = 34;
const MOVE_MAX_SPEED = 66;
const MOVE_ANGLE_OFFSET = 0.72;
const CHARGE_FIRE_AT_MS = 760;
const CHARGE_DURATION_MS = 980;
const RECOVERY_DURATION_MS = 680;
const MAX_HP = 4;
const HIT_FLASH_MS = 190;
const RELEASE_PULSE_MS = 560;
const SPORE_DIZZY_MS = 1200;
const ENEMY_HIT_RADIUS = 40;
const SPORE_DAMAGE = 0.5;
const SPORE_RADIUS = 15;
const SPORE_DISTANCE = 184;
const SPORE_TRAVEL_MS = 560;
const SPORE_LINGER_MS = 860;
const SPORE_ORIGIN_Y = -31;
const SPORE_COLOR = 0xff4d54;
const DEAD_ZONE = 0.001;

const ENEMY_RADIUS = 32;

const SHROOM_RULES: Record<
  ShroomVariant,
  {
    readonly maxHp: number;
    readonly sporeDistance: number;
    readonly sporeTravelMs: number;
    readonly sporeLingerMs: number;
    readonly sporeOriginY: number;
    readonly sporeColor: number;
  }
> = {
  red: {
    maxHp: MAX_HP,
    sporeDistance: SPORE_DISTANCE,
    sporeTravelMs: SPORE_TRAVEL_MS,
    sporeLingerMs: SPORE_LINGER_MS,
    sporeOriginY: SPORE_ORIGIN_Y,
    sporeColor: SPORE_COLOR
  },
  purple: {
    maxHp: MAX_HP,
    sporeDistance: 178,
    sporeTravelMs: 610,
    sporeLingerMs: 820,
    sporeOriginY: -33,
    sporeColor: 0x8d75ff
  }
};

const copyVector = (vector: SimVector): SimVector => ({
  x: vector.x,
  y: vector.y
});

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const decay = (value: number, deltaMs: number): number => Math.max(0, value - deltaMs);

const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);

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

const pickEncounterSpawns = (
  spawnPoints: readonly RoomSpawnPoint[],
  enemyCount: number
): RoomSpawnPoint[] => {
  const targetCount = Math.max(1, Math.floor(enemyCount));

  if (spawnPoints.length <= targetCount) {
    return Array.from(spawnPoints);
  }

  const middleFirst = [...spawnPoints].sort((a, b) => {
    const aScore = Math.abs(a.x - 640) + Math.abs(a.y - 360);
    const bScore = Math.abs(b.x - 640) + Math.abs(b.y - 360);

    return aScore - bScore;
  });

  return middleFirst.slice(0, targetCount);
};

export class RedShroomSystem {
  private readonly enemies = new Map<number, RedShroomRuntime>();
  private pendingSpawns: RoomSpawnPoint[] = [];
  private nextId = 1;
  private nextSpawnMs = 0;
  private encounterStarted = false;
  private encounterCleared = false;
  private encounterVariant: ShroomVariant = 'red';

  startEncounter(
    spawnPoints: readonly RoomSpawnPoint[],
    options: RedShroomEncounterOptions = {}
  ) {
    this.clear();
    this.encounterStarted = true;
    this.encounterVariant = options.variant ?? 'red';
    this.pendingSpawns = pickEncounterSpawns(spawnPoints, options.enemyCount ?? DEFAULT_ENCOUNTER_SIZE);
    this.nextSpawnMs = Math.max(130, FIRST_SPAWN_DELAY_MS - (options.waveIndex ?? 1) * 16);
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): RedShroomFrame {
    const events: RedShroomEvent[] = [];
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

  getActiveEnemies(): readonly RedShroomEnemy[] {
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

  private updateSpawnQueue(deltaMs: number, events: RedShroomEvent[]) {
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
      type: 'red-shroom-spawned',
      id: enemy.id,
      variant: enemy.variant,
      position: copyVector(enemy.position)
    });
  }

  private createEnemy(spawn: RoomSpawnPoint): RedShroomRuntime {
    const rules = SHROOM_RULES[this.encounterVariant];

    return {
      id: this.nextId++,
      spawnId: spawn.id,
      variant: this.encounterVariant,
      position: { x: spawn.x, y: spawn.y },
      velocity: zeroVector(),
      facing: { x: 0, y: 1 },
      hp: rules.maxHp,
      maxHp: rules.maxHp,
      phase: 'spawning',
      phaseElapsedMs: 0,
      phaseDurationMs: SPAWN_DURATION_MS,
      spawnProgress: 0,
      sporeCharge: 0,
      releasePulse: 0,
      dizzyMs: 0,
      idlePhase: Math.random() * Math.PI * 2,
      moveAmount: 0,
      walkPhase: randomRange(0, Math.PI * 2),
      hitFlashMs: 0,
      radius: ENEMY_HIT_RADIUS,
      moveDirection: zeroVector(),
      moveSpeed: 0,
      burstFired: false
    };
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: RedShroomEvent[],
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
          type: 'red-shroom-hit',
          id: enemy.id,
          variant: enemy.variant,
          arrowId: arrow.id,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: arrow.damage
        });

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({
            type: 'red-shroom-killed',
            id: enemy.id,
            variant: enemy.variant,
            position: copyVector(enemy.position)
          });
          break;
        }
      }
    }
  }

  private updateEnemy(
    enemy: RedShroomRuntime,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: RedShroomEvent[]
  ) {
    enemy.phaseElapsedMs += deltaMs;
    enemy.hitFlashMs = decay(enemy.hitFlashMs, deltaMs);
    enemy.releasePulse = clamp01(decay(enemy.releasePulse * RELEASE_PULSE_MS, deltaMs) / RELEASE_PULSE_MS);
    enemy.dizzyMs = decay(enemy.dizzyMs, deltaMs);
    enemy.idlePhase += deltaMs * 0.004;
    enemy.facing = vectorTo(enemy.position, playerPosition);

    if (enemy.phase === 'spawning') {
      enemy.velocity = zeroVector();
      enemy.moveAmount = 0;
      enemy.spawnProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      enemy.sporeCharge = 0;

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

    if (enemy.phase === 'charging') {
      this.updateCharging(enemy, events);
      return;
    }

    this.updateRecovering(enemy, playerPosition);
  }

  private updateMoving(
    enemy: RedShroomRuntime,
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
    enemy.facing = vectorTo(enemy.position, playerPosition);
    enemy.moveAmount = clamp01(enemy.moveSpeed / MOVE_MAX_SPEED);
    enemy.walkPhase += deltaMs * 0.013 * enemy.moveAmount;
    enemy.sporeCharge = 0;

    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.beginCharging(enemy);
    }
  }

  private updateCharging(enemy: RedShroomRuntime, events: RedShroomEvent[]) {
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.sporeCharge = clamp01(enemy.phaseElapsedMs / CHARGE_FIRE_AT_MS);

    if (!enemy.burstFired && enemy.phaseElapsedMs >= CHARGE_FIRE_AT_MS) {
      const rules = SHROOM_RULES[enemy.variant];

      enemy.burstFired = true;
      enemy.releasePulse = 1;
      enemy.dizzyMs = SPORE_DIZZY_MS;
      events.push({
        type: 'red-shroom-spore-burst',
        enemyId: enemy.id,
        variant: enemy.variant,
        origin: {
          x: enemy.position.x,
          y: enemy.position.y + rules.sporeOriginY
        },
        distance: rules.sporeDistance,
        travelMs: rules.sporeTravelMs,
        lingerMs: rules.sporeLingerMs,
        damage: SPORE_DAMAGE,
        radius: SPORE_RADIUS,
        color: rules.sporeColor
      });
    }

    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.beginRecovering(enemy);
    }
  }

  private updateRecovering(enemy: RedShroomRuntime, playerPosition: SimVector) {
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.sporeCharge = 0;

    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.beginMoving(enemy, playerPosition);
    }
  }

  private beginMoving(enemy: RedShroomRuntime, playerPosition: SimVector) {
    const targetDirection = vectorTo(enemy.position, playerPosition);
    const distanceToPlayer = Math.hypot(playerPosition.x - enemy.position.x, playerPosition.y - enemy.position.y);
    const baseDirection = distanceToPlayer < 170
      ? { x: -targetDirection.x, y: -targetDirection.y }
      : targetDirection;
    const moveDirection = normalize(
      rotateVector(baseDirection, randomRange(-MOVE_ANGLE_OFFSET, MOVE_ANGLE_OFFSET))
    );

    enemy.phase = 'moving';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = randomRange(MOVE_MIN_MS, MOVE_MAX_MS);
    enemy.moveDirection = moveDirection;
    enemy.moveSpeed = randomRange(MOVE_MIN_SPEED, MOVE_MAX_SPEED);
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.sporeCharge = 0;
    enemy.burstFired = false;
  }

  private beginCharging(enemy: RedShroomRuntime) {
    enemy.phase = 'charging';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = CHARGE_DURATION_MS;
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.sporeCharge = 0;
    enemy.burstFired = false;
  }

  private beginRecovering(enemy: RedShroomRuntime) {
    enemy.phase = 'recovering';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = RECOVERY_DURATION_MS;
    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.sporeCharge = 0;
  }

  private updateEncounterCleared(events: RedShroomEvent[]) {
    if (this.pendingSpawns.length > 0 || this.enemies.size > 0 || this.encounterCleared) {
      return;
    }

    this.encounterCleared = true;
    events.push({
      type: 'red-shroom-encounter-cleared'
    });
  }
}
