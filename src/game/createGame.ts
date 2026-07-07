import Phaser from 'phaser';

import { gameConfig } from './config';

type BowbertDebugWindow = Window & {
  __bowbertGame?: Phaser.Game;
};

export const createGame = () => {
  const game = new Phaser.Game(gameConfig);

  if (import.meta.env.DEV) {
    (window as BowbertDebugWindow).__bowbertGame = game;
  }

  return game;
};
