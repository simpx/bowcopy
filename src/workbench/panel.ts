import { fetchCharacterBrief, fetchQcReport } from './characterInfo';
import { buildExpressionPreview, buildTemplateSheet } from './expressionPreview';
import { buildFaceEditor } from './faceEditor';
import { buildRigEditor } from './rigEditor';
import { getTunableRigs } from './rigRegistry';
import type { WorkbenchController, WorkbenchSlotHandle } from './WorkbenchScene';

const STATUS_COLORS: Record<string, string> = {
  playtested: '#8eea7a',
  done: '#8eea7a',
  'runtime-integrated': '#ffd75d',
  tuned: '#ffd75d',
  rigged: '#ffb35d',
  'asset-generated': '#ffb35d',
  'reference-locked': '#e9a1ff',
  'needs-review': '#ff7a7a',
  unknown: '#9aa89f'
};

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
};

const button = (label: string, onClick: () => void): HTMLButtonElement => {
  const node = el('button', 'wb-btn', label);

  node.addEventListener('click', onClick);

  return node;
};

const focusedId = (): string | null =>
  new URLSearchParams(window.location.search).get('focus');

const buildGlobalControls = (controller: WorkbenchController): HTMLElement => {
  const section = el('section', 'wb-global');

  section.append(el('h1', undefined, 'Character Workbench'));

  if (focusedId()) {
    const back = el('a', 'wb-focus-link', '← 返回全部角色');

    back.href = 'workbench.html';
    section.append(back);
  }
  section.append(
    el(
      'p',
      'wb-hint',
      '画面里的每个角色都由游戏运行时的 sim + renderer 驱动;移动鼠标即为“玩家位置”,所有角色的注视/瞄准会实时跟随。'
    )
  );

  const controls = el('div', 'wb-toolbar');
  const speeds: Array<[string, number]> = [
    ['暂停', 0],
    ['0.25x', 0.25],
    ['1x', 1]
  ];
  const speedButtons: HTMLButtonElement[] = [];

  for (const [label, factor] of speeds) {
    const node = button(label, () => {
      controller.setSpeed(factor);

      for (const other of speedButtons) {
        other.classList.toggle('active', other === node);
      }
    });

    if (factor === 1) {
      node.classList.add('active');
    }

    speedButtons.push(node);
    controls.append(node);
  }

  controls.append(button('全部重生', () => controller.respawnAll()));
  section.append(controls);

  return section;
};

