import './workbench.css';

import Phaser from 'phaser';

import { buildPanel } from './panel';
import { createWorkbenchSlots } from './slots';
import {
  getWorkbenchGrid,
  getWorkbenchSize,
  WorkbenchScene,
  type WorkbenchController
} from './WorkbenchScene';

const stage = document.querySelector<HTMLDivElement>('#workbench-stage');
const panel = document.querySelector<HTMLElement>('#workbench-panel');

if (!stage || !panel) {
  throw new Error('Missing workbench mount elements.');
}

const params = new URLSearchParams(window.location.search);
const focusId = params.get('focus') ?? undefined;
const grid = getWorkbenchGrid(focusId);
const slotCount = focusId ? 1 : createWorkbenchSlots().length;
const size = getWorkbenchSize(grid, slotCount);

/**
 * Automation hooks for tools/capture_states.mjs and agent-driven review.
 * Everything routes through the same controller the human panel uses.
 */
const exposeAutomationHooks = (controller: WorkbenchController) => {
  const find = (id: string) => controller.slots.find((slot) => slot.id === id);

  (window as unknown as { __workbench: unknown }).__workbench = {
    ready: true,
    slotIds: controller.slots.map((slot) => slot.id),
    hit: (id: string) => find(id)?.hit(),
    kill: (id: string) => find(id)?.kill(),
    respawn: (id: string) => find(id)?.respawn(),
    dodge: (id: string) => find(id)?.dodge?.(),
    aliveCount: (id: string) => find(id)?.aliveCount() ?? 0,
    setSpeed: (factor: number) => controller.setSpeed(factor)
  };
};

const scene = new WorkbenchScene((controller) => {
  buildPanel(panel, controller);
  exposeAutomationHooks(controller);
}, focusId);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: '#0b120d',
  width: size.width,
  height: size.height,
  scene: [scene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: size.width,
    height: size.height
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  }
});

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
