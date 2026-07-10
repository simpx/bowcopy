import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

/**
 * Switcheroo: an ambush imp. It seeks the densest cluster of other monsters
 * (allies passed in by the kit; sibling imps count too), camps there, and
 * swaps positions with BOWBERT — dropping the player into the pile while it
 * escapes to the player's old spot (redesigned 2026-07-10: never swaps with
 * monsters). Both ends are telegraphed during the windup; without at least
 * one monster near the imp the windup fizzles into cooldown.
 */

export type SwitcherooPhase = 'spawning' | 'skitter' | 'windup' | 'cooldown';

export interface SwitcherooEnemy {
  readonly id: number;
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: SwitcherooPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  moveAmount: number;
  walkPhase: number;
  hitFlashMs: number;
  /** 0..1 during windup; renderer uses it for the vibration ramp. */
  windupProgress: number;
  /** ms since the imp last completed a swap (for the scared after-face). */
  sinceSwapMs: number;
  waypoint: SimVector | null;
  targetImpId: number | null;
  targetingPlayer: boolean;
}

export type SwitcherooEvent =
  | { type: 'switcheroo-spawned'; id: number; position: SimVector }
  | { type: 'switcheroo-windup'; id: number; position: SimVector; targetPosition: SimVector; targetingPlayer: boolean }
  | { type: 'switcheroo-fizzle'; id: number; position: SimVector }
  | {
      type: 'switcheroo-swapped';
      id: number;
      fromPosition: SimVector;
      toPosition: SimVector;
      targetingPlayer: boolean;
    }
  | { type: 'switcheroo-hit'; id: number; arrowId: number; position: SimVector; hp: number; damage: number }
  | { type: 'switcheroo-killed'; id: number; position: SimVector }
  | { type: 'switcheroo-encounter-cleared' };

export interface SwitcherooFrame {
  readonly events: SwitcherooEvent[];
  readonly consumedArrowIds: number[];
  /** Set when a swap targeted the player this frame: where Bowbert goes. */
  readonly playerTeleport: SimVector | null;
}

export interface SwitcherooEncounterOptions {
  readonly enemyCount?: number;
  readonly waveIndex?: number;
}

const DEFAULT_ENCOUNTER_SIZE = 2;
const FIRST_SPAWN_DELAY_MS = 260;
const SPAWN_CADENCE_MS = 560;
const SPAWN_DURATION_MS = 360;
const SKITTER_MIN_MS = 2600;
const SKITTER_EXTRA_MS = 1400;
const WINDUP_MS = 650;
const COOLDOWN_MS = 1400;
const SKITTER_SPEED = 120;
const SWAP_RADIUS = 300;
/** A swap is only worth it with monsters this close to the imp. */
const AMBUSH_RADIUS = 150;
/** Cluster scoring radius when choosing where to camp. */
const CLUSTER_RADIUS = 170;
const MAX_HP = 2;
const HIT_FLASH_MS = 170;
const ENEMY_RADIUS = 22;
const ENEMY_HIT_RADIUS = 30;
const DEAD_ZONE = 0.001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

const copyVector = (vector: SimVector): SimVector => ({ x: vector.x, y: vector.y });

const distance = (a: SimVector, b: SimVector): number => Math.hypot(a.x - b.x, a.y - b.y);

const normalize = (vector: SimVector): SimVector => {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= DEAD_ZONE) {
    return { x: 1, y: 0 };
  }

  return { x: vector.x / length, y: vector.y / length };
};

const vectorTo = (from: SimVector, to: SimVector): SimVector =>
  normalize({ x: to.x - from.x, y: to.y - from.y });

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

export class SwitcherooSystem {
  private readonly enemies = new Map<number, SwitcherooEnemy>();
  private pendingSpawns: RoomSpawnPoint[] = [];
  private nextId = 1;
  private nextSpawnMs = 0;
  private encounterStarted = false;
  private encounterCleared = false;
  private forceSwapRequested = false;


  private readonly pendingAreaDamage: { position: SimVector; radius: number; damage: number }[] = [];

  /** External blast (kaboomlet etc.): applied at the start of the next update. */
  queueAreaDamage(position: SimVector, radius: number, damage: number) {
    this.pendingAreaDamage.push({ position: { x: position.x, y: position.y }, radius, damage });
  }

