import Phaser from 'phaser';

import { GAME_BACKGROUND_COLOR, GAME_PARENT_ID, GAME_SIZE } from './constants';
import { scenes } from './scenes';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: GAME_PARENT_ID,
  backgroundColor: GAME_BACKGROUND_COLOR,
  width: GAME_SIZE.width,
  height: GAME_SIZE.height,
  scene: scenes,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_SIZE.width,
    height: GAME_SIZE.height
  },
  render: {
    antialias: true,
    pixelArt: false
  }
};
