import Phaser from 'phaser';

export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super('PlaceholderScene');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#111722');

    const graphics = this.add.graphics();
    graphics.fillStyle(0x1a2330, 1);
    graphics.fillRoundedRect(64, 48, width - 128, height - 96, 24);
    graphics.lineStyle(2, 0x3d526c, 1);
    graphics.strokeRoundedRect(64, 48, width - 128, height - 96, 24);

    graphics.lineStyle(1, 0x2c3a4e, 0.8);
    for (let x = 96; x <= width - 96; x += 48) {
      graphics.lineBetween(x, 80, x, height - 80);
    }
    for (let y = 80; y <= height - 80; y += 48) {
      graphics.lineBetween(96, y, width - 96, y);
    }

    this.add
      .text(centerX, centerY - 22, 'Bowbert', {
        color: '#f8f1dc',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '54px',
        fontStyle: '700'
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 36, 'MVP scaffold', {
        color: '#9fb2ca',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '22px'
      })
      .setOrigin(0.5);
  }
}
