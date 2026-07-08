import type { EyeContainerTuning, EyeExpression, EyeName } from '../../characters/rigSchema';

/**
 * Pure eye geometry (docs/studio/eyes.md): given a container, an expression
 * and a gaze frame, compute the final pupil shapes in base-image pixel
 * coordinates (origin = image top-left). Both the Phaser runtime renderer
 * (runtimeEye.ts) and the workbench's static expression preview consume this
 * module, so the two can never drift apart.
 */

export interface EyeGazeFrame {
  /** Facing / aim vector; clamped per-axis to [-1, 1]. */
  readonly facingX: number;
  readonly facingY: number;
  /** Gaze tracking strength in eye-local units. */
  readonly offsetScaleX: number;
  readonly offsetScaleY: number;
  readonly timeMs: number;
}

export interface EyePoint {
  x: number;
  y: number;
}

export interface EyeFillShape {
  readonly kind: 'fill';
  readonly points: readonly EyePoint[];
}

export interface EyeStrokeShape {
  readonly kind: 'stroke';
  readonly points: readonly EyePoint[];
  readonly width: number;
}

export type EyeShape = EyeFillShape | EyeStrokeShape;

const ELLIPSE_SEGMENTS = 72;
const CONTAINER_CLIP_SEGMENTS = 48;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clipPolygonByHalfPlane = (
  points: EyePoint[],
  slope: number,
  offset: number
): EyePoint[] => {
  const inside = (point: EyePoint) => point.y - slope * point.x - offset >= 0;
  const clipped: EyePoint[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const currentInside = inside(current);
    const nextInside = inside(next);

    if (currentInside) {
      clipped.push(current);
    }

    if (currentInside !== nextInside) {
      const currentDistance = current.y - slope * current.x - offset;
      const nextDistance = next.y - slope * next.x - offset;
      const ratio =
        Math.abs(currentDistance - nextDistance) > 1e-9
          ? currentDistance / (currentDistance - nextDistance)
          : 0;

      clipped.push({
        x: current.x + (next.x - current.x) * ratio,
        y: current.y + (next.y - current.y) * ratio
      });
    }
  }

  return clipped;
};

/** Clip a polygon (container-local coords) against the unit circle. */
const clipPolygonByUnitCircle = (points: EyePoint[]): EyePoint[] => {
  let clipped = points;

  for (let segment = 0; segment < CONTAINER_CLIP_SEGMENTS; segment += 1) {
    const angle = (2 * Math.PI * segment) / CONTAINER_CLIP_SEGMENTS;
    const nx = Math.cos(angle);
    const ny = Math.sin(angle);
    const inside = (point: EyePoint) => nx * point.x + ny * point.y <= 1;
    const next: EyePoint[] = [];

    for (let index = 0; index < clipped.length; index += 1) {
      const current = clipped[index];
      const following = clipped[(index + 1) % clipped.length];
      const currentInside = inside(current);
      const followingInside = inside(following);

      if (currentInside) {
        next.push(current);
      }

      if (currentInside !== followingInside) {
        const currentDistance = 1 - (nx * current.x + ny * current.y);
        const followingDistance = 1 - (nx * following.x + ny * following.y);
        const ratio =
          Math.abs(currentDistance - followingDistance) > 1e-9
            ? currentDistance / (currentDistance - followingDistance)
            : 0;

        next.push({
          x: current.x + (following.x - current.x) * ratio,
          y: current.y + (following.y - current.y) * ratio
        });
      }
    }

    clipped = next;

    if (clipped.length === 0) {
      return clipped;
    }
  }

  return clipped;
};

/** Clamp the pupil center so a pupil of the given radius stays inside. */
const clampPupilCenter = (
  center: EyePoint,
  pupilRadius: number,
  cuts: readonly { readonly slope: number; readonly offset: number }[]
): EyePoint => {
  const limit = Math.max(0, 1 - pupilRadius);
  const distance = Math.hypot(center.x, center.y);
  const clamped: EyePoint =
    distance > limit && distance > 1e-9
      ? { x: (center.x / distance) * limit, y: (center.y / distance) * limit }
      : { x: center.x, y: center.y };

  for (const cut of cuts) {
    const normalLength = Math.hypot(cut.slope, 1);
    const signedDistance = (clamped.y - cut.slope * clamped.x - cut.offset) / normalLength;
    const required = Math.min(pupilRadius, 1);

    if (signedDistance < required) {
      const push = required - signedDistance;

      clamped.x += (-cut.slope / normalLength) * push;
      clamped.y += (1 / normalLength) * push;
    }
  }

  return clamped;
};

