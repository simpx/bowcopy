import type { SimVector } from '../player';
import type { RoomBounds } from '../rooms';

export interface ArrowProjectile {
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

export interface ArrowFireRequest {
  readonly origin: SimVector;
  readonly direction: SimVector;
  readonly speed: number;
  readonly damage: number;
}

export type ArrowProjectileEvent =
  | {
      type: 'arrow-hit-boundary';
      id: number;
      position: SimVector;
      damage: number;
    }
  | {
      type: 'arrow-expired';
      id: number;
      position: SimVector;
    };

const ARROW_TTL_MS = 1250;
const TRAIL_POINTS = 7;
const BOUNDS_MARGIN = 42;
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

export class ArrowProjectileSystem {
  private readonly arrows = new Map<number, ArrowProjectile>();
  private nextId = 1;

  fireArrow(request: ArrowFireRequest): ArrowProjectile {
    const direction = normalize(request.direction);
    const arrow: ArrowProjectile = {
      id: this.nextId,
      position: copyVector(request.origin),
      previousPosition: copyVector(request.origin),
      direction,
      speed: request.speed,
      damage: request.damage,
      ageMs: 0,
      ttlMs: ARROW_TTL_MS,
      trail: [copyVector(request.origin)]
    };

    this.nextId += 1;
    this.arrows.set(arrow.id, arrow);

    return arrow;
  }

  update(deltaMs: number, bounds: RoomBounds): ArrowProjectileEvent[] {
    const events: ArrowProjectileEvent[] = [];
    const deltaSeconds = deltaMs / 1000;

    for (const arrow of this.arrows.values()) {
      arrow.previousPosition = copyVector(arrow.position);
      arrow.position = {
        x: arrow.position.x + arrow.direction.x * arrow.speed * deltaSeconds,
        y: arrow.position.y + arrow.direction.y * arrow.speed * deltaSeconds
      };
      arrow.ageMs += deltaMs;
      arrow.trail.push(copyVector(arrow.position));

      if (arrow.trail.length > TRAIL_POINTS) {
        arrow.trail.splice(0, arrow.trail.length - TRAIL_POINTS);
      }

      if (!isInsideExpandedBounds(arrow.position, bounds)) {
        events.push({
          type: 'arrow-hit-boundary',
          id: arrow.id,
          position: copyVector(arrow.position),
          damage: arrow.damage
        });
        this.arrows.delete(arrow.id);
        continue;
      }

      if (arrow.ageMs >= arrow.ttlMs) {
        events.push({
          type: 'arrow-expired',
          id: arrow.id,
          position: copyVector(arrow.position)
        });
        this.arrows.delete(arrow.id);
      }
    }

    return events;
  }

  getActiveArrows(): readonly ArrowProjectile[] {
    return Array.from(this.arrows.values());
  }

  removeArrow(id: number): boolean {
    return this.arrows.delete(id);
  }

  clear() {
    this.arrows.clear();
  }
}
