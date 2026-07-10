import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

export type KaboomletPhase = 'spawning' | 'chasing' | 'armed' | 'exploding';

export interface KaboomletEnemy {
  readonly id: number;
  readonly spawnId: string;
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: KaboomletPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  armedProgress: number;
  explosionProgress: number;
  moveAmount: number;
  wobblePhase: number;
  hitFlashMs: number;
  radius: number;
}

export type KaboomletEvent =
  | { type: 'kaboomlet-spawned'; id: number; position: SimVector }
  | { type: 'kaboomlet-armed'; id: number; position: SimVector }
  | { type: 'kaboomlet-exploded'; id: number; position: SimVector; radius: number; damage: number }
  | { type: 'kaboomlet-hit'; id: number; arrowId: number; position: SimVector; hp: number; damage: number }
  | { type: 'kaboomlet-killed'; id: number; position: SimVector }
  | { type: 'kaboomlet-encounter-cleared' };

export interface KaboomletFrame {
  readonly events: KaboomletEvent[];
  readonly consumedArrowIds: number[];
}

export interface KaboomletEncounterOptions {
  readonly enemyCount?: number;
  readonly waveIndex?: number;
}

const DEFAULT_ENCOUNTER_SIZE = 3;
const FIRST_SPAWN_DELAY_MS = 260;
const SPAWN_CADENCE_MS = 680;
const SPAWN_DURATION_MS = 360;
const CHASE_SPEED = 82;
const ARM_DISTANCE = 78;
const ARMED_COUNTDOWN_MS = 760;
const EXPLOSION_DURATION_MS = 260;
const EXPLOSION_RADIUS = 150;
const EXPLOSION_DAMAGE = 1;
const MAX_HP = 2;
const HIT_FLASH_MS = 170;
const ENEMY_RADIUS = 30;
const ENEMY_HIT_RADIUS = 35;
const DEAD_ZONE = 0.001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const decay = (value: number, deltaMs: number): number => Math.max(0, value - deltaMs);

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

const copyVector = (vector: SimVector): SimVector => ({ x: vector.x, y: vector.y });

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

const pickEncounterSpawns = (
  spawnPoints: readonly RoomSpawnPoint[],
  enemyCount: number
): RoomSpawnPoint[] => Array.from(spawnPoints).slice(0, Math.max(1, Math.floor(enemyCount)));

export class KaboomletSystem {
  private readonly enemies = new Map<number, KaboomletEnemy>();
  private pendingSpawns: RoomSpawnPoint[] = [];
  private nextId = 1;
  private nextSpawnMs = 0;
  private encounterStarted = false;
  private encounterCleared = false;


  private readonly pendingAreaDamage: { position: SimVector; radius: number; damage: number }[] = [];

  /** External blast (kaboomlet etc.): applied at the start of the next update. */
  queueAreaDamage(position: SimVector, radius: number, damage: number) {
    this.pendingAreaDamage.push({ position: { x: position.x, y: position.y }, radius, damage });
  }

  startEncounter(
    spawnPoints: readonly RoomSpawnPoint[],
    options: KaboomletEncounterOptions = {}
  ) {
    this.clear();
    this.encounterStarted = true;
    this.pendingSpawns = pickEncounterSpawns(spawnPoints, options.enemyCount ?? DEFAULT_ENCOUNTER_SIZE);
    this.nextSpawnMs = Math.max(130, FIRST_SPAWN_DELAY_MS - (options.waveIndex ?? 1) * 14);
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): KaboomletFrame {
    const events: KaboomletEvent[] = [];
    const consumedArrowIds = new Set<number>();

    if (!this.encounterStarted || this.encounterCleared) {
      return { events, consumedArrowIds: [] };
    }

    this.applyPendingAreaDamage(events);
    this.updateSpawnQueue(deltaMs, events);
    this.applyArrowHits(arrows, events, consumedArrowIds);

    for (const enemy of Array.from(this.enemies.values())) {
      this.updateEnemy(enemy, deltaMs, bounds, playerPosition, events);
    }

    this.updateEncounterCleared(events);

    return {
      events,
      consumedArrowIds: Array.from(consumedArrowIds)
    };
  }

