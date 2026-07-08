import type { TunableRig } from './rigRegistry';

/**
 * Auto-generated tuning editor: walks the live rig object and exposes every
 * numeric leaf as an input. Edits mutate the live object (immediate in-page
 * preview only; the slot is respawned so per-visual caches rebuild). Submit
 * posts the changed values as a proposal to the review inbox — humans never
 * write rig.json directly; the AI selectively applies accepted proposals.
 */

const SKIP_KEYS = new Set([
  'id',
  'kind',
  'textureKey',
  'imageAsset',
  'image',
  'sourceImage',
  'projectContext',
  'source',
  'role',
  'notes',
  'mode',
  'archetype',
  'weapon',
  'arrow',
  'assetFolder'
]);

const numberStep = (value: number): string => {
  const magnitude = Math.abs(value);

  if (magnitude >= 100) {
    return '1';
  }

  if (magnitude >= 10) {
    return '0.5';
  }

  if (magnitude >= 1) {
    return '0.05';
  }

  return '0.005';
};

interface NumericLeaf {
  readonly path: readonly string[];
  readonly value: number;
}

/**
 * Leaves surfaced in the always-open "常用" section: overall scale, all
 * squash/stretch motion values, and attack/projectile timing-and-shape
 * numbers. Everything else (eye geometry, per-emotion tuning, shadows)
 * stays in the collapsed per-section lists.
 */
const isQuickLeaf = (path: readonly string[]): boolean => {
  const key = path[path.length - 1];

  if (path.join('.') === 'base.scale' || path[0] === 'motion') {
    return true;
  }

  if (path[0] === 'base' || path[0] === 'gaze') {
    return false;
  }

  return /ms$/i.test(key) || /(speed|distance|radius|count|delay|duration|charge)/i.test(key);
};

const collectNumericLeaves = (
  node: Record<string, unknown>,
  path: readonly string[],
  leaves: NumericLeaf[]
) => {
  for (const [key, value] of Object.entries(node)) {
    if (SKIP_KEYS.has(key)) {
      continue;
    }

    if (typeof value === 'number') {
      leaves.push({ path: [...path, key], value });
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      collectNumericLeaves(value as Record<string, unknown>, [...path, key], leaves);
    }
  }
};

const getByPath = (root: Record<string, unknown>, path: readonly string[]): unknown => {
  let node: unknown = root;

  for (const key of path) {
    if (!node || typeof node !== 'object') {
      return undefined;
    }

    node = (node as Record<string, unknown>)[key];
  }

  return node;
};

const setByPath = (root: Record<string, unknown>, path: readonly string[], value: number) => {
  let node: Record<string, unknown> = root;

  for (const key of path.slice(0, -1)) {
    node = node[key] as Record<string, unknown>;
  }

  node[path[path.length - 1]] = value;
};

export const buildRigEditor = (
  container: HTMLElement,
  tunable: TunableRig,
  onChanged: () => void
): void => {
  const editor = document.createElement('div');

  editor.className = 'wb-rig-editor';

  const heading = document.createElement('div');

  heading.className = 'wb-rig-editor-head';
  heading.textContent = `${tunable.label} — rig.json runtime`;
  editor.append(heading);

  const leavesBySection = new Map<string, NumericLeaf[]>();
  const quickLeaves: NumericLeaf[] = [];
  const leaves: NumericLeaf[] = [];

  collectNumericLeaves(tunable.rig, [], leaves);

  for (const leaf of leaves) {
    if (isQuickLeaf(leaf.path)) {
      quickLeaves.push(leaf);
      continue;
    }

    const section = leaf.path.length > 1 ? leaf.path[0] : '(root)';
    const bucket = leavesBySection.get(section) ?? [];

    bucket.push(leaf);
    leavesBySection.set(section, bucket);
  }

  const boundInputs: Array<{ leaf: NumericLeaf; input: HTMLInputElement }> = [];

  const buildRow = (leaf: NumericLeaf, label: string): HTMLLabelElement => {
    const row = document.createElement('label');

    row.className = 'wb-rig-row';

    const name = document.createElement('span');

    name.textContent = label;

    const input = document.createElement('input');

    input.type = 'number';
    input.step = numberStep(leaf.value);
    input.value = String(leaf.value);
    input.addEventListener('change', () => {
      const next = Number(input.value);

      if (Number.isFinite(next)) {
        setByPath(tunable.rig, leaf.path, next);
        onChanged();
      }
    });

    row.append(name, input);
    boundInputs.push({ leaf, input });

    return row;
  };

  if (quickLeaves.length > 0) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');

    details.open = true;
    summary.textContent = `★ 常用手感参数 (${quickLeaves.length})`;
    details.append(summary);

    for (const leaf of quickLeaves) {
      details.append(buildRow(leaf, leaf.path.join('.')));
    }

    editor.append(details);
  }

  for (const [section, sectionLeaves] of leavesBySection) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');

    summary.textContent = `${section} (${sectionLeaves.length}) — 细调`;
    details.append(summary);

    for (const leaf of sectionLeaves) {
      details.append(buildRow(leaf, leaf.path.length > 1 ? leaf.path.slice(1).join('.') : leaf.path[0]));
    }

    editor.append(details);
  }

  const footer = document.createElement('div');

  footer.className = 'wb-rig-footer';

  const submit = document.createElement('button');

  submit.className = 'wb-btn';
  submit.textContent = '提交修改建议';

  const status = document.createElement('span');

  status.className = 'wb-rig-status';

  submit.addEventListener('click', () => {
    const changes: string[] = [];

    for (const leaf of leaves) {
      const current = getByPath(tunable.rig, leaf.path);

      if (typeof current === 'number' && current !== leaf.value) {
        changes.push(`${leaf.path.join('.')} ${leaf.value} → ${current}`);
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
      body: JSON.stringify({ note: `提议 rig 调整:${changes.join(';')}` })
    })
      .then(async (response) => {
        const result = (await response.json()) as { ok: boolean; error?: string };

        status.textContent = result.ok ? '已提交建议(AI 评估后写回)' : `失败: ${result.error}`;
      })
      .catch((error) => {
        status.textContent = `失败: ${String(error)}`;
      });
  });

  const reset = document.createElement('button');

  reset.className = 'wb-btn';
  reset.textContent = '重置';
  reset.addEventListener('click', () => {
    for (const { leaf, input } of boundInputs) {
      setByPath(tunable.rig, leaf.path, leaf.value);
      input.value = String(leaf.value);
    }

    onChanged();
    status.textContent = '已恢复为 rig.json 当前值';
  });

  footer.append(submit, reset, status);
  editor.append(footer);
  container.append(editor);
};