const lidCompression = (expression: EyeExpression): number =>
  clamp(1 - (expression.upperLid + expression.lowerLid) * 0.24, 0.45, 1);

/**
 * Rest position of the pupil = centroid of the clipped container (eye-local
 * units). For an uncut socket this is the center; a cut socket (teardrop,
 * crescent) pushes the rest position away from the removed region, so one
 * expression set works in any socket shape without compensation shifts.
 */
const containerCentroid = (
  cuts: readonly { readonly slope: number; readonly offset: number }[]
): EyePoint => {
  if (cuts.length === 0) {
    return { x: 0, y: 0 };
  }

  let points: EyePoint[] = [];

  for (let index = 0; index < ELLIPSE_SEGMENTS; index += 1) {
    const angle = (2 * Math.PI * index) / ELLIPSE_SEGMENTS;

    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }

  for (const cut of cuts) {
    points = clipPolygonByHalfPlane(points, cut.slope, cut.offset);

    if (points.length === 0) {
      return { x: 0, y: 0 };
    }
  }

  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;

    area += cross;
    cx += (current.x + next.x) * cross;
    cy += (current.y + next.y) * cross;
  }

  if (Math.abs(area) < 1e-9) {
    return { x: 0, y: 0 };
  }

  return { x: cx / (3 * area), y: cy / (3 * area) };
};

/**
 * Container outline polygon (unit ellipse ∩ cuts) in base-image pixel
 * coordinates — used by tooling to draw the socket itself.
 */
export const computeContainerOutline = (
  container: EyeContainerTuning,
  imageSize: { readonly width: number; readonly height: number }
): EyePoint[] => {
  const { width, height } = imageSize;
  const radiusXPx = container.radiusX * width;
  const radiusYPx = container.radiusY * height;
  const centerX = container.x * width;
  const centerY = container.y * height;
  const cosR = Math.cos(container.rotation);
  const sinR = Math.sin(container.rotation);
  let points: EyePoint[] = [];

  for (let index = 0; index < ELLIPSE_SEGMENTS; index += 1) {
    const angle = (2 * Math.PI * index) / ELLIPSE_SEGMENTS;

    points.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }

  for (const cut of container.cuts) {
    points = clipPolygonByHalfPlane(points, cut.slope, cut.offset);
  }

  return points.map((point) => {
    const scaledX = point.x * radiusXPx;
    const scaledY = point.y * radiusYPx;

    return {
      x: centerX + scaledX * cosR - scaledY * sinR,
      y: centerY + scaledX * sinR + scaledY * cosR
    };
  });
};

/**
 * Compute the drawable shapes for one eye, in base-image pixel coordinates
 * (origin at the image's top-left corner).
 */
export const computeEyeShapes = (
  name: EyeName,
  container: EyeContainerTuning,
  imageSize: { readonly width: number; readonly height: number },
  expression: EyeExpression,
  frame: EyeGazeFrame
): EyeShape[] => {
  const { width, height } = imageSize;
  const radiusXPx = container.radiusX * width;
  const radiusYPx = container.radiusY * height;
  const centerX = container.x * width;
  const centerY = container.y * height;
  const cosR = Math.cos(container.rotation);
  const sinR = Math.sin(container.rotation);

  const toImage = (local: EyePoint): EyePoint => {
    const scaledX = local.x * radiusXPx;
    const scaledY = local.y * radiusYPx;

    return {
      x: centerX + scaledX * cosR - scaledY * sinR,
      y: centerY + scaledX * sinR + scaledY * cosR
    };
  };

  const rest = containerCentroid(container.cuts);

  // Gaze tracking and expression shifts are WORLD directions — a character
  // looks at the player regardless of how its socket ellipse is rotated
  // (rotation is art calibration). Build the offset in image axes, then
  // carry it into the rotated local frame so the container clamp still
  // operates in local units.
  const worldXPx =
    (clamp(frame.facingX, -1, 1) * frame.offsetScaleX + expression.pupilShiftX) * radiusXPx;
  const worldYPx =
    (clamp(frame.facingY, -1, 1) * frame.offsetScaleY + expression.pupilShiftY) * radiusYPx;
  const rawCenter: EyePoint = {
    x: rest.x + (worldXPx * cosR + worldYPx * sinR) / radiusXPx,
    y: rest.y + (-worldXPx * sinR + worldYPx * cosR) / radiusYPx
  };

  const pupilRadiusX = expression.pupilRadiusX;
  const pupilRadiusY = expression.pupilRadiusY * lidCompression(expression);
  const clampRadius = Math.min(Math.max(pupilRadiusX, pupilRadiusY), 1);
  const center = clampPupilCenter(rawCenter, clampRadius, container.cuts);

  const tiltDirection = expression.tiltMode === 'same' ? 1 : name === 'left' ? -1 : 1;
  const tilt = tiltDirection * expression.tiltAdd;

  // Expression cuts (lids) are authored for the left eye; mirror for right.
  const mirrorSign = name === 'left' ? 1 : -1;
  const allCuts = [
    ...container.cuts,
    ...(expression.cuts ?? []).map((cut) => ({
      slope: cut.slope * mirrorSign,
      offset: cut.offset
    }))
  ];

  if (expression.style === 'spiral') {
    return spiralShapes(center, pupilRadiusX, pupilRadiusY, radiusXPx, radiusYPx, frame.timeMs, toImage);
  }

  if (expression.style === 'x') {
    return xShapes(center, pupilRadiusX, pupilRadiusY, radiusXPx, radiusYPx, toImage);
  }

  return dotShapes(center, pupilRadiusX, pupilRadiusY, tilt, allCuts, toImage);
};