const buildSlotCard = (slot: WorkbenchSlotHandle): HTMLElement => {
  const card = el('article', 'wb-card');
  const header = el('header', 'wb-card-header');
  const title = el('h2');
  const titleLink = el('a', 'wb-focus-link', slot.label);

  titleLink.href = `workbench.html?focus=${slot.id}`;
  titleLink.title = '单独查看这个角色';
  title.append(titleLink);

  const statusChip = el('span', 'wb-chip', '…');

  header.append(title, statusChip);
  card.append(header);

  const qcLine = el('p', 'wb-qc', 'QC: 未运行 tools/qc_characters.py');

  card.append(qcLine);

  const actions = el('div', 'wb-actions');

  if (slot.kind === 'enemy') {
    actions.append(
      button('受击', () => slot.hit()),
      button('击杀', () => slot.kill()),
      button('重生', () => slot.respawn())
    );

    for (const action of slot.actions ?? []) {
      actions.append(button(action.label, action.run));
    }
  } else {
    actions.append(
      button('受击', () => slot.hit()),
      button('翻滚', () => slot.dodge?.())
    );

    if (slot.toggleFiring) {
      const firing = button('射箭:开', () => {
        firing.textContent = slot.toggleFiring?.() ? '射箭:开' : '射箭:关';
      });

      actions.append(firing);
    }

    if (slot.togglePatrol) {
      const patrol = button('巡逻:开', () => {
        patrol.textContent = slot.togglePatrol?.() ? '巡逻:开' : '巡逻:关';
      });

      actions.append(patrol);
    }
  }

  const tunables = getTunableRigs(slot.id);

  if (tunables.length > 0) {
    const editorHost = el('div', 'wb-rig-host');
    let built = false;
    const toggle = button('调参', () => {
      if (!built) {
        for (const tunable of tunables) {
          buildRigEditor(editorHost, tunable, () => slot.respawn());
        }

        built = true;
      }

      editorHost.classList.toggle('open');
    });

    actions.append(toggle);
    card.append(actions);
    card.append(editorHost);
  } else {
    card.append(actions);
  }

  if (focusedId()) {
    for (const tunable of tunables) {
      buildFaceEditor(card, tunable, () => slot.respawn());
    }
  }

  if (tunables.length > 0) {
    const expressions = el('details', 'wb-expressions');
    const expressionsSummary = el('summary', undefined, '表情预览(静态,与实机同一套几何)');
    let expressionsBuilt = false;

    expressions.append(expressionsSummary);
    expressions.addEventListener('toggle', () => {
      if (expressions.open && !expressionsBuilt) {
        for (const tunable of tunables) {
          buildExpressionPreview(expressions, tunable);
        }

        expressionsBuilt = true;
      }
    });

    if (focusedId()) {
      for (const tunable of tunables) {
        buildExpressionPreview(expressions, tunable);
      }

      expressionsBuilt = true;
      expressions.open = true;
    }

    card.append(expressions);
  }

  const comparison = el('details', 'wb-comparison');
  const comparisonSummary = el('summary', undefined, '对比图(参考 vs 已验收)');
  const comparisonImage = document.createElement('img');

  comparisonImage.loading = 'lazy';
  comparisonImage.src = `/assets/characters/${slot.id}/comparison.png`;
  comparisonImage.addEventListener('error', () => comparison.remove());
  comparison.append(comparisonSummary, comparisonImage);
  card.append(comparison);

  const openItems = el('ul', 'wb-open-items');
  const note = el('div', 'wb-note');
  const noteInput = el('textarea', 'wb-note-input');

  noteInput.rows = 2;
  noteInput.placeholder = '评审意见:哪里不对、想要什么感觉…(暂存 review-inbox,不进 brief)';

  const noteStatus = el('span', 'wb-rig-status');
  const noteFooter = el('div', 'wb-note-footer');
  const noteLog = el('ul', 'wb-note-log');

  noteFooter.append(
    button('记录意见', () => {
      const text = noteInput.value.trim();

      if (!text) {
        return;
      }

      noteStatus.textContent = '保存中…';
      void fetch(`/__studio/note/${slot.id}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: text })
      })
        .then(async (response) => {
          const result = (await response.json()) as { ok: boolean; entry?: string; error?: string };

          if (result.ok && result.entry) {
            noteLog.append(el('li', undefined, text));
            noteInput.value = '';
            noteStatus.textContent = '已暂存到 review-inbox';
          } else {
            noteStatus.textContent = `失败: ${result.error}`;
          }
        })
        .catch((error) => {
          noteStatus.textContent = `失败: ${String(error)}`;
        });
    }),
    noteStatus
  );
  note.append(noteInput, noteFooter, noteLog);
  card.append(note, openItems);

  void fetchCharacterBrief(slot.id).then((brief) => {
    statusChip.textContent = brief.status;
    statusChip.style.color = STATUS_COLORS[brief.status] ?? STATUS_COLORS.unknown;

    for (const item of brief.openItems) {
      openItems.append(el('li', undefined, item));
    }
  });

  return card;
};

const buildTemplateSection = (): HTMLElement => {
  const section = el('details', 'wb-expressions wb-template-sheet');
  const summary = el('summary', undefined, '眼睛模板(唯一共享资产 standard,两种眼窝验证)');

  section.append(summary);
  buildTemplateSheet(section);

  const note = el('div', 'wb-note');
  const noteInput = el('textarea', 'wb-note-input');

  noteInput.rows = 2;
  noteInput.placeholder = '对眼睛模板本身的意见(暂存 review-inbox,不进代码)';

  const noteStatus = el('span', 'wb-rig-status');
  const noteFooter = el('div', 'wb-note-footer');

  noteFooter.append(
    button('记录意见', () => {
      const text = noteInput.value.trim();

      if (!text) {
        return;
      }

      noteStatus.textContent = '保存中…';
      void fetch('/__studio/note/eye-templates', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ note: text })
      })
        .then(async (response) => {
          const result = (await response.json()) as { ok: boolean; error?: string };

          noteStatus.textContent = result.ok ? '已暂存到 review-inbox' : `失败: ${result.error}`;

          if (result.ok) {
            noteInput.value = '';
          }
        })
        .catch((error) => {
          noteStatus.textContent = `失败: ${String(error)}`;
        });
    }),
    noteStatus
  );
  note.append(noteInput, noteFooter);
  section.append(note);

  return section;
};

export const buildPanel = (root: HTMLElement, controller: WorkbenchController) => {
  root.replaceChildren();
  root.append(buildGlobalControls(controller));

  if (!focusedId()) {
    root.append(buildTemplateSection());
  }

  const cards = new Map<string, HTMLElement>();

  for (const slot of controller.slots) {
    const card = buildSlotCard(slot);

    cards.set(slot.id, card);
    root.append(card);
  }

  void fetchQcReport().then((report) => {
    if (!report) {
      return;
    }

    for (const slot of controller.slots) {
      const info = report.characters[slot.id];
      const card = cards.get(slot.id);
      const qcLine = card?.querySelector('.wb-qc');

      if (!qcLine) {
        continue;
      }

      if (!info) {
        qcLine.textContent = 'QC: 报告中无此角色';
        continue;
      }

      if (info.errors.length > 0) {
        qcLine.textContent = `QC: ${info.errors.length} 错误 / ${info.warnings.length} 警告`;
        qcLine.classList.add('wb-qc-error');

        const detail = document.createElement('ul');

        detail.className = 'wb-qc-detail';

        for (const message of [...info.errors, ...info.warnings]) {
          const item = document.createElement('li');

          item.textContent = message;
          detail.append(item);
        }

        qcLine.after(detail);
      } else if (info.warnings.length > 0) {
        qcLine.textContent = `QC: 通过,${info.warnings.length} 警告`;
        qcLine.classList.add('wb-qc-warn');
      } else {
        qcLine.textContent = 'QC: 通过';
        qcLine.classList.add('wb-qc-ok');
      }
    }
  });
};