  startEncounter(spawnPoints: readonly RoomSpawnPoint[], options: SwitcherooEncounterOptions = {}) {
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
    arrows: readonly ArrowProjectile[],
    allies: readonly SimVector[] = []
  ): SwitcherooFrame {
    const events: SwitcherooEvent[] = [];
    const consumedArrowIds = new Set<number>();
    let playerTeleport: SimVector | null = null;

    if (!this.encounterStarted || this.encounterCleared) {
      return { events, consumedArrowIds: [], playerTeleport: null };
    }

    this.applyPendingAreaDamage(events);
    this.updateSpawnQueue(deltaMs, events);
    this.applyArrowHits(arrows, events, consumedArrowIds);

    for (const enemy of Array.from(this.enemies.values())) {
      const teleport = this.updateEnemy(enemy, deltaMs, bounds, playerPosition, events, allies);

      if (teleport) {
        playerTeleport = teleport;
      }
    }

    if (this.pendingSpawns.length === 0 && this.enemies.size === 0 && !this.encounterCleared) {
      this.encounterCleared = true;
      events.push({ type: 'switcheroo-encounter-cleared' });
    }

    return { events, consumedArrowIds: Array.from(consumedArrowIds), playerTeleport };
  }

  getActiveEnemies(): readonly SwitcherooEnemy[] {
    return Array.from(this.enemies.values());
  }

  hasEncounterStarted(): boolean {
    return this.encounterStarted;
  }

  isEncounterCleared(): boolean {
    return this.encounterCleared;
  }

  /** Debug hook: skip waiting — imps in skitter/cooldown wind up now. */
  debugForceSwap() {
    this.forceSwapRequested = true;
  }

  clear() {
    this.enemies.clear();
    this.pendingSpawns = [];
    this.nextId = 1;
    this.nextSpawnMs = 0;
    this.encounterStarted = false;
    this.encounterCleared = false;
  }

  private updateSpawnQueue(deltaMs: number, events: SwitcherooEvent[]) {
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

    const enemy: SwitcherooEnemy = {
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
      windupProgress: 0,
      sinceSwapMs: 60_000,
      waypoint: null,
      targetImpId: null,
      targetingPlayer: false
    };

    this.enemies.set(enemy.id, enemy);
    this.nextSpawnMs = SPAWN_CADENCE_MS;
    events.push({ type: 'switcheroo-spawned', id: enemy.id, position: copyVector(enemy.position) });
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: SwitcherooEvent[],
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
        enemy.hp -= arrow.damage;
        enemy.hitFlashMs = HIT_FLASH_MS;

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({ type: 'switcheroo-killed', id: enemy.id, position: copyVector(enemy.position) });
          break;
        }

