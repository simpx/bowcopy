import { fetchCharacterBrief, fetchQcReport } from './characterInfo';
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

const buildGlobalControls = (controller: WorkbenchController): HTMLElement => {
  const section = el('section', 'wb-global');

  section.append(el('h1', undefined, 'Character Workbench'));
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
  const title = el('h2', undefined, slot.label);
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

  const openItems = el('ul', 'wb-open-items');

  card.append(openItems);

  void fetchCharacterBrief(slot.id).then((brief) => {
    statusChip.textContent = brief.status;
    statusChip.style.color = STATUS_COLORS[brief.status] ?? STATUS_COLORS.unknown;

    for (const item of brief.openItems) {
      openItems.append(el('li', undefined, item));
    }
  });

  return card;
};

export const buildPanel = (root: HTMLElement, controller: WorkbenchController) => {
  root.replaceChildren();
  root.append(buildGlobalControls(controller));

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
