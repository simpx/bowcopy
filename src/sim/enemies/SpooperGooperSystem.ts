import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

export type SpooperGooperPhase = 'hidden' | 'appearing' | 'hovering' | 'attacking' | 'disappearing' | 'repositioning';

export interface SpooperGooperEnemy {
  readonly id: number;
  readonly spawnId: string;
  position: SimVector;
  targetPosition: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: SpooperGooperPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  visibility: number;
  attackCharge: number;
  hoverPhase: number;
  hitFlashMs: number;
  radius: number;
  vulnerable: boolean;
}

export type SpooperGooperEvent =
  | { type: 'spooper-gooper-spawned'; id: number; position: SimVector }
  | { type: 'spooper-gooper-appeared'; id: number; position: SimVector }
  | { type: 'spooper-gooper-attacked'; id: number; position: SimVector; direction: SimVector; damage: number }
  | { type: 'spooper-gooper-hit'; id: number; arrowId: number; position: SimVector; hp: number; damage: number }
  | { type: 'spooper-gooper-killed'; id: number; position: SimVector }
  | { type: 'spooper-gooper-vanished'; id: number; position: SimVector }
  | { type: 'spooper-gooper-encounter-cleared' };

export interface SpooperGooperFrame {
  readonly events: SpooperGooperEvent[];
  readonly consumedArrowIds: number[];
}

export interface SpooperGooperEncounterOptions {
  readonly enemyCount?: number;
  readonly waveIndex?: number;
}

const DEFAULT_ENCOUNTER_SIZE = 3;
const FIRST_SPAWN_DELAY_MS = 260;
const SPAWN_CADENCE_MS = 720;
const HIDDEN_MS = 260;
const APPEAR_MS = 360;
const HOVER_MS = 1100;
const ATTACK_MS = 460;
const DISAPPEAR_MS = 330;
const REPOSITION_MS = 520;
const ATTACK_DAMAGE = 0.5;
const MAX_HP = 3;
const HIT_FLASH_MS = 180;
const ENEMY_RADIUS = 30;
const ENEMY_HIT_RADIUS = 36;
const DEAD_ZONE = 0.001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const decay = (value: number, deltaMs: number): number => Math.max(0, value - deltaMs);

const copyVector = (vector: SimVector): SimVector => ({ x: vector.x, y: vector.y });

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

export class SpooperGooperSystem {
  private readonly enemies = new Map<number, SpooperGooperEnemy>();
  private pendingSpawns: RoomSpawnPoint[] = [];
  private nextId = 1;
  private nextSpawnMs = 0;
  private encounterStarted = false;
  private encounterCleared = false;

