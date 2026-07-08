import { EYE_TEMPLATES, resolveEyeExpressions } from '../characters/eyeEmotionTemplates';
import type { EyeContainerTuning, EyeExpression, EyeName } from '../characters/rigSchema';
import { computeContainerOutline, computeEyeShapes } from '../render/eyes/eyeGeometry';

import type { TunableRig } from './rigRegistry';

/**
 * Static expression sheet: renders every resolved emotion state of a
 * character on its still base.png, one mini-cell per state. The pupils are
 * drawn as SVG from the exact same geometry module the game renderer uses
 * (eyeGeometry.ts), so what you see here is what the runtime draws — just
 * frozen at neutral gaze.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const PUPIL_COLOR = '#050505';

const appendShapes = (
  svg: SVGSVGElement,
  name: EyeName,
  container: EyeContainerTuning,
  imageSize: { readonly width: number; readonly height: number },
  expression: EyeExpression,
  offsetScale: { readonly x: number; readonly y: number }
) => {
  const shapes = computeEyeShapes(name, container, imageSize, expression, {
    facingX: 0,
    facingY: 0,
    offsetScaleX: offsetScale.x,
    offsetScaleY: offsetScale.y,
    timeMs: 0
  });

  for (const shape of shapes) {
    const pointList = shape.points.map((point) => `${point.x},${point.y}`).join(' ');

    if (shape.kind === 'fill') {
      const polygon = document.createElementNS(SVG_NS, 'polygon');

      polygon.setAttribute('points', pointList);
      polygon.setAttribute('fill', PUPIL_COLOR);
      svg.append(polygon);
    } else {
      const polyline = document.createElementNS(SVG_NS, 'polyline');

      polyline.setAttribute('points', pointList);
      polyline.setAttribute('fill', 'none');
      polyline.setAttribute('stroke', PUPIL_COLOR);
      polyline.setAttribute('stroke-width', String(shape.width));
      polyline.setAttribute('stroke-linecap', 'round');
      svg.append(polyline);
    }
  }
};

interface GazeData {
  readonly eyes: Record<EyeName, EyeContainerTuning>;
  readonly pupilOffsetScale: { readonly x: number; readonly y: number };
  readonly emotions: { readonly template: string; readonly overrides?: Record<string, unknown> };
}

interface FaceRig {
  readonly base?: { readonly imageSize?: { readonly width: number; readonly height: number } };
  readonly gaze?: GazeData;
}

/**
 * Template sheet: renders every state of the single eye template inside both
 * socket shapes (round / cut synthetic sockets, no character art) — the
 * review surface for the shared eye asset itself, and proof that centroid
 * rest positioning seats the same expressions in any socket.
 */
export const buildTemplateSheet = (root: HTMLElement): void => {
  const imageSize = { width: 240, height: 150 };
  const socketFill = '#f4efdc';
  const socketStroke = '#141a14';

  const socketVariants: ReadonlyArray<readonly [string, Record<EyeName, EyeContainerTuning>]> = [
    [
      '圆眼窝',
      {
        left: { x: 0.32, y: 0.5, radiusX: 0.15, radiusY: 0.24, rotation: 0, cuts: [] },
        right: { x: 0.68, y: 0.5, radiusX: 0.15, radiusY: 0.24, rotation: 0, cuts: [] }
      }
    ],
    [
      '切角眼窝',
      {
        left: {
          x: 0.32,
          y: 0.5,
          radiusX: 0.15,
          radiusY: 0.24,
          rotation: 0,
          cuts: [{ slope: 0.5, offset: -0.45 }]
        },
        right: {
          x: 0.68,
          y: 0.5,
          radiusX: 0.15,
          radiusY: 0.24,
          rotation: 0,
          cuts: [{ slope: -0.5, offset: -0.45 }]
        }
      }
    ]
  ];

  const states = EYE_TEMPLATES.standard;

  for (const [variantLabel, containers] of socketVariants) {
    const heading = document.createElement('div');

    heading.className = 'wb-rig-editor-head';
    heading.textContent = `standard 模板 × ${variantLabel}`;

    const grid = document.createElement('div');

    grid.className = 'wb-expr-grid';

    for (const [state, expression] of Object.entries(states)) {
      const cell = document.createElement('figure');

      cell.className = 'wb-expr-cell';

      const stage = document.createElement('div');

      stage.className = 'wb-expr-stage wb-expr-stage-template';

      const svg = document.createElementNS(SVG_NS, 'svg');

      svg.setAttribute('viewBox', `0 0 ${imageSize.width} ${imageSize.height}`);

      for (const name of ['left', 'right'] as const) {
        const outline = computeContainerOutline(containers[name], imageSize);
        const socket = document.createElementNS(SVG_NS, 'polygon');

        socket.setAttribute('points', outline.map((point) => `${point.x},${point.y}`).join(' '));
        socket.setAttribute('fill', socketFill);
        socket.setAttribute('stroke', socketStroke);
        socket.setAttribute('stroke-width', '4');
        socket.setAttribute('stroke-linejoin', 'round');
        svg.append(socket);

        appendShapes(svg, name, containers[name], imageSize, expression, { x: 0, y: 0 });
      }

      stage.append(svg);

      const caption = document.createElement('figcaption');

      caption.textContent = state;
      cell.append(stage, caption);
      grid.append(cell);
    }

    root.append(heading, grid);
  }
};

export const buildExpressionPreview = (container: HTMLElement, tunable: TunableRig): void => {
  const rig = tunable.rig as FaceRig;
  const imageSize = rig.base?.imageSize;
  const gaze = rig.gaze;

  if (!imageSize || !gaze?.eyes?.left || !gaze.eyes.right) {
    return;
  }

  const expressions = resolveEyeExpressions(gaze.emotions);
  const overrides = new Set(Object.keys(gaze.emotions.overrides ?? {}));
  const grid = document.createElement('div');

  grid.className = 'wb-expr-grid';

  for (const [state, expression] of Object.entries(expressions)) {
    const cell = document.createElement('figure');

    cell.className = 'wb-expr-cell';

    const stage = document.createElement('div');

    stage.className = 'wb-expr-stage';

    const img = document.createElement('img');

    img.loading = 'lazy';
    img.src = `/assets/characters/${tunable.folder}/base.png`;
    img.alt = `${tunable.label} ${state}`;

    const svg = document.createElementNS(SVG_NS, 'svg');

    svg.setAttribute('viewBox', `0 0 ${imageSize.width} ${imageSize.height}`);

    for (const name of ['left', 'right'] as const) {
      appendShapes(svg, name, gaze.eyes[name], imageSize, expression, gaze.pupilOffsetScale);
    }

    stage.append(img, svg);

    const caption = document.createElement('figcaption');

    caption.textContent = overrides.has(state) ? `${state} *` : state;
    cell.append(stage, caption);
    grid.append(cell);
  }

  const heading = document.createElement('div');

  heading.className = 'wb-rig-editor-head';
  heading.textContent = `${tunable.label} — 表情(* 为角色覆盖)`;
  container.append(heading, grid);
};
