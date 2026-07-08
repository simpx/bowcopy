import type { SimVector } from '../player';
import type { ArrowProjectile } from '../projectiles';
import type { RoomBounds, RoomSpawnPoint } from '../rooms';

/**
 * Doorbert: a rooted spawner. The door never moves and never opens — a black
 * portal tears open beside it (creak telegraph) and keylets hop out; the
 * door is ONLY damageable while its portal window is open (creak through
 * stagger; decided 2026-07-08). Keylets are 1-HP chasers with a contact
 * bite; they outlive their door.
 */

export type DoorbertPhase = 'spawning' | 'idle' | 'creak' | 'burst' | 'stagger';
export type KeyletPhase = 'emerging' | 'chase';

export interface DoorbertEnemy {
  readonly id: number;
  position: SimVector;
  facing: SimVector;
  hp: number;
  maxHp: number;
  phase: DoorbertPhase;
  phaseElapsedMs: number;
  phaseDurationMs: number;
  spawnProgress: number;
  hitFlashMs: number;
  /** Portal anchor while the window is open (null when shut). */
  portalPosition: SimVector | null;
}

export interface KeyletEnemy {
  readonly id: number;
  position: SimVector;
  velocity: SimVector;
  facing: SimVector;
  hp: number;
  phase: KeyletPhase;
  phaseElapsedMs: number;
  spawnProgress: number;
  moveAmount: number;
  walkPhase: number;
  hitFlashMs: number;
  biteCooldownMs: number;
}

export type DoorbertEvent =
  | { type: 'doorbert-spawned'; id: number; position: SimVector }
  | { type: 'doorbert-portal-opened'; id: number; position: SimVector; portalPosition: SimVector }
  | { type: 'doorbert-portal-closed'; id: number }
  | { type: 'keylet-spawned'; id: number; position: SimVector }
  | { type: 'keylet-bite'; id: number; position: SimVector; damage: number }
  | { type: 'keylet-killed'; id: number; position: SimVector }
  | { type: 'doorbert-blocked'; id: number; arrowId: number; position: SimVector }
  | { type: 'doorbert-hit'; id: number; arrowId: number; position: SimVector; hp: number; damage: number }
  | { type: 'doorbert-killed'; id: number; position: SimVector }
  | { type: 'doorbert-encounter-cleared' };

export interface DoorbertFrame {
  readonly events: DoorbertEvent[];
  readonly consumedArrowIds: number[];
}

export interface DoorbertEncounterOptions {
  readonly enemyCount?: number;
  readonly waveIndex?: number;
}

const DEFAULT_ENCOUNTER_SIZE = 1;
const FIRST_SPAWN_DELAY_MS = 300;
const SPAWN_CADENCE_MS = 900;
const SPAWN_DURATION_MS = 420;
const IDLE_MS = 2400;
const CREAK_MS = 800;
const BURST_MS = 900;
const STAGGER_MS = 900;
const KEYLETS_PER_BURST = 2;
const KEYLET_CAP = 4;
const KEYLET_EMERGE_MS = 320;
const KEYLET_SPEED = 96;
const KEYLET_BITE_RANGE = 26;
const KEYLET_BITE_DAMAGE = 1;
const KEYLET_BITE_COOLDOWN_MS = 950;
const DOOR_MAX_HP = 6;
const HIT_FLASH_MS = 170;
const DOOR_HIT_RADIUS = 46;
const KEYLET_RADIUS = 16;
const KEYLET_HIT_RADIUS = 24;
const PORTAL_OFFSET_X = 74;
const PORTAL_OFFSET_Y = 6;
const DEAD_ZONE = 0.001;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clamp01 = (value: number): number => clamp(value, 0, 1);

const copyVector = (vector: SimVector): SimVector => ({ x: vector.x, y: vector.y });

const zeroVector = (): SimVector => ({ x: 0, y: 0 });

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