  getActiveEnemies(): readonly KaboomletEnemy[] {
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

  private updateSpawnQueue(deltaMs: number, events: KaboomletEvent[]) {
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
    events.push({ type: 'kaboomlet-spawned', id: enemy.id, position: copyVector(enemy.position) });
  }

  private createEnemy(spawn: RoomSpawnPoint): KaboomletEnemy {
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
      armedProgress: 0,
      explosionProgress: 0,
      moveAmount: 0,
      wobblePhase: Math.random() * Math.PI * 2,
      hitFlashMs: 0,
      radius: ENEMY_HIT_RADIUS
    };
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: KaboomletEvent[],
    consumedArrowIds: Set<number>
  ) {
    const hitRadiusSquared = ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS;

    for (const enemy of Array.from(this.enemies.values())) {
      for (const arrow of arrows) {
        if (consumedArrowIds.has(arrow.id)) {
          continue;
        }

        if (getSegmentDistanceSquared(enemy.position, arrow.previousPosition, arrow.position) > hitRadiusSquared) {
          continue;
        }

        consumedArrowIds.add(arrow.id);
        enemy.hp -= arrow.damage;
        enemy.hitFlashMs = HIT_FLASH_MS;
        events.push({
          type: 'kaboomlet-hit',
          id: enemy.id,
          arrowId: arrow.id,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: arrow.damage
        });

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          // Shot dead = still a bomb: it goes off where it falls.
          events.push({ type: 'kaboomlet-killed', id: enemy.id, position: copyVector(enemy.position) });
          events.push({
            type: 'kaboomlet-exploded',
            id: enemy.id,
            position: copyVector(enemy.position),
            radius: EXPLOSION_RADIUS,
            damage: EXPLOSION_DAMAGE
          });
          break;
        }
      }
    }
  }

  private updateEnemy(
    enemy: KaboomletEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: KaboomletEvent[]
  ) {
    enemy.phaseElapsedMs += deltaMs;
    enemy.hitFlashMs = decay(enemy.hitFlashMs, deltaMs);
    enemy.wobblePhase += deltaMs * 0.009;
    enemy.facing = vectorTo(enemy.position, playerPosition);

    if (enemy.phase === 'spawning') {
      enemy.spawnProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginChasing(enemy);
      }
      return;
    }

    enemy.spawnProgress = 1;

    if (enemy.phase === 'chasing') {
      const deltaSeconds = deltaMs / 1000;
      const direction = vectorTo(enemy.position, playerPosition);
      const distance = Math.hypot(playerPosition.x - enemy.position.x, playerPosition.y - enemy.position.y);

      enemy.velocity = {
        x: direction.x * CHASE_SPEED,
        y: direction.y * CHASE_SPEED
      };
      enemy.position = clampPositionToBounds(
        {
          x: enemy.position.x + enemy.velocity.x * deltaSeconds,
          y: enemy.position.y + enemy.velocity.y * deltaSeconds
        },
        bounds
      );
      enemy.moveAmount = 1;
      enemy.armedProgress = 0;

      if (distance <= ARM_DISTANCE) {
        this.beginArmed(enemy, events);
      }
      return;
    }

    if (enemy.phase === 'armed') {
      enemy.velocity = zeroVector();
      enemy.moveAmount = 0;
      enemy.armedProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);

      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginExploding(enemy, events);
      }
      return;
    }

    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.explosionProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.enemies.delete(enemy.id);
    }
  }

  private beginChasing(enemy: KaboomletEnemy) {
    enemy.phase = 'chasing';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = Number.POSITIVE_INFINITY;
    enemy.moveAmount = 0;
  }

  private beginArmed(enemy: KaboomletEnemy, events: KaboomletEvent[]) {
    enemy.phase = 'armed';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = ARMED_COUNTDOWN_MS;
    enemy.velocity = zeroVector();
    enemy.armedProgress = 0;
    events.push({ type: 'kaboomlet-armed', id: enemy.id, position: copyVector(enemy.position) });
  }

  private beginExploding(enemy: KaboomletEnemy, events: KaboomletEvent[]) {
    enemy.phase = 'exploding';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = EXPLOSION_DURATION_MS;
    enemy.velocity = zeroVector();
    enemy.explosionProgress = 0;
    events.push({
      type: 'kaboomlet-exploded',
      id: enemy.id,
      position: copyVector(enemy.position),
      radius: EXPLOSION_RADIUS,
      damage: EXPLOSION_DAMAGE
    });
  }

  private updateEncounterCleared(events: KaboomletEvent[]) {
    if (this.pendingSpawns.length > 0 || this.enemies.size > 0 || this.encounterCleared) {
      return;
    }

    this.encounterCleared = true;
    events.push({ type: 'kaboomlet-encounter-cleared' });
  }

  private applyPendingAreaDamage(events: KaboomletEvent[]) {
    if (this.pendingAreaDamage.length === 0) {
      return;
    }

    const blasts = this.pendingAreaDamage.splice(0);

    for (const enemy of Array.from(this.enemies.values())) {
      for (const blast of blasts) {
        const distance = Math.hypot(enemy.position.x - blast.position.x, enemy.position.y - blast.position.y);

        if (distance > blast.radius || distance < 1) {
          continue;
        }

        enemy.hp -= blast.damage;
        enemy.hitFlashMs = HIT_FLASH_MS;

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({ type: 'kaboomlet-killed', id: enemy.id, position: copyVector(enemy.position) });
          events.push({
            type: 'kaboomlet-exploded',
            id: enemy.id,
            position: copyVector(enemy.position),
            radius: EXPLOSION_RADIUS,
            damage: EXPLOSION_DAMAGE
          });
          break;
        }
      }
    }
  }

}
