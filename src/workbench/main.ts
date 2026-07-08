import './workbench.css';

import Phaser from 'phaser';

import { buildPanel } from './panel';
import { WORKBENCH_SIZE, WorkbenchScene } from './WorkbenchScene';

const stage = document.querySelector<HTMLDivElement>('#workbench-stage');
const panel = document.querySelector<HTMLElement>('#workbench-panel');

if (!stage || !panel) {
  throw new Error('Missing workbench mount elements.');
}

const scene = new WorkbenchScene((controller) => buildPanel(panel, controller));

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: stage,
  backgroundColor: '#0b120d',
  width: WORKBENCH_SIZE.width,
  height: WORKBENCH_SIZE.height,
  scene: [scene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WORKBENCH_SIZE.width,
    height: WORKBENCH_SIZE.height
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
