import type { TunableRig } from './rigRegistry';

/**
 * Auto-generated tuning editor: walks the live rig object and exposes every
 * numeric leaf as an input. Edits mutate the live object (immediate preview;
 * the slot is respawned so per-visual caches rebuild) and Save writes the
 * whole runtime rig back to assets/characters/<id>/rig.json via the dev
 * server endpoint.
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
  const leaves: NumericLeaf[] = [];

  collectNumericLeaves(tunable.rig, [], leaves);

  for (const leaf of leaves) {
    const section = leaf.path.length > 1 ? leaf.path[0] : '(root)';
    const bucket = leavesBySection.get(section) ?? [];

    bucket.push(leaf);
    leavesBySection.set(section, bucket);
  }

  for (const [section, sectionLeaves] of leavesBySection) {
    const details = document.createElement('details');
    const summary = document.createElement('summary');

    summary.textContent = `${section} (${sectionLeaves.length})`;
    details.append(summary);

    for (const leaf of sectionLeaves) {
      const row = document.createElement('label');

      row.className = 'wb-rig-row';

      const name = document.createElement('span');

      name.textContent = leaf.path.length > 1 ? leaf.path.slice(1).join('.') : leaf.path[0];

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
      details.append(row);
    }

    editor.append(details);
  }

  const footer = document.createElement('div');

  footer.className = 'wb-rig-footer';

  const save = document.createElement('button');

  save.className = 'wb-btn';
  save.textContent = '保存到 rig.json';

  const status = document.createElement('span');

  status.className = 'wb-rig-status';

  save.addEventListener('click', () => {
    status.textContent = '保存中…';
    void fetch(`/__studio/rig/${tunable.folder}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(tunable.rig)
    })
      .then(async (response) => {
        const result = (await response.json()) as { ok: boolean; error?: string };

        status.textContent = result.ok ? '已保存(页面将自动刷新)' : `失败: ${result.error}`;
      })
      .catch((error) => {
        status.textContent = `失败: ${String(error)}`;
      });
  });

  footer.append(save, status);
  editor.append(footer);
  container.append(editor);
};
