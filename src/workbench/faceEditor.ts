import type { EyeContainerTuning, EyeName } from '../characters/rigSchema';
import { computeContainerOutline } from '../render/eyes/eyeGeometry';

import type { TunableRig } from './rigRegistry';

/**
 * Direct-manipulation face editor ("捏脸"): shows base.png at rest with the
 * runtime eye containers overlaid using the exact shared geometry module
 * (ellipse ∩ cuts — the outline you drag is the outline the game clips
 * against). Drag the socket to move it, the square handle to resize, and
 * the diamond handle on a cut edge to slide the cut. Edits mutate the live
 * rig for instant preview in the sim slot; Submit posts the diff as a
 * proposal to the review inbox (humans never write rig.json directly).
 */

interface MutableCut {
  slope: number;
  offset: number;
}

interface MutableEye {
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  rotation: number;
  cuts: MutableCut[];
}

interface FaceRig {
  readonly base?: { readonly imageSize?: { readonly width: number; readonly height: number } };
  readonly gaze?: { readonly eyes?: Partial<Record<EyeName, MutableEye>> };
}

const SVG_NS = 'http://www.w3.org/2000/svg';

const round4 = (value: number): number => Math.round(value * 10000) / 10000;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const buildFaceEditor = (
  container: HTMLElement,
  tunable: TunableRig,
  onChanged: () => void
): void => {
  const rig = tunable.rig as FaceRig;
  const image = rig.base?.imageSize;
  const left = rig.gaze?.eyes?.left;
  const right = rig.gaze?.eyes?.right;

  if (!image || !left || !right) {
    return;
  }

  const { width, height } = image;
  const eyePair: ReadonlyArray<readonly [EyeName, MutableEye]> = [
    ['left', left],
    ['right', right]
  ];
  const snapshot = (eye: MutableEye): MutableEye => ({
    ...eye,
    cuts: eye.cuts.map((cut) => ({ ...cut }))
  });
  const baseline: Record<EyeName, MutableEye> = { left: snapshot(left), right: snapshot(right) };

  const section = document.createElement('section');

  section.className = 'wb-face';

  const heading = document.createElement('div');

  heading.className = 'wb-rig-editor-head';
  heading.textContent = `${tunable.label} — 捏脸(眼位)`;

  const hint = document.createElement('p');

  hint.className = 'wb-hint';
  hint.textContent = '拖眼窝调位置,方块调大小,切线上的菱形滑动切口;即时同步到实机画面。';

  const stage = document.createElement('div');

  stage.className = 'wb-face-stage';

  const img = document.createElement('img');

  img.src = `/assets/characters/${tunable.folder}/base.png`;
  img.alt = `${tunable.label} base`;

  const svg = document.createElementNS(SVG_NS, 'svg');

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  stage.append(img, svg);

  const handleSize = width * 0.065;

  interface EyeShape {
    readonly name: EyeName;
    readonly eye: MutableEye;
    readonly outline: SVGPolygonElement;
    readonly resizeHandle: SVGRectElement;
    readonly cutHandles: SVGRectElement[];
  }

  const shapes: EyeShape[] = eyePair.map(([name, eye]) => {
    const outline = document.createElementNS(SVG_NS, 'polygon');
    const resizeHandle = document.createElementNS(SVG_NS, 'rect');

    outline.classList.add('wb-face-eye');
    outline.setAttribute('vector-effect', 'non-scaling-stroke');
    resizeHandle.classList.add('wb-face-handle');
    resizeHandle.setAttribute('width', String(handleSize));
    resizeHandle.setAttribute('height', String(handleSize));
    svg.append(outline, resizeHandle);

    const cutHandles = eye.cuts.map(() => {
      const handle = document.createElementNS(SVG_NS, 'rect');

      handle.classList.add('wb-face-cut-handle');
      handle.setAttribute('width', String(handleSize * 0.9));
      handle.setAttribute('height', String(handleSize * 0.9));
      svg.append(handle);

      return handle;
    });

    return { name, eye, outline, resizeHandle, cutHandles };
  });

  const readout = document.createElement('p');

  readout.className = 'wb-face-readout';

  const toImagePoint = (eye: MutableEye, local: { x: number; y: number }) => {
    const cosR = Math.cos(eye.rotation);
    const sinR = Math.sin(eye.rotation);
    const sx = local.x * eye.radiusX * width;
    const sy = local.y * eye.radiusY * height;

    return {
      x: eye.x * width + sx * cosR - sy * sinR,
      y: eye.y * height + sx * sinR + sy * cosR
    };
  };

  const toLocalPoint = (eye: MutableEye, point: { x: number; y: number }) => {
    const cosR = Math.cos(-eye.rotation);
    const sinR = Math.sin(-eye.rotation);
    const dx = point.x - eye.x * width;
    const dy = point.y - eye.y * height;

    return {
      x: (dx * cosR - dy * sinR) / (eye.radiusX * width),
      y: (dx * sinR + dy * cosR) / (eye.radiusY * height)
    };
  };

  const sync = () => {
    for (const shape of shapes) {
      const { eye } = shape;
      const outline = computeContainerOutline(
        eye as unknown as EyeContainerTuning,
        image
      );

      shape.outline.setAttribute(
        'points',
        outline.map((point) => `${point.x},${point.y}`).join(' ')
      );

      const corner = toImagePoint(eye, { x: 0.707, y: 0.707 });

      shape.resizeHandle.setAttribute('x', String(corner.x - handleSize / 2));
      shape.resizeHandle.setAttribute('y', String(corner.y - handleSize / 2));

      shape.cutHandles.forEach((handle, index) => {
        const cut = eye.cuts[index];
        // Chord midpoint = closest point of the cut line to the eye center.
        const t = cut.offset / (1 + cut.slope * cut.slope);
        const midpoint = toImagePoint(eye, { x: -cut.slope * t, y: t });

        handle.setAttribute('x', String(midpoint.x - (handleSize * 0.9) / 2));
        handle.setAttribute('y', String(midpoint.y - (handleSize * 0.9) / 2));
        handle.setAttribute('transform', `rotate(45 ${midpoint.x} ${midpoint.y})`);
      });
    }

    readout.textContent = shapes
      .map(({ name, eye }) => {
        const cuts = eye.cuts.length > 0 ? ` cut ${eye.cuts.map((c) => round4(c.offset)).join('/')}` : '';

        return `${name} (${round4(eye.x)}, ${round4(eye.y)}) r ${round4(eye.radiusX)}×${round4(eye.radiusY)}${cuts}`;
      })
      .join('  |  ');
  };

  const toImageCoords = (event: PointerEvent): { x: number; y: number } => {
    const rect = svg.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
  };

  const mirrorInto = (source: MutableEye, target: MutableEye) => {
    target.x = round4(1 - source.x);
    target.y = source.y;
    target.radiusX = source.radiusX;
    target.radiusY = source.radiusY;
    target.rotation = -source.rotation;
    target.cuts = source.cuts.map((cut) => ({ slope: -cut.slope, offset: cut.offset }));
  };

  const mirrorToggle = document.createElement('input');

  mirrorToggle.type = 'checkbox';
  mirrorToggle.checked = true;

  type DragKind = { kind: 'move' } | { kind: 'resize' } | { kind: 'cut'; index: number };
  let drag: ({ shape: EyeShape } & DragKind) | null = null;

  for (const shape of shapes) {
    const start = (dragKind: DragKind) => (event: PointerEvent) => {
      drag = { shape, ...dragKind };
      svg.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    shape.outline.addEventListener('pointerdown', start({ kind: 'move' }));
    shape.resizeHandle.addEventListener('pointerdown', start({ kind: 'resize' }));
    shape.cutHandles.forEach((handle, index) => {
      handle.addEventListener('pointerdown', start({ kind: 'cut', index }));
    });
  }

  svg.addEventListener('pointermove', (event) => {
    if (!drag) {
      return;
    }

    const point = toImageCoords(event);
    const { eye, name } = drag.shape;

    if (drag.kind === 'move') {
      eye.x = round4(clamp(point.x / width, 0, 1));
      eye.y = round4(clamp(point.y / height, 0, 1));
    } else if (drag.kind === 'resize') {
      eye.radiusX = round4(clamp(Math.abs(point.x - eye.x * width) / width / 0.707, 0.01, 0.5));
      eye.radiusY = round4(clamp(Math.abs(point.y - eye.y * height) / height / 0.707, 0.01, 0.5));
    } else {
      const local = toLocalPoint(eye, point);
      const cut = eye.cuts[drag.index];

      // Slide the cut along its normal: new offset keeps the slope.
      cut.offset = round4(clamp(local.y - cut.slope * local.x, -1.2, 1.2));
    }

    if (mirrorToggle.checked) {
      mirrorInto(eye, name === 'left' ? right : left);
    }

    sync();
  });

  const endDrag = () => {
    if (drag) {
      drag = null;
      onChanged();
    }
  };

  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);

  const controls = document.createElement('div');

  controls.className = 'wb-face-controls';

  const mirrorLabel = document.createElement('label');

  mirrorLabel.append(mirrorToggle, document.createTextNode('对称镜像'));

  const status = document.createElement('span');

  status.className = 'wb-rig-status';

  const applyEye = (target: MutableEye, source: MutableEye) => {
    target.x = source.x;
    target.y = source.y;
    target.radiusX = source.radiusX;
    target.radiusY = source.radiusY;
    target.rotation = source.rotation;
    target.cuts = source.cuts.map((cut) => ({ ...cut }));
  };

  const reset = document.createElement('button');

  reset.className = 'wb-btn';
  reset.textContent = '重置';
  reset.addEventListener('click', () => {
    applyEye(left, baseline.left);
    applyEye(right, baseline.right);
    sync();
    onChanged();
    status.textContent = '已恢复为 rig.json 当前值';
  });

  const submit = document.createElement('button');

  submit.className = 'wb-btn';
  submit.textContent = '提交修改建议';
  submit.addEventListener('click', () => {
    const changes: string[] = [];

    for (const [name, eye] of eyePair) {
      const base = baseline[name];

      for (const key of ['x', 'y', 'radiusX', 'radiusY', 'rotation'] as const) {
        if (eye[key] !== base[key]) {
          changes.push(`gaze.eyes.${name}.${key} ${round4(base[key])} → ${round4(eye[key])}`);
        }
      }

      eye.cuts.forEach((cut, index) => {
        const baseCut = base.cuts[index];

        if (!baseCut) {
          changes.push(`gaze.eyes.${name}.cuts[${index}] 新增 slope ${cut.slope} offset ${cut.offset}`);
          return;
        }

        for (const key of ['slope', 'offset'] as const) {
          if (cut[key] !== baseCut[key]) {
            changes.push(
              `gaze.eyes.${name}.cuts[${index}].${key} ${round4(baseCut[key])} → ${round4(cut[key])}`
            );
          }
        }
      });
    }

    if (changes.length === 0) {
      status.textContent = '没有改动可提交';
      return;
    }

    status.textContent = '提交中…';
    void fetch(`/__studio/note/${tunable.folder}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ note: `提议 rig 调整(捏脸):${changes.join(';')}` })
    })
      .then(async (response) => {
        const result = (await response.json()) as { ok: boolean; error?: string };

        status.textContent = result.ok ? '已提交建议(AI 评估后写回)' : `失败: ${result.error}`;
      })
      .catch((error) => {
        status.textContent = `失败: ${String(error)}`;
      });
  });

  controls.append(mirrorLabel, reset, submit, status);
  sync();
  section.append(heading, hint, stage, readout, controls);
  container.append(section);
};
