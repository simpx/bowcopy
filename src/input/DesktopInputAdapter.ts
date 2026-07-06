import Phaser from 'phaser';

import { InputController } from './InputController';
import type { InputVector } from './types';

type DesktopKeys = {
  readonly w: Phaser.Input.Keyboard.Key;
  readonly a: Phaser.Input.Keyboard.Key;
  readonly s: Phaser.Input.Keyboard.Key;
  readonly d: Phaser.Input.Keyboard.Key;
  readonly space: Phaser.Input.Keyboard.Key;
};

export class DesktopInputAdapter {
  private readonly keys?: DesktopKeys;
  private pointerIsKnown = false;
  private desktopMoveWasActive = false;
  private desktopFireWasActive = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly input: InputController,
    private readonly getAimOrigin: () => InputVector
  ) {
    const keyboard = scene.input.keyboard;

    if (keyboard) {
      this.keys = {
        w: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        a: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        s: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        d: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
        space: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
      };
    }

    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerKnown);
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerKnown);
  }

  update() {
    this.updateKeyboardMove();
    this.updateMouseAimAndFire();
    this.updateDodge();
  }

  dispose() {
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerKnown);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerKnown);
  }

  private readonly handlePointerKnown = (pointer: Phaser.Input.Pointer) => {
    if (pointer !== this.scene.input.mousePointer) {
      return;
    }

    this.pointerIsKnown = true;
  };

  private updateKeyboardMove() {
    if (!this.keys) {
      return;
    }

    const move = {
      x: Number(this.keys.d.isDown) - Number(this.keys.a.isDown),
      y: Number(this.keys.s.isDown) - Number(this.keys.w.isDown)
    };
    const hasMove = move.x !== 0 || move.y !== 0;

    if (hasMove || this.desktopMoveWasActive) {
      this.input.setMoveVector(move, 'desktop');
    }

    this.desktopMoveWasActive = hasMove;
  }

  private updateMouseAimAndFire() {
    const pointer = this.scene.input.mousePointer;

    if (!pointer || !this.pointerIsKnown) {
      return;
    }

    const origin = this.getAimOrigin();

    this.input.setAimVector(
      {
        x: pointer.worldX - origin.x,
        y: pointer.worldY - origin.y
      },
      'desktop'
    );

    const firing = pointer.leftButtonDown();

    if (firing || this.desktopFireWasActive) {
      this.input.setFiring(firing, 'desktop');
    }

    this.desktopFireWasActive = firing;
  }

  private updateDodge() {
    if (this.keys && Phaser.Input.Keyboard.JustDown(this.keys.space)) {
      this.input.emitDodge('desktop');
    }
  }
}
