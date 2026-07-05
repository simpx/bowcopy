import type { SimVector } from '../player';
import type { RoomBounds } from '../rooms';

export interface EnemyDartProjectile {
  readonly id: number;
  position: SimVector;
  previousPosition: SimVector;
  direction: SimVector;
  speed: number;
  damage: number;
  ageMs: number;
  ttlMs: number;
  trail: SimVector[];
}

export interface EnemyDartFireRequest {
  readonly origin: SimVector;
  readonly direction: SimVector;
  readonly speed: number;
  readonly damage: number;
}

export type EnemyDartProjectileEvent =
  | {
      type: 'enemy-dart-hit-player';
      id: number;
      position: SimVector;
      damage: number;
    }
  | {
      type: 'enemy-dart-hit-boundary';
      id: number;
      position: SimVector;
    }
  | {
      type: 'enemy-dart-expired';
      id: number;
      position: SimVector;
    };

const DART_TTL_MS = 2800;
const TRAIL_POINTS = 8;
const BOUNDS_MARGIN = 34;
const PLAYER_HIT_RADIUS = 29;
const DEAD_ZONE = 0.001;

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

export class EnemyDartProjectileSystem {
  private readonly darts = new Map<number, EnemyDartProjectile>();
  private nextId = 1;

  fireDart(request: EnemyDartFireRequest): EnemyDartProjectile {
    const direction = normalize(request.direction);
    const dart: EnemyDartProjectile = {
      id: this.nextId,
      position: copyVector(request.origin),
      previousPosition: copyVector(request.origin),
      direction,
      speed: request.speed,
      damage: request.damage,
      ageMs: 0,
      ttlMs: DART_TTL_MS,
      trail: [copyVector(request.origin)]
    };

    this.nextId += 1;
    this.darts.set(dart.id, dart);

    return dart;
  }

  update(
    deltaMs: number,
    bounds: RoomBounds,
    playerPosition: SimVector
  ): EnemyDartProjectileEvent[] {
    const events: EnemyDartProjectileEvent[] = [];
    const deltaSeconds = deltaMs / 1000;
    const playerHitRadiusSquared = PLAYER_HIT_RADIUS * PLAYER_HIT_RADIUS;

    for (const dart of this.darts.values()) {
      dart.previousPosition = copyVector(dart.position);
      dart.position = {
        x: dart.position.x + dart.direction.x * dart.speed * deltaSeconds,
        y: dart.position.y + dart.direction.y * dart.speed * deltaSeconds
      };
      dart.ageMs += deltaMs;
      dart.trail.push(copyVector(dart.position));

      if (dart.trail.length > TRAIL_POINTS) {
        dart.trail.splice(0, dart.trail.length - TRAIL_POINTS);
      }

      if (
        getSegmentDistanceSquared(playerPosition, dart.previousPosition, dart.position) <=
        playerHitRadiusSquared
      ) {
        events.push({
          type: 'enemy-dart-hit-player',
          id: dart.id,
          position: copyVector(dart.position),
          damage: dart.damage
        });
        this.darts.delete(dart.id);
        continue;
      }

      if (!isInsideExpandedBounds(dart.position, bounds)) {
        events.push({
          type: 'enemy-dart-hit-boundary',
          id: dart.id,
          position: copyVector(dart.position)
        });
        this.darts.delete(dart.id);
        continue;
      }

      if (dart.ageMs >= dart.ttlMs) {
        events.push({
          type: 'enemy-dart-expired',
          id: dart.id,
          position: copyVector(dart.position)
        });
        this.darts.delete(dart.id);
      }
    }

    return events;
  }

  getActiveDarts(): readonly EnemyDartProjectile[] {
    return Array.from(this.darts.values());
  }

  clear() {
    this.darts.clear();
    this.nextId = 1;
  }
}
