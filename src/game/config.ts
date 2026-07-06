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
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.NO_CENTER,
    width: GAME_SIZE.width,
    height: GAME_SIZE.height
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true
  }
};
