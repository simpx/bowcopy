import Phaser from 'phaser';

import { DesktopInputAdapter } from '../../input/DesktopInputAdapter';
import { InputController } from '../../input/InputController';
import type { InputSnapshot, InputVector } from '../../input/types';
import { TouchInputOverlay } from '../../ui/TouchInputOverlay';

const DEBUG_PLAYER_RADIUS = 18;
const AIM_ARROW_LENGTH = 116;
const MOVE_ARROW_LENGTH = 72;

export class PlaceholderScene extends Phaser.Scene {
  private readonly inputController = new InputController();
  private desktopInput?: DesktopInputAdapter;
  private touchOverlay?: TouchInputOverlay;
  private debugGraphics?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  private playerPosition: InputVector = { x: 0, y: 0 };
  private dodgePulseMs = 0;

  constructor() {
    super('PlaceholderScene');
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;
    const centerY = height / 2;

    this.cameras.main.setBackgroundColor('#111722');
    this.playerPosition = { x: centerX, y: centerY + 34 };

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
        fontSize: '44px',
        fontStyle: '700'
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 30, 'input debug', {
        color: '#9fb2ca',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        fontSize: '18px'
      })
      .setOrigin(0.5);

    this.debugGraphics = this.add.graphics();
    this.debugText = this.add
      .text(28, 26, '', {
        color: '#b9c7d8',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
        fontSize: '14px',
        lineSpacing: 4
      })
      .setDepth(2);

    this.desktopInput = new DesktopInputAdapter(this, this.inputController, () => this.playerPosition);

    const parent = this.game.canvas.parentElement;

    if (parent) {
      this.touchOverlay = new TouchInputOverlay(parent, this.inputController);
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.disposeInput, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.disposeInput, this);
  }

  update(_time: number, delta: number) {
    this.desktopInput?.update();

    const snapshot = this.inputController.consumeSnapshot();

    if (snapshot.actions.dodge) {
      this.dodgePulseMs = 220;
    }

    this.dodgePulseMs = Math.max(0, this.dodgePulseMs - delta);
    this.drawInputDebug(snapshot);
  }

  private drawInputDebug(snapshot: InputSnapshot) {
    if (!this.debugGraphics || !this.debugText) {
      return;
    }

    this.debugGraphics.clear();
    this.drawPlayerMarker(snapshot);
    this.debugText.setText([
      `move   ${this.formatVector(snapshot.move)}`,
      `aim    ${this.formatVector(snapshot.aim)}`,
      `face   ${this.formatVector(snapshot.facing)}`,
      `fire   ${snapshot.firing ? 'held' : 'idle'}`,
      `dodge  ${this.dodgePulseMs > 0 ? 'pulse' : 'idle'}`,
      `source ${snapshot.source}`
    ]);
  }

  private drawPlayerMarker(snapshot: InputSnapshot) {
    const graphics = this.debugGraphics;

    if (!graphics) {
      return;
    }

    const { x, y } = this.playerPosition;
    const facing = this.vectorLength(snapshot.aim) > 0 ? snapshot.aim : snapshot.facing;

    graphics.fillStyle(0xf8f1dc, 1);
    graphics.fillCircle(x, y, DEBUG_PLAYER_RADIUS);
    graphics.lineStyle(3, snapshot.firing ? 0xffcf5c : 0x8fd3ff, 1);
    this.drawArrow(x, y, facing, AIM_ARROW_LENGTH);

    if (this.vectorLength(snapshot.move) > 0) {
      graphics.lineStyle(4, 0x5ce1b9, 0.95);
      this.drawArrow(x, y, snapshot.move, MOVE_ARROW_LENGTH * this.vectorLength(snapshot.move));
    }

    if (this.dodgePulseMs > 0) {
      const progress = this.dodgePulseMs / 220;
      graphics.lineStyle(3, 0xffffff, progress);
      graphics.strokeCircle(x, y, DEBUG_PLAYER_RADIUS + (1 - progress) * 34);
    }
  }

  private drawArrow(originX: number, originY: number, vector: InputVector, length: number) {
    const graphics = this.debugGraphics;

    if (!graphics || this.vectorLength(vector) === 0) {
      return;
    }

    const endX = originX + vector.x * length;
    const endY = originY + vector.y * length;
    const angle = Math.atan2(vector.y, vector.x);
    const headLength = 13;
    const leftAngle = angle + Math.PI * 0.78;
    const rightAngle = angle - Math.PI * 0.78;

    graphics.lineBetween(originX, originY, endX, endY);
    graphics.lineBetween(endX, endY, endX + Math.cos(leftAngle) * headLength, endY + Math.sin(leftAngle) * headLength);
    graphics.lineBetween(endX, endY, endX + Math.cos(rightAngle) * headLength, endY + Math.sin(rightAngle) * headLength);
  }

  private formatVector(vector: InputVector) {
    return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}`;
  }

  private vectorLength(vector: InputVector) {
    return Math.hypot(vector.x, vector.y);
  }

  private disposeInput() {
    this.desktopInput?.dispose();
    this.desktopInput = undefined;
    this.touchOverlay?.dispose();
    this.touchOverlay = undefined;
  }
}