const dotShapes = (
  center: EyePoint,
  pupilRadiusX: number,
  pupilRadiusY: number,
  tilt: number,
  cuts: readonly { readonly slope: number; readonly offset: number }[],
  toImage: (local: EyePoint) => EyePoint
): EyeShape[] => {
  let points: EyePoint[] = [];
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  for (let index = 0; index < ELLIPSE_SEGMENTS; index += 1) {
    const angle = (2 * Math.PI * index) / ELLIPSE_SEGMENTS;
    const px = Math.cos(angle) * pupilRadiusX;
    const py = Math.sin(angle) * pupilRadiusY;

    points.push({
      x: center.x + px * cosT - py * sinT,
      y: center.y + px * sinT + py * cosT
    });
  }

  for (const cut of cuts) {
    points = clipPolygonByHalfPlane(points, cut.slope, cut.offset);

    if (points.length === 0) {
      return [];
    }
  }

  const reach = Math.hypot(center.x, center.y) + Math.max(pupilRadiusX, pupilRadiusY);

  if (reach > 1) {
    points = clipPolygonByUnitCircle(points);

    if (points.length === 0) {
      return [];
    }
  }

  return [{ kind: 'fill', points: points.map(toImage) }];
};

const spiralShapes = (
  center: EyePoint,
  pupilRadiusX: number,
  pupilRadiusY: number,
  radiusXPx: number,
  radiusYPx: number,
  timeMs: number,
  toImage: (local: EyePoint) => EyePoint
): EyeShape[] => {
  const radiusPx = Math.min(pupilRadiusX * radiusXPx, pupilRadiusY * radiusYPx) * 1.24;
  const phase = timeMs * 0.006;
  const points: EyePoint[] = [];

  for (let index = 0; index < 42; index += 1) {
    const progress = index / 41;
    const angle = progress * Math.PI * 2.55 + phase;
    const localRadius = radiusPx * (0.18 + progress * 0.82);

    points.push({
      x: center.x + (Math.cos(angle) * localRadius) / radiusXPx,
      y: center.y + (Math.sin(angle) * localRadius) / radiusYPx
    });
  }

  return [
    {
      kind: 'stroke',
      points: points.map(toImage),
      width: radiusPx * 0.5
    }
  ];
};

const xShapes = (
  center: EyePoint,
  pupilRadiusX: number,
  pupilRadiusY: number,
  radiusXPx: number,
  radiusYPx: number,
  toImage: (local: EyePoint) => EyePoint
): EyeShape[] => {
  const halfWidth = pupilRadiusX * 0.84;
  const halfHeight = pupilRadiusY * 0.84;
  const width = Math.min(halfWidth * radiusXPx, halfHeight * radiusYPx) * 0.38;

  return [
    {
      kind: 'stroke',
      points: [
        toImage({ x: center.x - halfWidth, y: center.y - halfHeight }),
        toImage({ x: center.x + halfWidth, y: center.y + halfHeight })
      ],
      width
    },
    {
      kind: 'stroke',
      points: [
        toImage({ x: center.x + halfWidth, y: center.y - halfHeight }),
        toImage({ x: center.x - halfWidth, y: center.y + halfHeight })
      ],
      width
    }
  ];
};
