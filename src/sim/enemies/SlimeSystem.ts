import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

export type SlimePhase = 'spawning' | 'squashing' | 'jumping' | 'landing' | 'recovering';
export type SlimeRole = 'child' | 'parent';

export interface SlimeEnemy {
  readonly id: number;
  readonly spawnId: string;
  readonly role: SlimeRole;
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: SlimePhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  jumpProgress: number;
  squash: number;
  airHeight: number;
  moveAmount: number;
  walkPhase: number;
  hitFlashMs: number;
  radius: number;
}

interface SlimeRuntime extends SlimeEnemy {
  jumpStart: SimVector;
  jumpTarget: SimVector;
  playerHitCooldownMs: number;
}

export type SlimeEvent =
  | { type: 'slime-spawned'; id: number; role: SlimeRole; position: SimVector }
  | { type: 'slime-jumped'; id: number; role: SlimeRole; from: SimVector; to: SimVector }
  | { type: 'slime-landed'; id: number; role: SlimeRole; position: SimVector }
  | { type: 'slime-damaged-player'; id: number; role: SlimeRole; position: SimVector; damage: number }
  | { type: 'slime-hit'; id: number; role: SlimeRole; arrowId: number; position: SimVector; hp: number; damage: number }
  | { type: 'slime-killed'; id: number; role: SlimeRole; position: SimVector }
  | { type: 'slime-split'; id: number; position: SimVector; childCount: number }
  | { type: 'slime-encounter-cleared' };

export interface SlimeFrame {
  readonly events: SlimeEvent[];
  readonly consumedArrowIds: number[];
}

export interface SlimeEncounterOptions {
  readonly enemyCount?: number;
  readonly waveIndex?: number;
  readonly role?: SlimeRole;
}

interface PendingSlimeSpawn {
  readonly spawn: RoomSpawnPoint;
  readonly role: SlimeRole;
}

const DEFAULT_ENCOUNTER_SIZE = 4;
const FIRST_SPAWN_DELAY_MS = 220;
const SPAWN_CADENCE_MS = 520;
const SPAWN_DURATION_MS = 360;
const SQUASH_DURATION_MS = 210;
const JUMP_DURATION_MS = 720;
const LANDING_DURATION_MS = 170;
const RECOVER_DURATION_MS = 260;
const JUMP_DISTANCE = 118;
const JUMP_SIDE_ANGLE = 0.62;
const MAX_HP = 3;
const PARENT_HP = 4;
const PARENT_HIT_RADIUS = 54;
const PARENT_JUMP_DISTANCE = 92;
const PARENT_JUMP_HEIGHT = 28;
const PARENT_JUMP_DURATION_MS = 880;
const PARENT_RECOVER_DURATION_MS = 330;
const PARENT_SPLIT_CHILDREN = 4;
const PARENT_SPLIT_RADIUS = 56;
const HIT_FLASH_MS = 170;
const ENEMY_RADIUS = 28;
const ENEMY_HIT_RADIUS = 35;
const PLAYER_HIT_RADIUS = 29;
const CHILD_TOUCH_DAMAGE = 0.5;
const PARENT_TOUCH_DAMAGE = 1;
const PLAYER_HIT_COOLDOWN_MS = 720;
const DEAD_ZONE = 0.001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const decay = (value: number, deltaMs: number): number => Math.max(0, value - deltaMs);

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

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

