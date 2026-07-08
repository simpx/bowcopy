import type { TunableRig } from './rigRegistry';

/**
 * Direct-manipulation face editor ("捏脸"): shows base.png at rest with the
 * runtime eye geometry overlaid as draggable shapes. Drag an eye to move it,
 * drag the corner handle to resize. Edits mutate the live rig for instant
 * preview in the sim slot; Submit posts the diff as a proposal to the review
 * inbox (humans never write rig.json directly).
 *
 * Geometry matches the runtime renderers: eye center = (x * W, y * H) on the
 * base image; embedded eyes are ellipses with rx = radiusX * W and
 * ry = radiusY * H; Bowbert-style attached eyes are circles with
 * r = outerRadius * W.
 */

type EyeTuning = Record<string, number>;
type EyeName = 'left' | 'right';

interface FaceRig {
  readonly base?: { readonly imageSize?: { readonly width: number; readonly height: number } };
  readonly gaze?: { readonly eyes?: Partial<Record<EyeName, EyeTuning>> };
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
  const eyePair: ReadonlyArray<readonly [EyeName, EyeTuning]> = [
    ['left', left],
    ['right', right]
  ];
  const baseline: Record<EyeName, EyeTuning> = {
    left: { ...left },
    right: { ...right }
  };
  const isCircle = typeof left.outerRadius === 'number';
  const radiusXPx = (eye: EyeTuning): number => (isCircle ? eye.outerRadius : eye.radiusX) * width;
  const radiusYPx = (eye: EyeTuning): number =>
    isCircle ? eye.outerRadius * width : eye.radiusY * height;

  const section = document.createElement('section');

  section.className = 'wb-face';

  const heading = document.createElement('div');

  heading.className = 'wb-rig-editor-head';
  heading.textContent = `${tunable.label} — 捏脸(眼位)`;

  const hint = document.createElement('p');

  hint.className = 'wb-hint';
  hint.textContent = '拖动眼睛调位置,拖角上的小方块调大小;改动即时同步到实机画面。';

  const stage = document.createElement('div');

  stage.className = 'wb-face-stage';

  const img = document.createElement('img');

  img.src = `/assets/characters/${tunable.folder}/base.png`;
  img.alt = `${tunable.label} base`;

  const svg = document.createElementNS(SVG_NS, 'svg');

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  stage.append(img, svg);

  interface EyeShape {
    readonly name: EyeName;
    readonly eye: EyeTuning;
    readonly ellipse: SVGEllipseElement;
    readonly handle: SVGRectElement;
  }

  // Sized for fingers: ~24px on a typical mobile render of the stage.
  const handleSize = width * 0.065;
  const shapes: EyeShape[] = eyePair.map(([name, eye]) => {
    const ellipse = document.createElementNS(SVG_NS, 'ellipse');
    const handle = document.createElementNS(SVG_NS, 'rect');

    ellipse.classList.add('wb-face-eye');
    ellipse.setAttribute('vector-effect', 'non-scaling-stroke');
    handle.classList.add('wb-face-handle');
    handle.setAttribute('width', String(handleSize));
    handle.setAttribute('height', String(handleSize));
    svg.append(ellipse, handle);

    return { name, eye, ellipse, handle };
  });

  const readout = document.createElement('p');

  readout.className = 'wb-face-readout';

  const sync = () => {
    for (const { eye, ellipse, handle } of shapes) {
      const cx = eye.x * width;
      const cy = eye.y * height;
      const rx = radiusXPx(eye);
      const ry = radiusYPx(eye);

      ellipse.setAttribute('cx', String(cx));
      ellipse.setAttribute('cy', String(cy));
      ellipse.setAttribute('rx', String(rx));
      ellipse.setAttribute('ry', String(ry));

      const rotation = isCircle ? 0 : ((eye.rotation ?? 0) * 180) / Math.PI;

      ellipse.setAttribute('transform', `rotate(${rotation} ${cx} ${cy})`);
      handle.setAttribute('x', String(cx + rx * 0.707 - handleSize / 2));
      handle.setAttribute('y', String(cy + ry * 0.707 - handleSize / 2));
    }

    readout.textContent = shapes
      .map(({ name, eye }) => {
        const size = isCircle
          ? `r ${round4(eye.outerRadius)}`
          : `r ${round4(eye.radiusX)}×${round4(eye.radiusY)}`;

        return `${name} (${round4(eye.x)}, ${round4(eye.y)}) ${size}`;
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

  const mirrorInto = (source: EyeTuning, target: EyeTuning) => {
    target.x = round4(1 - source.x);
    target.y = source.y;

    if (isCircle) {
      target.outerRadius = source.outerRadius;
    } else {
      target.radiusX = source.radiusX;
      target.radiusY = source.radiusY;

      if (typeof source.rotation === 'number') {
        target.rotation = -source.rotation;
      }
    }
  };

  const mirrorToggle = document.createElement('input');

  mirrorToggle.type = 'checkbox';
  mirrorToggle.checked = true;

  let drag: { readonly shape: EyeShape; readonly kind: 'move' | 'resize' } | null = null;

  for (const shape of shapes) {
    const start = (kind: 'move' | 'resize') => (event: PointerEvent) => {
      drag = { shape, kind };
      svg.setPointerCapture(event.pointerId);
      event.preventDefault();
    };

    shape.ellipse.addEventListener('pointerdown', start('move'));
    shape.handle.addEventListener('pointerdown', start('resize'));
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
    } else {
      const rx = round4(clamp(Math.abs(point.x - eye.x * width) / width, 0.01, 0.5));

      if (isCircle) {
        eye.outerRadius = rx;
      } else {
        eye.radiusX = rx;
        eye.radiusY = round4(clamp(Math.abs(point.y - eye.y * height) / height, 0.01, 0.5));
      }
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

  const reset = document.createElement('button');

  reset.className = 'wb-btn';
  reset.textContent = '重置';
  reset.addEventListener('click', () => {
    Object.assign(left, baseline.left);
    Object.assign(right, baseline.right);
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
      for (const key of Object.keys(baseline[name])) {
        if (eye[key] !== baseline[name][key]) {
          changes.push(`gaze.eyes.${name}.${key} ${round4(baseline[name][key])} → ${round4(eye[key])}`);
        }
      }
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
