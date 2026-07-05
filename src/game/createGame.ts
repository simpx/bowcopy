import Phaser from 'phaser';

import { gameConfig } from './config';

export const createGame = () => new Phaser.Game(gameConfig);
