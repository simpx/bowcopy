import Phaser from 'phaser';

import {
  clearCombatRoom,
  createInitialCombatRoomState,
  referenceCombatRoom,
  startCombatFromTrigger,
  type CombatRoomState
} from '../../sim/rooms';
import { CombatRoomRenderer, preloadCombatRoomAssets } from '../../render/rooms';

export class CombatRoomScene extends Phaser.Scene {
  private roomRenderer?: CombatRoomRenderer;
  private roomState: CombatRoomState = createInitialCombatRoomState();
  private triggerProbe?: Phaser.GameObjects.Arc;

  constructor() {
    super('CombatRoomScene');
  }

  preload() {
    preloadCombatRoomAssets(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b120d');
    this.cameras.main.setRoundPixels(false);

    this.roomState = createInitialCombatRoomState();
    this.roomRenderer = new CombatRoomRenderer(this, referenceCombatRoom);
    this.roomRenderer.create();
    this.applyRoomState(this.roomState);
    this.createTriggerProbe();
    this.time.delayedCall(650, () => this.moveProbeIntoTrigger());
  }

  private createTriggerProbe() {
    const { trigger } = referenceCombatRoom;

    this.triggerProbe = this.add
      .circle(trigger.x - 54, trigger.y + 126, 4, 0xf6fff3, 0.94)
      .setStrokeStyle(2, 0xf6fff3, 0.72)
      .setDepth(40);
  }

  private moveProbeIntoTrigger() {
    const { trigger } = referenceCombatRoom;

    if (!this.triggerProbe) {
      return;
    }

    this.tweens.add({
      targets: this.triggerProbe,
      x: trigger.x,
      y: trigger.y,
      duration: 900,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.applyRoomState(
          startCombatFromTrigger(referenceCombatRoom, this.roomState, {
            x: trigger.x,
            y: trigger.y
          })
        );
        this.time.delayedCall(1750, () => this.applyRoomState(clearCombatRoom(this.roomState)));
      }
    });
  }

  private applyRoomState(state: CombatRoomState) {
    this.roomState = state;
    this.roomRenderer?.setState(this.roomState);
  }
}