const clampPositionToBounds = (
  position: SimVector,
  bounds: RoomBounds,
  radius: number
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

export class DoorbertSystem {
  private readonly doors = new Map<number, DoorbertEnemy>();
  private readonly keylets = new Map<number, KeyletEnemy>();
  private pendingSpawns: RoomSpawnPoint[] = [];
  private nextId = 1;
  private nextSpawnMs = 0;
  private encounterStarted = false;
  private encounterCleared = false;
  private forceOpenRequested = false;

  startEncounter(spawnPoints: readonly RoomSpawnPoint[], options: DoorbertEncounterOptions = {}) {
    this.clear();
    this.encounterStarted = true;
    this.pendingSpawns = Array.from(spawnPoints).slice(
      0,
      Math.max(1, Math.floor(options.enemyCount ?? DEFAULT_ENCOUNTER_SIZE))
    );
    this.nextSpawnMs = Math.max(160, FIRST_SPAWN_DELAY_MS - (options.waveIndex ?? 1) * 14);
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    arrows: readonly ArrowProjectile[]
  ): DoorbertFrame {
    const events: DoorbertEvent[] = [];
    const consumedArrowIds = new Set<number>();

    if (!this.encounterStarted || this.encounterCleared) {
      return { events, consumedArrowIds: [] };
    }

    this.updateSpawnQueue(deltaMs, events);
    this.applyArrowHits(arrows, events, consumedArrowIds);

    for (const door of Array.from(this.doors.values())) {
      this.updateDoor(door, deltaMs, bounds, playerPosition, events);
    }

    for (const keylet of Array.from(this.keylets.values())) {
      this.updateKeylet(keylet, deltaMs, bounds, playerPosition, events);
    }

    if (
      this.pendingSpawns.length === 0 &&
      this.doors.size === 0 &&
      this.keylets.size === 0 &&
      !this.encounterCleared
    ) {
      this.encounterCleared = true;
      events.push({ type: 'doorbert-encounter-cleared' });
    }

    return { events, consumedArrowIds: Array.from(consumedArrowIds) };
  }

  getActiveDoors(): readonly DoorbertEnemy[] {
    return Array.from(this.doors.values());
  }

  getActiveKeylets(): readonly KeyletEnemy[] {
    return Array.from(this.keylets.values());
  }

  activeEnemyCount(): number {
    return this.doors.size + this.keylets.size;
  }

  hasEncounterStarted(): boolean {
    return this.encounterStarted;
  }

  isEncounterCleared(): boolean {
    return this.encounterCleared;
  }

  /** Debug hook: idle doors skip straight to the creak telegraph. */
  debugForceOpen() {
    this.forceOpenRequested = true;
  }

  clear() {
    this.doors.clear();
    this.keylets.clear();
    this.pendingSpawns = [];
    this.nextId = 1;
    this.nextSpawnMs = 0;
    this.encounterStarted = false;
    this.encounterCleared = false;
  }

  private updateSpawnQueue(deltaMs: number, events: DoorbertEvent[]) {
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

    const door: DoorbertEnemy = {
      id: this.nextId++,
      position: { x: spawn.x, y: spawn.y },
      facing: { x: 0, y: 1 },
      hp: DOOR_MAX_HP,
      maxHp: DOOR_MAX_HP,
      phase: 'spawning',
      phaseElapsedMs: 0,
      phaseDurationMs: SPAWN_DURATION_MS,
      spawnProgress: 0,
      hitFlashMs: 0,
      portalPosition: null
    };

    this.doors.set(door.id, door);
    this.nextSpawnMs = SPAWN_CADENCE_MS;
    events.push({ type: 'doorbert-spawned', id: door.id, position: copyVector(door.position) });
  }

  private portalWindowOpen(door: DoorbertEnemy): boolean {
    return door.phase === 'creak' || door.phase === 'burst' || door.phase === 'stagger';
  }

  private applyArrowHits(
    arrows: readonly ArrowProjectile[],
    events: DoorbertEvent[],
    consumedArrowIds: Set<number>
  ) {
    const doorRadiusSquared = DOOR_HIT_RADIUS * DOOR_HIT_RADIUS;
    const keyletRadiusSquared = KEYLET_HIT_RADIUS * KEYLET_HIT_RADIUS;

    for (const keylet of Array.from(this.keylets.values())) {
      for (const arrow of arrows) {
        if (consumedArrowIds.has(arrow.id)) {
          continue;
        }

        if (
          getSegmentDistanceSquared(keylet.position, arrow.previousPosition, arrow.position) >
          keyletRadiusSquared
        ) {
          continue;
        }

        consumedArrowIds.add(arrow.id);
        this.keylets.delete(keylet.id);
        events.push({ type: 'keylet-killed', id: keylet.id, position: copyVector(keylet.position) });
        break;
      }
    }

    for (const door of Array.from(this.doors.values())) {
      for (const arrow of arrows) {
        if (consumedArrowIds.has(arrow.id)) {
          continue;
        }

        if (
          getSegmentDistanceSquared(door.position, arrow.previousPosition, arrow.position) >
          doorRadiusSquared
        ) {
          continue;
        }

        consumedArrowIds.add(arrow.id);

        if (!this.portalWindowOpen(door)) {
          events.push({
            type: 'doorbert-blocked',
            id: door.id,
            arrowId: arrow.id,
            position: copyVector(door.position)
          });
          continue;
        }

        door.hp -= arrow.damage;
        door.hitFlashMs = HIT_FLASH_MS;

        if (door.hp <= 0) {
          this.doors.delete(door.id);
          events.push({ type: 'doorbert-portal-closed', id: door.id });
          events.push({ type: 'doorbert-killed', id: door.id, position: copyVector(door.position) });
          break;
        }

        events.push({
          type: 'doorbert-hit',
          id: door.id,
          arrowId: arrow.id,
          position: copyVector(door.position),
          hp: door.hp,
          damage: arrow.damage
        });
      }
    }
  }

  private enterDoorPhase(door: DoorbertEnemy, phase: DoorbertPhase) {
    door.phase = phase;
    door.phaseElapsedMs = 0;
    door.phaseDurationMs =
      phase === 'spawning'
        ? SPAWN_DURATION_MS
        : phase === 'idle'
          ? IDLE_MS * (0.85 + Math.random() * 0.3)
          : phase === 'creak'
            ? CREAK_MS
            : phase === 'burst'
              ? BURST_MS
              : STAGGER_MS;
  }

  private updateDoor(
    door: DoorbertEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: DoorbertEvent[]
  ) {
    door.phaseElapsedMs += deltaMs;
    door.hitFlashMs = Math.max(0, door.hitFlashMs - deltaMs);
    door.facing = vectorTo(door.position, playerPosition);

    if (door.phase === 'spawning') {
      door.spawnProgress = clamp01(door.phaseElapsedMs / door.phaseDurationMs);

      if (door.phaseElapsedMs >= door.phaseDurationMs) {
        this.enterDoorPhase(door, 'idle');
      }

      return;
    }

    if (
      door.phase === 'idle' &&
      (door.phaseElapsedMs >= door.phaseDurationMs || this.forceOpenRequested)
    ) {
      this.forceOpenRequested = false;
      // The portal tears open on the side facing the player.
      const side = playerPosition.x >= door.position.x ? 1 : -1;

      door.portalPosition = clampPositionToBounds(
        {
          x: door.position.x + side * PORTAL_OFFSET_X,
          y: door.position.y + PORTAL_OFFSET_Y
        },
        bounds,
        24
      );
      this.enterDoorPhase(door, 'creak');
      events.push({
        type: 'doorbert-portal-opened',
        id: door.id,
        position: copyVector(door.position),
        portalPosition: copyVector(door.portalPosition)
      });
      return;
    }

    if (door.phase === 'creak' && door.phaseElapsedMs >= door.phaseDurationMs) {
      this.enterDoorPhase(door, 'burst');

      const room = KEYLET_CAP - this.keylets.size;

      for (let index = 0; index < Math.min(KEYLETS_PER_BURST, room); index += 1) {
        const portal = door.portalPosition ?? door.position;
        const keylet: KeyletEnemy = {
          id: this.nextId++,
          position: {
            x: portal.x + (Math.random() - 0.5) * 14,
            y: portal.y + (Math.random() - 0.5) * 10
          },
          velocity: zeroVector(),
          facing: { x: 0, y: 1 },
          hp: 1,
          phase: 'emerging',
          phaseElapsedMs: 0,
          spawnProgress: 0,
          moveAmount: 0,
          walkPhase: Math.random() * Math.PI * 2,
          hitFlashMs: 0,
          biteCooldownMs: 500 + index * 250
        };

        this.keylets.set(keylet.id, keylet);
        events.push({ type: 'keylet-spawned', id: keylet.id, position: copyVector(keylet.position) });
      }

      return;
    }

    if (door.phase === 'burst' && door.phaseElapsedMs >= door.phaseDurationMs) {
      this.enterDoorPhase(door, 'stagger');
      door.portalPosition = null;
      events.push({ type: 'doorbert-portal-closed', id: door.id });
      return;
    }

    if (door.phase === 'stagger' && door.phaseElapsedMs >= door.phaseDurationMs) {
      this.enterDoorPhase(door, 'idle');
    }
  }

  private updateKeylet(
    keylet: KeyletEnemy,
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    events: DoorbertEvent[]
  ) {
    keylet.phaseElapsedMs += deltaMs;
    keylet.hitFlashMs = Math.max(0, keylet.hitFlashMs - deltaMs);
    keylet.biteCooldownMs = Math.max(0, keylet.biteCooldownMs - deltaMs);
    keylet.facing = vectorTo(keylet.position, playerPosition);
    keylet.walkPhase += deltaMs * 0.014;

    if (keylet.phase === 'emerging') {
      keylet.spawnProgress = clamp01(keylet.phaseElapsedMs / KEYLET_EMERGE_MS);
      keylet.moveAmount = 0;

      if (keylet.phaseElapsedMs >= KEYLET_EMERGE_MS) {
        keylet.phase = 'chase';
        keylet.phaseElapsedMs = 0;
      }

      return;
    }

    const gap = distance(keylet.position, playerPosition);

    if (gap > KEYLET_BITE_RANGE) {
      const direction = vectorTo(keylet.position, playerPosition);

      keylet.position.x += direction.x * KEYLET_SPEED * (deltaMs / 1000);
      keylet.position.y += direction.y * KEYLET_SPEED * (deltaMs / 1000);
      keylet.position = clampPositionToBounds(keylet.position, bounds, KEYLET_RADIUS);
      keylet.moveAmount = 1;

      return;
    }

    keylet.moveAmount = 0;

    if (keylet.biteCooldownMs <= 0) {
      keylet.biteCooldownMs = KEYLET_BITE_COOLDOWN_MS;
      events.push({
        type: 'keylet-bite',
        id: keylet.id,
        position: copyVector(keylet.position),
        damage: KEYLET_BITE_DAMAGE
      });
    }
  }
}