  startEncounter(
    spawnPoints: readonly RoomSpawnPoint[],
    options: SpooperGooperEncounterOptions = {}
  ) {
    this.clear();
    this.encounterStarted = true;
    this.pendingSpawns = pickEncounterSpawns(spawnPoints, options.enemyCount ?? DEFAULT_ENCOUNTER_SIZE);
    this.nextSpawnMs = Math.max(150, FIRST_SPAWN_DELAY_MS - (options.waveIndex ?? 1) * 12);
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): SpooperGooperFrame {
    const events: SpooperGooperEvent[] = [];
    const consumedArrowIds = new Set<number>();

    if (!this.encounterStarted || this.encounterCleared) {
      return { events, consumedArrowIds: [] };
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

  getActiveEnemies(): readonly SpooperGooperEnemy[] {
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

  private updateSpawnQueue(deltaMs: number, events: SpooperGooperEvent[]) {
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
    events.push({ type: 'spooper-gooper-spawned', id: enemy.id, position: copyVector(enemy.position) });
  }

  private createEnemy(spawn: RoomSpawnPoint): SpooperGooperEnemy {
    const position = { x: spawn.x, y: spawn.y };

    return {
      id: this.nextId++,
      spawnId: spawn.id,
      position,
      targetPosition: copyVector(position),
      facing: { x: 0, y: 1 },
      hp: MAX_HP,
      maxHp: MAX_HP,
      phase: 'hidden',
      phaseElapsedMs: 0,
      phaseDurationMs: HIDDEN_MS,
      visibility: 0,
      attackCharge: 0,
      hoverPhase: Math.random() * Math.PI * 2,
      hitFlashMs: 0,
      radius: ENEMY_HIT_RADIUS,
      vulnerable: false
    };
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: SpooperGooperEvent[],
    consumedArrowIds: Set<number>
  ) {
    const hitRadiusSquared = ENEMY_HIT_RADIUS * ENEMY_HIT_RADIUS;

    for (const enemy of Array.from(this.enemies.values())) {
      if (!enemy.vulnerable) {
        continue;
      }

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
          type: 'spooper-gooper-hit',
          id: enemy.id,
          arrowId: arrow.id,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: arrow.damage
        });

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({ type: 'spooper-gooper-killed', id: enemy.id, position: copyVector(enemy.position) });
          break;
        }
      }
    }
  }

  private updateEnemy(
    enemy: SpooperGooperEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: SpooperGooperEvent[]
  ) {
    enemy.phaseElapsedMs += deltaMs;
    enemy.hitFlashMs = decay(enemy.hitFlashMs, deltaMs);
    enemy.hoverPhase += deltaMs * 0.004;
    enemy.facing = vectorTo(enemy.position, playerPosition);

    if (enemy.phase === 'hidden') {
      enemy.visibility = 0;
      enemy.vulnerable = false;
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginAppearing(enemy, events);
      }
      return;
    }

    if (enemy.phase === 'appearing') {
      enemy.visibility = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      enemy.vulnerable = enemy.visibility > 0.35;
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginHovering(enemy);
      }
      return;
    }

    if (enemy.phase === 'hovering') {
      enemy.visibility = 1;
      enemy.vulnerable = true;
      enemy.attackCharge = 0;
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginAttacking(enemy);
      }
      return;
    }

    if (enemy.phase === 'attacking') {
      enemy.visibility = 1;
      enemy.vulnerable = true;
      enemy.attackCharge = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        events.push({
          type: 'spooper-gooper-attacked',
          id: enemy.id,
          position: copyVector(enemy.position),
          direction: vectorTo(enemy.position, playerPosition),
          damage: ATTACK_DAMAGE
        });
        this.beginDisappearing(enemy, events);
      }
      return;
    }

    if (enemy.phase === 'disappearing') {
      enemy.visibility = 1 - clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      enemy.vulnerable = enemy.visibility > 0.35;
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginRepositioning(enemy, bounds);
      }
      return;
    }

    enemy.visibility = 0;
    enemy.vulnerable = false;
    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      enemy.position = copyVector(enemy.targetPosition);
      this.beginAppearing(enemy, events);
    }
  }

  private beginAppearing(enemy: SpooperGooperEnemy, events: SpooperGooperEvent[]) {
    enemy.phase = 'appearing';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = APPEAR_MS;
    enemy.visibility = 0;
    enemy.attackCharge = 0;
    events.push({ type: 'spooper-gooper-appeared', id: enemy.id, position: copyVector(enemy.position) });
  }

  private beginHovering(enemy: SpooperGooperEnemy) {
    enemy.phase = 'hovering';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = HOVER_MS;
    enemy.visibility = 1;
    enemy.vulnerable = true;
  }

  private beginAttacking(enemy: SpooperGooperEnemy) {
    enemy.phase = 'attacking';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = ATTACK_MS;
    enemy.attackCharge = 0;
  }

  private beginDisappearing(enemy: SpooperGooperEnemy, events: SpooperGooperEvent[]) {
    enemy.phase = 'disappearing';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = DISAPPEAR_MS;
    events.push({ type: 'spooper-gooper-vanished', id: enemy.id, position: copyVector(enemy.position) });
  }

  private beginRepositioning(enemy: SpooperGooperEnemy, bounds: RoomBounds) {
    enemy.phase = 'repositioning';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = REPOSITION_MS;
    enemy.targetPosition = clampPositionToBounds(
      {
        x: enemy.position.x + randomRange(-170, 170),
        y: enemy.position.y + randomRange(-120, 120)
      },
      bounds
    );
  }

  private updateEncounterCleared(events: SpooperGooperEvent[]) {
    if (this.pendingSpawns.length > 0 || this.enemies.size > 0 || this.encounterCleared) {
      return;
    }

    this.encounterCleared = true;
    events.push({ type: 'spooper-gooper-encounter-cleared' });
  }
}
