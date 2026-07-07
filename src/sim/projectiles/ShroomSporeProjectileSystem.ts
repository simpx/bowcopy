import type { SimVector } from '../player';
import type { RoomBounds } from '../rooms';

export type ShroomSporeVariant = 'red' | 'purple';

export interface ShroomSporeProjectile {
  readonly id: number;
  readonly variant: ShroomSporeVariant;
  readonly origin: SimVector;
  readonly target: SimVector;
  readonly direction: SimVector;
  position: SimVector;
  previousPosition: SimVector;
  ageMs: number;
  travelMs: number;
  lingerMs: number;
  damage: number;
  radius: number;
  color: number;
  trail: SimVector[];
}

export interface ShroomSporeBurstRequest {
  readonly variant: ShroomSporeVariant;
  readonly origin: SimVector;
  readonly distance: number;
  readonly travelMs: number;
  readonly lingerMs: number;
  readonly damage: number;
  readonly radius: number;
  readonly color: number;
}

export type ShroomSporeProjectileEvent =
  | {
      type: 'shroom-spore-hit-player';
      id: number;
      position: SimVector;
      damage: number;
    }
  | {
      type: 'shroom-spore-dodge-broken';
      id: number;
      position: SimVector;
    }
  | {
      type: 'shroom-spore-expired';
      id: number;
      position: SimVector;
    };

export interface ShroomSporeProjectileUpdateOptions {
  readonly playerBreaksSpores?: boolean;
}

const TRAIL_POINTS = 12;
const BOUNDS_MARGIN = 96;
const PLAYER_HIT_RADIUS = 27;
const DEAD_ZONE = 0.001;
const BURST_DIRECTIONS: readonly SimVector[] = [
  { x: -1, y: -1 },
  { x: 1, y: -1 },
  { x: -1, y: 1 },
  { x: 1, y: 1 }
] as const;

const copyVector = (vector: SimVector): SimVector => ({
  x: vector.x,
  y: vector.y
});

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

const easeOutCubic = (value: number): number => 1 - (1 - value) ** 3;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const isInsideExpandedBounds = (position: SimVector, bounds: RoomBounds): boolean =>
  position.x >= bounds.x - BOUNDS_MARGIN &&
  position.y >= bounds.y - BOUNDS_MARGIN &&
  position.x <= bounds.x + bounds.width + BOUNDS_MARGIN &&
  position.y <= bounds.y + bounds.height + BOUNDS_MARGIN;

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

  const projection = Math.min(
    1,
    Math.max(
      0,
      ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared
    )
  );
  const closestX = start.x + segmentX * projection;
  const closestY = start.y + segmentY * projection;
  const deltaX = point.x - closestX;
  const deltaY = point.y - closestY;

  return deltaX * deltaX + deltaY * deltaY;
};

export class ShroomSporeProjectileSystem {
  private readonly spores = new Map<number, ShroomSporeProjectile>();
  private nextId = 1;

  fireBurst(request: ShroomSporeBurstRequest): readonly ShroomSporeProjectile[] {
    const created: ShroomSporeProjectile[] = [];

    for (const burstDirection of BURST_DIRECTIONS) {
      const direction = normalize(burstDirection);
      const spore: ShroomSporeProjectile = {
        id: this.nextId,
        variant: request.variant,
        origin: copyVector(request.origin),
        target: {
          x: request.origin.x + direction.x * request.distance,
          y: request.origin.y + direction.y * request.distance
        },
        direction,
        position: copyVector(request.origin),
        previousPosition: copyVector(request.origin),
        ageMs: 0,
        travelMs: request.travelMs,
        lingerMs: request.lingerMs,
        damage: request.damage,
        radius: request.radius,
        color: request.color,
        trail: [copyVector(request.origin)]
      };

      this.nextId += 1;
      this.spores.set(spore.id, spore);
      created.push(spore);
    }

    return created;
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector,
    options: ShroomSporeProjectileUpdateOptions = {}
  ): ShroomSporeProjectileEvent[] {
    const events: ShroomSporeProjectileEvent[] = [];

    for (const spore of this.spores.values()) {
      spore.previousPosition = copyVector(spore.position);
      spore.ageMs += deltaMs;

      const travelProgress = clamp01(spore.ageMs / spore.travelMs);
      const eased = easeOutCubic(travelProgress);

      spore.position = {
        x: spore.origin.x + (spore.target.x - spore.origin.x) * eased,
        y: spore.origin.y + (spore.target.y - spore.origin.y) * eased
      };

      if (travelProgress < 1) {
        spore.trail.push(copyVector(spore.position));

        if (spore.trail.length > TRAIL_POINTS) {
          spore.trail.splice(0, spore.trail.length - TRAIL_POINTS);
        }
      }

      if (
        getSegmentDistanceSquared(playerPosition, spore.previousPosition, spore.position) <=
        (PLAYER_HIT_RADIUS + spore.radius) ** 2
      ) {
        if (options.playerBreaksSpores) {
          events.push({
            type: 'shroom-spore-dodge-broken',
            id: spore.id,
            position: copyVector(spore.position)
          });
          this.spores.delete(spore.id);
          continue;
        }

        events.push({
          type: 'shroom-spore-hit-player',
          id: spore.id,
          position: copyVector(spore.position),
          damage: spore.damage
        });
        this.spores.delete(spore.id);
        continue;
      }

      if (!isInsideExpandedBounds(spore.position, bounds) || spore.ageMs >= spore.travelMs + spore.lingerMs) {
        events.push({
          type: 'shroom-spore-expired',
          id: spore.id,
          position: copyVector(spore.position)
        });
        this.spores.delete(spore.id);
      }
    }

    return events;
  }

  getActiveSpores(): readonly ShroomSporeProjectile[] {
    return Array.from(this.spores.values());
  }

  clear() {
    this.spores.clear();
    this.nextId = 1;
  }
}