const clampPositionToBounds = (
  position: SimVector,
  bounds: RoomBounds,
  radius: number = ENEMY_RADIUS
): SimVector => ({
  x: clamp(
    position.x,
    bounds.x + bounds.border + radius,
    bounds.x + bounds.width - bounds.border - radius
  ),
  y: clamp(
    position.y,
    bounds.y + bounds.border + radius,
    bounds.y + bounds.height - bounds.border - radius
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
): RoomSpawnPoint[] => {
  const targetCount = Math.max(1, Math.floor(enemyCount));

  return Array.from(spawnPoints).slice(0, targetCount);
};

export class SlimeSystem {
  private readonly enemies = new Map<number, SlimeRuntime>();
  private pendingSpawns: PendingSlimeSpawn[] = [];
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
    options: SlimeEncounterOptions = {}
  ) {
    this.clear();
    const role = options.role ?? 'child';

    this.encounterStarted = true;
    this.pendingSpawns = pickEncounterSpawns(spawnPoints, options.enemyCount ?? DEFAULT_ENCOUNTER_SIZE).map(
      (spawn) => ({ spawn, role })
    );
    this.nextSpawnMs = Math.max(120, FIRST_SPAWN_DELAY_MS - (options.waveIndex ?? 1) * 14);
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): SlimeFrame {
    const events: SlimeEvent[] = [];
    const consumedArrowIds = new Set<number>();

    if (!this.encounterStarted || this.encounterCleared) {
      return { events, consumedArrowIds: [] };
    }

    this.applyPendingAreaDamage(events);
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

  getActiveEnemies(): readonly SlimeEnemy[] {
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

  private updateSpawnQueue(deltaMs: number, events: SlimeEvent[]) {
    if (this.pendingSpawns.length === 0) {
      return;
    }

    this.nextSpawnMs -= deltaMs;

    if (this.nextSpawnMs > 0) {
      return;
    }

    const pendingSpawn = this.pendingSpawns.shift();

    if (!pendingSpawn) {
      return;
    }

    const enemy = this.createEnemy(pendingSpawn.spawn, pendingSpawn.role);

    this.enemies.set(enemy.id, enemy);
    this.nextSpawnMs = SPAWN_CADENCE_MS;
    events.push({ type: 'slime-spawned', id: enemy.id, role: enemy.role, position: copyVector(enemy.position) });
  }

  private createEnemy(spawn: RoomSpawnPoint, role: SlimeRole): SlimeRuntime {
    const position = { x: spawn.x, y: spawn.y };
    const maxHp = role === 'parent' ? PARENT_HP : MAX_HP;
    const radius = role === 'parent' ? PARENT_HIT_RADIUS : ENEMY_HIT_RADIUS;

    return {
      id: this.nextId++,
      spawnId: spawn.id,
      role,
      position,
      velocity: zeroVector(),
      facing: { x: 0, y: 1 },
      hp: maxHp,
      maxHp,
      phase: 'spawning',
      phaseElapsedMs: 0,
      phaseDurationMs: SPAWN_DURATION_MS,
      spawnProgress: 0,
      jumpProgress: 0,
      squash: 0,
      airHeight: 0,
      moveAmount: 0,
      walkPhase: randomRange(0, Math.PI * 2),
      hitFlashMs: 0,
      radius,
      jumpStart: copyVector(position),
      jumpTarget: copyVector(position),
      playerHitCooldownMs: 0
    };
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: SlimeEvent[],
    consumedArrowIds: Set<number>
  ) {
    for (const enemy of Array.from(this.enemies.values())) {
      const hitRadiusSquared = enemy.radius * enemy.radius;

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
          type: 'slime-hit',
          id: enemy.id,
          role: enemy.role,
          arrowId: arrow.id,
          position: copyVector(enemy.position),
          hp: enemy.hp,
          damage: arrow.damage
        });

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({ type: 'slime-killed', id: enemy.id, role: enemy.role, position: copyVector(enemy.position) });

          if (enemy.role === 'parent') {
            this.spawnSplitChildren(enemy, events);
          }
          break;
        }
      }
    }
  }

  private updateEnemy(
    enemy: SlimeRuntime,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: SlimeEvent[]
  ) {
    enemy.phaseElapsedMs += deltaMs;
    enemy.hitFlashMs = decay(enemy.hitFlashMs, deltaMs);
    enemy.playerHitCooldownMs = decay(enemy.playerHitCooldownMs, deltaMs);
    enemy.walkPhase += deltaMs * 0.008;
    enemy.facing = vectorTo(enemy.position, playerPosition);

    if (enemy.phase === 'spawning') {
      enemy.spawnProgress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
      enemy.squash = Math.sin(enemy.spawnProgress * Math.PI) * 0.08;
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginSquashing(enemy);
      }
      return;
    }

    enemy.spawnProgress = 1;

    if (enemy.phase === 'squashing') {
      enemy.velocity = zeroVector();
      enemy.moveAmount = 0;
      enemy.airHeight = 0;
      enemy.jumpProgress = 0;
      enemy.squash = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs) * (enemy.role === 'parent' ? 0.18 : 0.22);
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginJumping(enemy, bounds, playerPosition, events);
      }
      return;
    }

    if (enemy.phase === 'jumping') {
      this.updateJumping(enemy, deltaMs);
      this.tryDamagePlayer(enemy, playerPosition, events);
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginLanding(enemy, events);
        this.tryDamagePlayer(enemy, playerPosition, events);
      }
      return;
    }

    if (enemy.phase === 'landing') {
      enemy.velocity = zeroVector();
      enemy.moveAmount = 0;
      enemy.airHeight = 0;
      enemy.jumpProgress = 1;
      enemy.squash = (1 - clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs)) * (enemy.role === 'parent' ? 0.18 : 0.2);
      this.tryDamagePlayer(enemy, playerPosition, events);
      if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
        this.beginRecovering(enemy);
      }
      return;
    }

    enemy.velocity = zeroVector();
    enemy.moveAmount = 0;
    enemy.airHeight = 0;
    enemy.squash = Math.sin(enemy.walkPhase) * 0.025;
    if (enemy.phaseElapsedMs >= enemy.phaseDurationMs) {
      this.beginSquashing(enemy);
    }
  }

  private beginSquashing(enemy: SlimeRuntime) {
    enemy.phase = 'squashing';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = SQUASH_DURATION_MS;
    enemy.velocity = zeroVector();
    enemy.squash = 0;
    enemy.airHeight = 0;
  }

  private beginJumping(
    enemy: SlimeRuntime,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: SlimeEvent[]
  ) {
    const direction = normalize(rotateVector(vectorTo(enemy.position, playerPosition), randomRange(-JUMP_SIDE_ANGLE, JUMP_SIDE_ANGLE)));
    const jumpDistance = enemy.role === 'parent' ? PARENT_JUMP_DISTANCE : JUMP_DISTANCE;
    const target = clampPositionToBounds(
      {
        x: enemy.position.x + direction.x * jumpDistance,
        y: enemy.position.y + direction.y * jumpDistance
      },
      bounds,
      enemy.radius
    );

    enemy.phase = 'jumping';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = enemy.role === 'parent' ? PARENT_JUMP_DURATION_MS : JUMP_DURATION_MS;
    enemy.jumpStart = copyVector(enemy.position);
    enemy.jumpTarget = target;
    enemy.facing = direction;
    enemy.squash = -0.18;
    events.push({ type: 'slime-jumped', id: enemy.id, role: enemy.role, from: copyVector(enemy.position), to: copyVector(target) });
  }

  private updateJumping(enemy: SlimeRuntime, deltaMs: number) {
    const previous = copyVector(enemy.position);
    const progress = clamp01(enemy.phaseElapsedMs / enemy.phaseDurationMs);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - (-2 * progress + 2) ** 2 / 2;

    enemy.position = {
      x: enemy.jumpStart.x + (enemy.jumpTarget.x - enemy.jumpStart.x) * eased,
      y: enemy.jumpStart.y + (enemy.jumpTarget.y - enemy.jumpStart.y) * eased
    };
    enemy.velocity = {
      x: (enemy.position.x - previous.x) / Math.max(0.001, deltaMs / 1000),
      y: (enemy.position.y - previous.y) / Math.max(0.001, deltaMs / 1000)
    };
    enemy.jumpProgress = progress;
    enemy.airHeight = Math.sin(progress * Math.PI) * (enemy.role === 'parent' ? PARENT_JUMP_HEIGHT : 34);
    enemy.moveAmount = 1;
    enemy.squash = -Math.sin(progress * Math.PI) * 0.18;
  }

  private beginLanding(enemy: SlimeRuntime, events: SlimeEvent[]) {
    enemy.phase = 'landing';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = LANDING_DURATION_MS;
    enemy.position = copyVector(enemy.jumpTarget);
    enemy.velocity = zeroVector();
    enemy.airHeight = 0;
    enemy.squash = enemy.role === 'parent' ? 0.18 : 0.2;
    events.push({ type: 'slime-landed', id: enemy.id, role: enemy.role, position: copyVector(enemy.position) });
  }

  private beginRecovering(enemy: SlimeRuntime) {
    enemy.phase = 'recovering';
    enemy.phaseElapsedMs = 0;
    enemy.phaseDurationMs = enemy.role === 'parent' ? PARENT_RECOVER_DURATION_MS : RECOVER_DURATION_MS;
    enemy.velocity = zeroVector();
    enemy.squash = 0;
  }

  private tryDamagePlayer(
    enemy: SlimeRuntime,
    playerPosition: SimVector,
    events: SlimeEvent[]
  ) {
    if (enemy.playerHitCooldownMs > 0) {
      return;
    }

    const hitRadius = enemy.radius + PLAYER_HIT_RADIUS;
    const distance = Math.hypot(enemy.position.x - playerPosition.x, enemy.position.y - playerPosition.y);

    if (distance > hitRadius) {
      return;
    }

    enemy.playerHitCooldownMs = PLAYER_HIT_COOLDOWN_MS;
    events.push({
      type: 'slime-damaged-player',
      id: enemy.id,
      role: enemy.role,
      position: copyVector(enemy.position),
      damage: enemy.role === 'parent' ? PARENT_TOUCH_DAMAGE : CHILD_TOUCH_DAMAGE
    });
  }

  private updateEncounterCleared(events: SlimeEvent[]) {
    if (this.pendingSpawns.length > 0 || this.enemies.size > 0 || this.encounterCleared) {
      return;
    }

    this.encounterCleared = true;
    events.push({ type: 'slime-encounter-cleared' });
  }

  private spawnSplitChildren(enemy: SlimeRuntime, events: SlimeEvent[]) {
    events.push({
      type: 'slime-split',
      id: enemy.id,
      position: copyVector(enemy.position),
      childCount: PARENT_SPLIT_CHILDREN
    });

    for (let index = 0; index < PARENT_SPLIT_CHILDREN; index += 1) {
      const angle = (Math.PI * 2 * index) / PARENT_SPLIT_CHILDREN + randomRange(-0.22, 0.22);
      const position = {
        x: enemy.position.x + Math.cos(angle) * PARENT_SPLIT_RADIUS,
        y: enemy.position.y + Math.sin(angle) * PARENT_SPLIT_RADIUS
      };
      const child = this.createEnemy(
        {
          id: `${enemy.spawnId}-split-${index}`,
          x: position.x,
          y: position.y
        },
        'child'
      );

      child.phaseElapsedMs = randomRange(0, SPAWN_DURATION_MS * 0.35);
      child.spawnProgress = clamp01(child.phaseElapsedMs / child.phaseDurationMs);
      child.facing = normalize({
        x: child.position.x - enemy.position.x,
        y: child.position.y - enemy.position.y
      });
      this.enemies.set(child.id, child);
      events.push({ type: 'slime-spawned', id: child.id, role: child.role, position: copyVector(child.position) });
    }
  }
  private applyPendingAreaDamage(events: SlimeEvent[]) {
    if (this.pendingAreaDamage.length === 0) {
      return;
    }

    const blasts = this.pendingAreaDamage.splice(0);

    for (const enemy of Array.from(this.enemies.values())) {
      for (const blast of blasts) {
        const blastDistance = Math.hypot(
          enemy.position.x - blast.position.x,
          enemy.position.y - blast.position.y
        );

        if (blastDistance > blast.radius) {
          continue;
        }

        enemy.hp -= blast.damage;
        enemy.hitFlashMs = HIT_FLASH_MS;

        if (enemy.hp <= 0) {
          this.enemies.delete(enemy.id);
          events.push({ type: 'slime-killed', id: enemy.id, role: enemy.role, position: copyVector(enemy.position) });

          if (enemy.role === 'parent') {
            this.spawnSplitChildren(enemy, events);
          }
          break;
        }
      }
    }
  }

}
