import Phaser from 'phaser';

import { preloadDartGooberAssets } from '../render/enemies/DartGooberRenderer';
import { preloadDartTriGooberAssets } from '../render/enemies/DartTriGooberRenderer';
import { preloadKaboomletAssets } from '../render/enemies/KaboomletRenderer';
import { preloadRedShroomAssets } from '../render/enemies/RedShroomRenderer';
import { preloadSlimeAssets } from '../render/enemies/SlimeRenderer';
import { preloadSpooperGooperAssets } from '../render/enemies/SpooperGooperRenderer';
import { CombatFeedbackRenderer } from '../render/feedback';
import { preloadBowbertPlayerAssets } from '../render/player/BowbertRenderer';
import {
  preloadArrowProjectileAssets,
  preloadEnemyDartProjectileAssets,
  preloadShroomSporeProjectileAssets
} from '../render/projectiles';
import type { SimVector } from '../sim/player';
import { preloadDisplaySlotAssets } from './displaySlot';
import { createWorkbenchSlots, type WorkbenchCell, type WorkbenchSlot } from './slots';

export interface WorkbenchGrid {
  readonly columns: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
}

const DEFAULT_GRID: WorkbenchGrid = {
  columns: 4,
  cellWidth: 380,
  cellHeight: 340
};

const FOCUS_GRID: WorkbenchGrid = {
  columns: 1,
  cellWidth: 640,
  cellHeight: 520
};

export const getWorkbenchGrid = (focusId: string | undefined): WorkbenchGrid =>
  focusId ? FOCUS_GRID : DEFAULT_GRID;

export const getWorkbenchSize = (grid: WorkbenchGrid, slotCount: number) => ({
  width: grid.columns * grid.cellWidth,
  height: Math.ceil(slotCount / grid.columns) * grid.cellHeight
});

const CELL_BORDER = 22;

export interface WorkbenchSlotHandle {
  readonly id: string;
  readonly label: string;
  readonly kind: 'player' | 'enemy';
  hit(): void;
  kill(): void;
  respawn(): void;
  aliveCount(): number;
  toggleFiring?(): boolean;
  togglePatrol?(): boolean;
  dodge?(): void;
}

export interface WorkbenchController {
  readonly slots: readonly WorkbenchSlotHandle[];
  setSpeed(factor: number): void;
  getSpeed(): number;
  respawnAll(): void;
}

export class WorkbenchScene extends Phaser.Scene {
  private slots: WorkbenchSlot[] = [];
  private feedback?: CombatFeedbackRenderer;
  private targetMarker?: Phaser.GameObjects.Graphics;
  private simTimeMs = 0;
  private speedFactor = 1;
  private pointerSeen = false;
  private readonly grid: WorkbenchGrid;

  constructor(
    private readonly onReady: (controller: WorkbenchController) => void,
    private readonly focusId?: string
  ) {
    super('WorkbenchScene');
    this.grid = getWorkbenchGrid(focusId);
  }

  preload() {
    preloadBowbertPlayerAssets(this);
    preloadArrowProjectileAssets(this);
    preloadEnemyDartProjectileAssets(this);
    preloadShroomSporeProjectileAssets(this);
    preloadDartGooberAssets(this);
    preloadDartTriGooberAssets(this);
    preloadRedShroomAssets(this);
    preloadKaboomletAssets(this);
    preloadSlimeAssets(this);
    preloadSpooperGooperAssets(this);
    preloadDisplaySlotAssets(this);
  }

  create() {
    this.cameras.main.setBackgroundColor('#0b120d');
    this.cameras.main.setRoundPixels(true);

    this.slots = createWorkbenchSlots().filter(
      (slot) => !this.focusId || slot.id === this.focusId
    );
    this.drawCellFrames();

    this.feedback = new CombatFeedbackRenderer(this);
    this.feedback.create();

    this.slots.forEach((slot, index) => {
      slot.create(this, this.getCell(index), this.feedback as CombatFeedbackRenderer);
    });

    this.targetMarker = this.add.graphics().setDepth(400);

    // On touch devices there is no hovering mouse; until the first real
    // pointer event, aim the slots at the stage center instead of (0, 0).
    this.input.once(Phaser.Input.Events.POINTER_MOVE, () => {
      this.pointerSeen = true;
    });
    this.input.once(Phaser.Input.Events.POINTER_DOWN, () => {
      this.pointerSeen = true;
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.disposeSlots());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.disposeSlots());

    this.onReady(this.buildController());
  }

