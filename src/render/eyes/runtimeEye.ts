import Phaser from 'phaser';

import type { EyeContainerTuning, EyeExpression, EyeName } from '../../characters/rigSchema';
import { computeEyeShapes, type EyeGazeFrame } from './eyeGeometry';

/**
 * The single runtime eye implementation (docs/studio/eyes.md). All geometry
 * (containment clamp, cut/ellipse clipping, pupil styles) lives in
 * eyeGeometry.ts and is shared with the workbench's static expression
 * preview; this module only rasterizes the resulting shapes into a Phaser
 * Graphics positioned at the base image center.
 */

const EYE_PUPIL_COLOR = 0x050505;

export type RuntimeEyeFrame = EyeGazeFrame;

/** Linear blend between two expressions (for continuous behavior states). */
export const mixExpressions = (
  a: EyeExpression,
  b: EyeExpression,
  t: number
): EyeExpression => {
  const blend = (x: number, y: number) => x + (y - x) * Phaser.Math.Clamp(t, 0, 1);

  return {
    ...(t < 0.5 ? a : b),
    pupilRadiusX: blend(a.pupilRadiusX, b.pupilRadiusX),
    pupilRadiusY: blend(a.pupilRadiusY, b.pupilRadiusY),
    pupilShiftX: blend(a.pupilShiftX, b.pupilShiftX),
    pupilShiftY: blend(a.pupilShiftY, b.pupilShiftY),
    tiltAdd: blend(a.tiltAdd, b.tiltAdd),
    upperLid: blend(a.upperLid, b.upperLid),
    lowerLid: blend(a.lowerLid, b.lowerLid)
  };
};

/**
 * Draw one eye into `graphics` (positioned at the base-image center).
 * Callers clear the graphics once per frame and invoke this per eye.
 */
export const drawRuntimeEye = (
  graphics: Phaser.GameObjects.Graphics,
  name: EyeName,
  container: EyeContainerTuning,
  imageSize: { readonly width: number; readonly height: number },
  expression: EyeExpression,
  frame: RuntimeEyeFrame,
  color: number = EYE_PUPIL_COLOR
): void => {
  const offsetX = -imageSize.width / 2;
  const offsetY = -imageSize.height / 2;

  for (const shape of computeEyeShapes(name, container, imageSize, expression, frame)) {
    const points = shape.points.map(
      (point) => new Phaser.Math.Vector2(point.x + offsetX, point.y + offsetY)
    );

    if (shape.kind === 'fill') {
      graphics.fillStyle(color, 1);
      graphics.fillPoints(points, true, true);
    } else {
      graphics.lineStyle(shape.width, color, 1);
      graphics.strokePoints(points, false, false);
    }
  }
};