        events.push({
          type: 'switcheroo-hit',
          id: enemy.id,
          arrowId: arrow.id,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: arrow.damage
        });
      }
    }
  }

  private enterPhase(enemy: SwitcherooEnemy, phase: SwitcherooPhase) {
    enemy.phase = phase;
    enemy.phaseElapsedMs = 0;
    enemy.windupProgress = 0;
    enemy.phaseDurationMs =
      phase === 'spawning'
        ? SPAWN_DURATION_MS
        : phase === 'skitter'
          ? SKITTER_MIN_MS + Math.random() * SKITTER_EXTRA_MS
          : phase === 'windup'
            ? WINDUP_MS
            : COOLDOWN_MS;

    if (phase !== 'windup') {
      enemy.targetImpId = null;
      enemy.targetingPlayer = false;
    }
  }

  /** Monsters near this imp (allies passed in + sibling imps). */
  private monstersNear(enemy: SwitcherooEnemy, allies: readonly SimVector[], radius: number): number {
    let count = 0;

    for (const ally of allies) {
      if (distance(enemy.position, ally) <= radius) {
        count += 1;
      }
    }

    for (const other of this.enemies.values()) {
      if (other.id !== enemy.id && distance(enemy.position, other.position) <= radius) {
        count += 1;
      }
    }

    return count;
  }

  /** Swap only with the player, and only when the trap is baited: the imp
   *  wants at least one monster around itself to drop Bowbert into. */
  private pickTarget(
    enemy: SwitcherooEnemy,
    playerPosition: SimVector,
    allies: readonly SimVector[]
  ): boolean {
    const playerInRange = distance(enemy.position, playerPosition) <= SWAP_RADIUS;

    if (playerInRange && this.monstersNear(enemy, allies, AMBUSH_RADIUS) > 0) {
      enemy.targetingPlayer = true;
      enemy.targetImpId = null;
      return true;
    }

    return false;
  }

  private updateEnemy(
    enemy: SwitcherooEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: SwitcherooEvent[],
    allies: readonly SimVector[]
  ): SimVector | null {
    enemy.phaseElapsedMs += deltaMs;
    enemy.hitFlashMs = Math.max(0, enemy.hitFlashMs - deltaMs);
    enemy.sinceSwapMs += deltaMs;
    enemy.facing = vectorTo(enemy.position, playerPosition);
    enemy.walkPhase += deltaMs * 0.012;

    if (enemy.phase === 'spawning') {
      enemy.spawnProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      enemy.moveAmount = 0;

      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.enterPhase(enemy, 'skitter');
      }

      return null;
    }

    if (enemy.phase === 'skitter' || enemy.phase === 'cooldown') {
      this.moveSkitter(enemy, deltaMs, bounds, allies);

      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs || this.forceSwapRequested) {
        const wasForced = this.forceSwapRequested;

        this.forceSwapRequested = false;

        if (enemy.phase === 'cooldown' && !wasForced) {
          this.enterPhase(enemy, 'skitter');
        } else if (this.pickTarget(enemy, playerPosition, allies)) {
          this.enterPhase(enemy, 'windup');

          const targetPosition = enemy.targetingPlayer
            ? playerPosition
            : (this.enemies.get(enemy.targetImpId ?? -1)?.position ?? enemy.position);

          events.push({
            type: 'switcheroo-windup',
            id: enemy.id,
            position: copyVector(enemy.position),
            targetPosition: copyVector(targetPosition),
            targetingPlayer: enemy.targetingPlayer
          });
        } else {
          events.push({ type: 'switcheroo-fizzle', id: enemy.id, position: copyVector(enemy.position) });
          this.enterPhase(enemy, 'cooldown');
        }
      }

      return null;
    }

    // windup
    enemy.moveAmount = 0;
    enemy.windupProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);

    if (enemy.phaseElapsedMs < enemy.phaseDurationMs) {
      return null;
    }

    // Execute the swap against current positions.
    const from = copyVector(enemy.position);

    if (enemy.targetingPlayer) {
      enemy.position = clampPositionToBounds(copyVector(playerPosition), bounds);
      enemy.sinceSwapMs = 0;
      events.push({
        type: 'switcheroo-swapped',
        id: enemy.id,
        fromPosition: from,
        toPosition: copyVector(enemy.position),
        targetingPlayer: true
      });
      this.enterPhase(enemy, 'cooldown');

      return from;
    }

    // Unreachable since targets are always the player now, but keep the
    // fizzle as a safe fallback.
    events.push({ type: 'switcheroo-fizzle', id: enemy.id, position: copyVector(enemy.position) });
    this.enterPhase(enemy, 'cooldown');

    return null;
  }

  private moveSkitter(
    enemy: SwitcherooEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    allies: readonly SimVector[]
  ) {
    if (!enemy.waypoint || distance(enemy.position, enemy.waypoint) < 12) {
      // Camp the thickest crowd: pick the monster with the most company.
      const crowd = [
        ...allies,
        ...Array.from(this.enemies.values())
          .filter((other) => other.id !== enemy.id)
          .map((other) => other.position)
      ];
      let best: SimVector | null = null;
      let bestScore = -1;

      for (const candidate of crowd) {
        let score = 0;

        for (const other of crowd) {
          if (other !== candidate && distance(candidate, other) <= CLUSTER_RADIUS) {
            score += 1;
          }
        }

        score += Math.random() * 0.5; // tie-break wobble

        if (score > bestScore) {
          bestScore = score;
          best = candidate;
        }
      }

      enemy.waypoint = clampPositionToBounds(
        best
          ? {
              x: best.x + (Math.random() - 0.5) * 90,
              y: best.y + (Math.random() - 0.5) * 70
            }
          : {
              x: enemy.position.x + (Math.random() - 0.5) * 220,
              y: enemy.position.y + (Math.random() - 0.5) * 180
            },
        bounds
      );
    }

    const direction = vectorTo(enemy.position, enemy.waypoint);

    enemy.position.x += direction.x * SKITTER_SPEED * (deltaMs / 1000);
    enemy.position.y += direction.y * SKITTER_SPEED * (deltaMs / 1000);
    enemy.position = clampPositionToBounds(enemy.position, bounds);
    enemy.moveAmount = 1;
  }

  private applyPendingAreaDamage(events: SwitcherooEvent[]) {
    if (this.pendingAreaDamage.length === 0) {
      return;
    }

    const blasts = this.pendingAreaDamage.splice(0);

    for (const enemy of Array.from(this.enemies.values())) {
      for (const blast of blasts) {
        const distance = Math.hypot(enemy.position.x - blast.position.x, enemy.position.y - blast.position.y);

        if (distance > blast.radius) {
          continue;
        }

        enemy.hp -= blast.damage;
        enemy.hitFlashMs = HIT_FLASH_MS;

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({ type: 'switcheroo-killed', id: enemy.id, position: copyVector(enemy.position) });
          break;
        }

        events.push({
          type: 'switcheroo-hit',
          id: enemy.id,
          arrowId: -1,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: blast.damage
        });
      }
    }
  }

}