  update(_time: number, delta: number) {
    const scaledDelta = delta * this.speedFactor;

    if (scaledDelta <= 0) {
      return;
    }

    this.simTimeMs += scaledDelta;

    const pointer = this.input.activePointer;
    const target: SimVector = this.pointerSeen
      ? this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      : { x: this.scale.width / 2, y: this.scale.height * 0.6 };

    for (const slot of this.slots) {
      slot.update(this.simTimeMs, scaledDelta, target);
    }

    this.feedback?.update(scaledDelta);
    this.drawTargetMarker(target);
  }

  private buildController(): WorkbenchController {
    const handles: WorkbenchSlotHandle[] = this.slots.map((slot) => ({
      id: slot.id,
      label: slot.label,
      kind: slot.kind,
      hit: () => slot.hit(1),
      kill: () => slot.hit(999),
      respawn: () => slot.start(),
      aliveCount: () => slot.aliveCount(),
      toggleFiring: slot.toggleFiring?.bind(slot),
      togglePatrol: slot.togglePatrol?.bind(slot),
      dodge: slot.dodge?.bind(slot)
    }));

    return {
      slots: handles,
      setSpeed: (factor: number) => {
        this.speedFactor = Math.max(0, factor);
      },
      getSpeed: () => this.speedFactor,
      respawnAll: () => {
        for (const slot of this.slots) {
          slot.start();
        }
      }
    };
  }

  private getCell(index: number): WorkbenchCell {
    const column = index % this.grid.columns;
    const row = Math.floor(index / this.grid.columns);
    const x = column * this.grid.cellWidth;
    const y = row * this.grid.cellHeight;
    const bounds = {
      x,
      y,
      width: this.grid.cellWidth,
      height: this.grid.cellHeight,
      border: CELL_BORDER
    };
    const center = {
      x: x + this.grid.cellWidth / 2,
      y: y + this.grid.cellHeight / 2
    };

    return {
      bounds,
      center,
      spawnPoints: [
        { id: `${index}-a`, x: center.x - 90, y: center.y - 40 },
        { id: `${index}-b`, x: center.x + 90, y: center.y - 40 },
        { id: `${index}-c`, x: center.x, y: center.y + 70 }
      ]
    };
  }

  private drawCellFrames() {
    const frame = this.add.graphics().setDepth(2);

    this.slots.forEach((slot, index) => {
      const cell = this.getCell(index);

      frame.lineStyle(2, 0x2e4a37, 1);
      frame.strokeRect(
        cell.bounds.x + 6,
        cell.bounds.y + 6,
        cell.bounds.width - 12,
        cell.bounds.height - 12
      );

      this.add
        .text(cell.bounds.x + 16, cell.bounds.y + 12, slot.label, {
          fontFamily: 'monospace',
          fontSize: '15px',
          color: '#b8c8ae'
        })
        .setDepth(3);
    });
  }

  private drawTargetMarker(target: SimVector) {
    const marker = this.targetMarker;

    if (!marker) {
      return;
    }

    marker.clear();
    marker.lineStyle(2, 0xffd75d, 0.85);
    marker.strokeCircle(target.x, target.y, 9);
    marker.lineBetween(target.x - 14, target.y, target.x - 4, target.y);
    marker.lineBetween(target.x + 4, target.y, target.x + 14, target.y);
    marker.lineBetween(target.x, target.y - 14, target.x, target.y - 4);
    marker.lineBetween(target.x, target.y + 4, target.x, target.y + 14);
  }

  private disposeSlots() {
    for (const slot of this.slots) {
      slot.destroy();
    }

    this.slots = [];
    this.feedback?.destroy();
    this.feedback = undefined;
  }
}
