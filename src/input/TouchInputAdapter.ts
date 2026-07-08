import Phaser from 'phaser';

import { InputController } from './InputController';

/**
 * Twin-stick touch input: the left half of the screen is a floating move
 * stick (anchors where the finger lands), the right half is a floating aim
 * stick that also fires while pushed past the fire threshold. A dedicated
 * dodge button sits above the aim area. Only reacts to touch pointers, so it
 * coexists with DesktopInputAdapter (which only reads the mouse pointer).
 */

const STICK_RADIUS = 56;
const FIRE_THRESHOLD = 0.35;
const DODGE_BUTTON_RADIUS = 34;
const DODGE_MARGIN_X = 64;
const DODGE_MARGIN_Y = 172;
const UI_DEPTH = 5000;
const UI_COLOR = 0xf7f1d0;
const ACCENT_COLOR = 0xffd75d;

interface StickState {
  pointerId: number;
  originX: number;
  originY: number;
  x: number;
  y: number;
}

export class TouchInputAdapter {
  private moveStick: StickState | null = null;
  private aimStick: StickState | null = null;
  private readonly graphics?: Phaser.GameObjects.Graphics;
  private readonly enabled: boolean;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: InputController
  ) {
    this.enabled = scene.sys.game.device.input.touch;

    if (!this.enabled) {
      return;
    }

    // mouse + 3 touch points (two sticks and the dodge button).
    scene.input.addPointer(3);
    this.graphics = scene.add.graphics().setScrollFactor(0).setDepth(UI_DEPTH);

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleDown);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handleMove);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.handleUp);
  }

  update() {
    if (!this.enabled || !this.graphics) {
      return;
    }

    this.drawUi(this.graphics);
  }

  dispose() {
    if (!this.enabled) {
      return;
    }

    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleDown);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handleMove);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.handleUp);
    this.graphics?.destroy();
  }

  private dodgeButtonCenter(): { x: number; y: number } {
    return {
      x: this.scene.scale.width - DODGE_MARGIN_X,
      y: this.scene.scale.height - DODGE_MARGIN_Y
    };
  }

  private readonly handleDown = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) {
      return;
    }

    const dodge = this.dodgeButtonCenter();

    if (Math.hypot(pointer.x - dodge.x, pointer.y - dodge.y) <= DODGE_BUTTON_RADIUS + 14) {
      this.input.emitDodge('touch');
      return;
    }

    const stick: StickState = {
      pointerId: pointer.id,
      originX: pointer.x,
      originY: pointer.y,
      x: pointer.x,
      y: pointer.y
    };

    if (pointer.x < this.scene.scale.width / 2) {
      if (!this.moveStick) {
        this.moveStick = stick;
      }
    } else if (!this.aimStick) {
      this.aimStick = stick;
    }
  };

  private readonly handleMove = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) {
      return;
    }

    if (this.moveStick?.pointerId === pointer.id) {
      this.moveStick.x = pointer.x;
      this.moveStick.y = pointer.y;
      this.input.setMoveVector(this.stickVector(this.moveStick), 'touch');
    }

    if (this.aimStick?.pointerId === pointer.id) {
      this.aimStick.x = pointer.x;
      this.aimStick.y = pointer.y;
      this.applyAim();
    }
  };

  private readonly handleUp = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) {
      return;
    }

    if (this.moveStick?.pointerId === pointer.id) {
      this.moveStick = null;
      this.input.setMoveVector({ x: 0, y: 0 }, 'touch');
    }

    if (this.aimStick?.pointerId === pointer.id) {
      this.aimStick = null;
      this.input.releaseAim('touch');
    }
  };

  private stickVector(stick: StickState): { x: number; y: number } {
    return {
      x: (stick.x - stick.originX) / STICK_RADIUS,
      y: (stick.y - stick.originY) / STICK_RADIUS
    };
  }

  private applyAim() {
    if (!this.aimStick) {
      return;
    }

    const vector = this.stickVector(this.aimStick);
    const strength = Math.hypot(vector.x, vector.y);

    this.input.setAimVector(vector, 'touch');
    this.input.setFiring(strength >= FIRE_THRESHOLD, 'touch');
  }

  private drawUi(graphics: Phaser.GameObjects.Graphics) {
    graphics.clear();

    for (const stick of [this.moveStick, this.aimStick]) {
      if (!stick) {
        continue;
      }

      const vector = this.stickVector(stick);
      const length = Math.hypot(vector.x, vector.y);
      const clamp = length > 1 ? 1 / length : 1;
      const knobX = stick.originX + vector.x * clamp * STICK_RADIUS;
      const knobY = stick.originY + vector.y * clamp * STICK_RADIUS;

      graphics.lineStyle(2, UI_COLOR, 0.35);
      graphics.strokeCircle(stick.originX, stick.originY, STICK_RADIUS);
      graphics.fillStyle(UI_COLOR, 0.28);
      graphics.fillCircle(knobX, knobY, 22);
    }

    const dodge = this.dodgeButtonCenter();

    graphics.lineStyle(2, ACCENT_COLOR, 0.4);
    graphics.strokeCircle(dodge.x, dodge.y, DODGE_BUTTON_RADIUS);
    graphics.fillStyle(ACCENT_COLOR, 0.14);
    graphics.fillCircle(dodge.x, dodge.y, DODGE_BUTTON_RADIUS);
    graphics.lineStyle(3, ACCENT_COLOR, 0.7);
    graphics.beginPath();
    graphics.arc(dodge.x, dodge.y, DODGE_BUTTON_RADIUS * 0.5, Math.PI * 0.15, Math.PI * 1.6);
    graphics.strokePath();
  }
}
