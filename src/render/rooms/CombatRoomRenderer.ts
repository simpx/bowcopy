import Phaser from 'phaser';

import type {
  CombatRoomDefinition,
  CombatRoomState,
  FloorMark,
  RoomDoor,
  RoomDoorSide
} from '../../sim/rooms';
import { areCombatRoomDoorsOpen } from '../../sim/rooms';

const FLOOR_COLOR = 0x3d6447;
const FLOOR_SHADOW = 0x14251c;
const FLOOR_GRASS = 0x243e2f;
const FLOOR_GRASS_SOFT = 0x6e8c62;
const FLOOR_STONE = 0x7c8372;
const FLOOR_SCUFF = 0x79392f;
const FLOOR_WOOD = 0x6f4a32;
const FLOOR_WOOD_DARK = 0x241811;
const FLOOR_MUSHROOM_CAP = 0xa94842;
const FLOOR_MUSHROOM_STEM = 0xc2b38b;
const WALL_DARK = 0x020503;
const WALL_MAIN = 0x07140e;
const WALL_EDGE = 0x1d3525;
const DOOR_OPEN = 0x2f553a;
const DOOR_CLEARED = 0x406b48;
const SPAWN_IDLE = 0x7fa46a;
const TRIGGER_IDLE = 0x8dab76;

interface Segment {
  readonly start: number;
  readonly end: number;
}

type FloorPropKind = 'stump' | 'stone' | 'mushroom';

interface FloorProp {
  readonly kind: FloorPropKind;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
}

const FLOOR_PROPS: readonly FloorProp[] = [
  { kind: 'stone', x: 214, y: 162, scale: 0.72, rotation: -0.08 },
  { kind: 'stump', x: 1056, y: 210, scale: 0.68, rotation: 0.04 },
  { kind: 'mushroom', x: 186, y: 492, scale: 0.62, rotation: -0.08 },
  { kind: 'stone', x: 724, y: 126, scale: 0.52, rotation: 0.1 },
  { kind: 'mushroom', x: 1004, y: 524, scale: 0.58, rotation: 0.06 },
  { kind: 'stump', x: 392, y: 610, scale: 0.52, rotation: -0.05 }
] as const;

export const preloadCombatRoomAssets = (_scene: Phaser.Scene) => {};

export class CombatRoomRenderer {
  private baseGraphics?: Phaser.GameObjects.Graphics;
  private doorGraphics?: Phaser.GameObjects.Graphics;
  private spawnGraphics?: Phaser.GameObjects.Graphics;
  private triggerGraphics?: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly room: CombatRoomDefinition
  ) {}

  create() {
    const { bounds } = this.room;

    this.scene.add
      .rectangle(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        bounds.width,
        bounds.height,
        FLOOR_COLOR
      )
      .setDepth(0);
    this.drawSimpleFloorDetails();

    this.baseGraphics = this.scene.add.graphics().setDepth(2);
    this.drawFloorMarks();
    this.drawBaseWalls();

    this.triggerGraphics = this.scene.add.graphics().setDepth(20);
    this.spawnGraphics = this.scene.add.graphics().setDepth(21);
    this.doorGraphics = this.scene.add.graphics().setDepth(30);
  }

  setState(state: CombatRoomState) {
    this.drawDoorState(state);
    this.drawTriggerState(state);
    this.drawSpawnState(state);
  }

  private drawFloorMarks() {
    for (const mark of this.room.floorMarks) {
      this.drawFloorMark(mark);
    }
  }

  private drawFloorMark(mark: FloorMark) {
    this.scene.add
      .rectangle(mark.x, mark.y, mark.width, mark.height, FLOOR_SHADOW, mark.alpha)
      .setRotation(mark.rotation)
      .setDepth(3);
  }

  private drawSimpleFloorDetails() {
    const { bounds } = this.room;
    const graphics = this.scene.add.graphics().setDepth(1);
    const left = bounds.x + bounds.border + 34;
    const right = bounds.x + bounds.width - bounds.border - 34;
    const top = bounds.y + bounds.border + 30;
    const bottom = bounds.y + bounds.height - bounds.border - 30;

    for (let y = top; y <= bottom; y += 68) {
      for (let x = left; x <= right; x += 104) {
        const seed = this.getFloorSeed(x, y);

        if (seed < 0.18) {
          continue;
        }

        const detailX = x + (seed - 0.5) * 48;
        const detailY = y + (this.getFloorSeed(y, x) - 0.5) * 34;
        const scale = 0.78 + this.getFloorSeed(x + 31, y - 17) * 0.54;
        const shapeSeed = this.getFloorSeed(x - 43, y + 71);

        if (shapeSeed < 0.46) {
          this.drawVGrassTuft(graphics, detailX, detailY, scale);
        } else if (shapeSeed < 0.72) {
          this.drawWGrassTuft(graphics, detailX, detailY, scale);
        } else if (shapeSeed < 0.9) {
          this.drawSplitGrassTuft(graphics, detailX, detailY, scale);
        } else {
          this.drawTinyGroundDash(graphics, detailX, detailY, scale);
        }

        if (seed > 0.86) {
          this.drawPebble(graphics, detailX + 26, detailY + 7, scale);
        }

        if (seed > 0.94) {
          this.drawScuff(graphics, detailX - 22, detailY + 16, scale);
        }
      }
    }

    this.drawFloorProps(graphics);
  }

  private getFloorSeed(x: number, y: number): number {
    const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;

    return value - Math.floor(value);
  }

  private drawVGrassTuft(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number
  ) {
    const height = 10 * scale;
    const spread = 7 * scale;

    graphics.lineStyle(Math.max(1, Math.round(2 * scale)), FLOOR_GRASS, 0.24);
    graphics.lineBetween(x, y, x - spread, y - height);
    graphics.lineBetween(x + 1 * scale, y, x + spread, y - height * 0.92);

    if (scale > 0.9) {
      graphics.lineStyle(1, FLOOR_GRASS_SOFT, 0.14);
      graphics.lineBetween(x, y - 1, x, y - height * 1.18);
    }
  }

  private drawWGrassTuft(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number
  ) {
    const height = 8 * scale;
    const spread = 6 * scale;

    graphics.lineStyle(Math.max(1, Math.round(2 * scale)), FLOOR_GRASS, 0.22);
    graphics.lineBetween(x - spread * 1.4, y - height * 0.82, x - spread * 0.55, y);
    graphics.lineBetween(x - spread * 0.55, y, x, y - height);
    graphics.lineBetween(x, y - height, x + spread * 0.55, y);
    graphics.lineBetween(x + spread * 0.55, y, x + spread * 1.38, y - height * 0.82);
  }

  private drawSplitGrassTuft(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number
  ) {
    const height = 12 * scale;
    const spread = 7 * scale;

    graphics.lineStyle(Math.max(1, Math.round(2 * scale)), FLOOR_GRASS, 0.2);
    graphics.lineBetween(x, y, x, y - height);
    graphics.lineBetween(x, y - height * 0.5, x - spread, y - height * 0.95);
    graphics.lineBetween(x, y - height * 0.48, x + spread, y - height * 0.9);
  }

  private drawTinyGroundDash(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number
  ) {
    graphics.lineStyle(1, FLOOR_GRASS, 0.16);
    graphics.lineBetween(x - 5 * scale, y, x + 6 * scale, y - 1 * scale);
    graphics.lineBetween(x + 10 * scale, y + 2 * scale, x + 14 * scale, y + 2 * scale);
  }

  private drawPebble(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number
  ) {
    graphics.fillStyle(FLOOR_STONE, 0.2);
    graphics.fillEllipse(x, y, 8 * scale, 4 * scale);
    graphics.fillEllipse(x + 9 * scale, y + 3 * scale, 5 * scale, 3 * scale);
  }

  private drawScuff(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    scale: number
  ) {
    graphics.fillStyle(FLOOR_SCUFF, 0.18);
    graphics.fillEllipse(x, y, 18 * scale, 4 * scale);
    graphics.fillEllipse(x + 16 * scale, y - 2 * scale, 10 * scale, 3 * scale);
  }

  private drawFloorProps(graphics: Phaser.GameObjects.Graphics) {
    for (const prop of FLOOR_PROPS) {
      if (prop.kind === 'stump') {
        this.drawStump(graphics, prop);
      } else if (prop.kind === 'stone') {
        this.drawStoneCluster(graphics, prop);
      } else {
        this.drawMushrooms(graphics, prop);
      }
    }
  }

  private drawStump(graphics: Phaser.GameObjects.Graphics, prop: FloorProp) {
    const { x, y, scale, rotation } = prop;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const px = (offsetX: number, offsetY: number) => ({
      x: x + (offsetX * cos - offsetY * sin) * scale,
      y: y + (offsetX * sin + offsetY * cos) * scale
    });
    const top = px(0, -6);
    const body = px(0, 5);

    graphics.fillStyle(FLOOR_WOOD_DARK, 0.56);
    graphics.fillEllipse(body.x, body.y, 34 * scale, 24 * scale);
    graphics.fillStyle(FLOOR_WOOD, 0.82);
    graphics.fillEllipse(top.x, top.y, 32 * scale, 18 * scale);
    graphics.lineStyle(Math.max(1, Math.round(2 * scale)), FLOOR_WOOD_DARK, 0.46);
    graphics.strokeEllipse(top.x, top.y, 32 * scale, 18 * scale);
    graphics.lineStyle(1, FLOOR_WOOD_DARK, 0.34);
    graphics.strokeEllipse(top.x, top.y, 16 * scale, 8 * scale);
    graphics.lineBetween(top.x - 3 * scale, top.y, top.x + 5 * scale, top.y - 3 * scale);
  }

  private drawStoneCluster(graphics: Phaser.GameObjects.Graphics, prop: FloorProp) {
    const { x, y, scale, rotation } = prop;

    graphics.fillStyle(FLOOR_STONE, 0.28);
    graphics.fillEllipse(x, y, 22 * scale, 12 * scale);
    graphics.fillEllipse(
      x + Math.cos(rotation) * 18 * scale,
      y + Math.sin(rotation) * 8 * scale,
      12 * scale,
      7 * scale
    );
    graphics.fillStyle(FLOOR_SHADOW, 0.12);
    graphics.fillEllipse(x + 1 * scale, y + 4 * scale, 24 * scale, 6 * scale);
  }

  private drawMushrooms(graphics: Phaser.GameObjects.Graphics, prop: FloorProp) {
    const { x, y, scale, rotation } = prop;
    const lean = Math.sin(rotation) * 4 * scale;

    graphics.fillStyle(FLOOR_MUSHROOM_STEM, 0.72);
    graphics.fillRoundedRect(x - 3 * scale + lean, y - 3 * scale, 6 * scale, 12 * scale, 2 * scale);
    graphics.fillRoundedRect(x + 9 * scale + lean, y, 4 * scale, 9 * scale, 2 * scale);
    graphics.fillStyle(FLOOR_MUSHROOM_CAP, 0.82);
    graphics.fillEllipse(x + lean, y - 5 * scale, 18 * scale, 11 * scale);
    graphics.fillEllipse(x + 11 * scale + lean, y - 1 * scale, 12 * scale, 8 * scale);
    graphics.fillStyle(FLOOR_WOOD_DARK, 0.24);
    graphics.fillEllipse(x + lean, y - 3 * scale, 5 * scale, 3 * scale);
  }

  private drawBaseWalls() {
    const graphics = this.baseGraphics;

    if (!graphics) {
      return;
    }

    const { bounds } = this.room;

    graphics.clear();
    graphics.fillStyle(WALL_DARK, 1);
    graphics.fillRect(bounds.x - 8, bounds.y - 8, bounds.width + 16, 8);
    graphics.fillRect(bounds.x - 8, bounds.y + bounds.height, bounds.width + 16, 8);
    graphics.fillRect(bounds.x - 8, bounds.y, 8, bounds.height);
    graphics.fillRect(bounds.x + bounds.width, bounds.y, 8, bounds.height);

    for (const side of ['north', 'south', 'east', 'west'] as const) {
      this.drawWallSide(graphics, side);
    }
  }

  private drawWallSide(graphics: Phaser.GameObjects.Graphics, side: RoomDoorSide) {
    for (const segment of this.getWallSegments(side)) {
      this.drawWallSegment(graphics, side, segment);
    }
  }

  private drawWallSegment(
    graphics: Phaser.GameObjects.Graphics,
    side: RoomDoorSide,
    segment: Segment
  ) {
    const { bounds } = this.room;
    const { x, y, width, height, border } = bounds;
    const rect = this.getWallSegmentRect(side, segment);

    graphics.fillStyle(WALL_MAIN, 1);
    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    graphics.lineStyle(2, WALL_EDGE, 0.72);

    if (side === 'north') {
      graphics.lineBetween(segment.start, y + border, segment.end, y + border);
      return;
    }

    if (side === 'south') {
      graphics.lineBetween(segment.start, y + height - border, segment.end, y + height - border);
      return;
    }

    if (side === 'west') {
      graphics.lineBetween(x + border, segment.start, x + border, segment.end);
      return;
    }

    graphics.lineBetween(x + width - border, segment.start, x + width - border, segment.end);
  }

  private getWallSegments(side: RoomDoorSide): Segment[] {
    const [axisStart, axisEnd] = this.getAxisRange(side);
    const doorGaps = this.room.doors
      .filter((door) => door.side === side)
      .map((door) => ({
        start: Phaser.Math.Clamp(door.center - door.span / 2, axisStart, axisEnd),
        end: Phaser.Math.Clamp(door.center + door.span / 2, axisStart, axisEnd)
      }))
      .sort((left, right) => left.start - right.start);

    const segments: Segment[] = [];
    let cursor = axisStart;

    for (const gap of doorGaps) {
      if (gap.start > cursor) {
        segments.push({ start: cursor, end: gap.start });
      }

      cursor = Math.max(cursor, gap.end);
    }

    if (cursor < axisEnd) {
      segments.push({ start: cursor, end: axisEnd });
    }

    return segments;
  }

  private getAxisRange(side: RoomDoorSide): readonly [number, number] {
    const { bounds } = this.room;

    if (side === 'north' || side === 'south') {
      return [bounds.x, bounds.x + bounds.width];
    }

    return [bounds.y, bounds.y + bounds.height];
  }

  private getWallSegmentRect(side: RoomDoorSide, segment: Segment) {
    const { bounds } = this.room;

    if (side === 'north') {
      return {
        x: segment.start,
        y: bounds.y,
        width: segment.end - segment.start,
        height: bounds.border
      };
    }

    if (side === 'south') {
      return {
        x: segment.start,
        y: bounds.y + bounds.height - bounds.border,
        width: segment.end - segment.start,
        height: bounds.border
      };
    }

    if (side === 'west') {
      return {
        x: bounds.x,
        y: segment.start,
        width: bounds.border,
        height: segment.end - segment.start
      };
    }

    return {
      x: bounds.x + bounds.width - bounds.border,
      y: segment.start,
      width: bounds.border,
      height: segment.end - segment.start
    };
  }

  private drawDoorState(state: CombatRoomState) {
    const graphics = this.doorGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    for (const door of this.room.doors) {
      if (areCombatRoomDoorsOpen(state)) {
        this.drawOpenDoor(graphics, door, state.phase === 'cleared');
      } else {
        this.drawClosedDoor(graphics, door);
      }
    }
  }

  private drawOpenDoor(
    graphics: Phaser.GameObjects.Graphics,
    door: RoomDoor,
    isCleared: boolean
  ) {
    const passage = this.getDoorPassageRect(door);
    const [start, end] = this.getDoorGap(door);
    const color = isCleared ? DOOR_CLEARED : DOOR_OPEN;

    graphics.fillStyle(color, 0.92);
    graphics.fillRect(passage.x, passage.y, passage.width, passage.height);
    graphics.lineStyle(2, WALL_EDGE, isCleared ? 0.62 : 0.48);

    if (door.side === 'east' || door.side === 'west') {
      graphics.lineBetween(passage.x, start, passage.x + passage.width, start);
      graphics.lineBetween(passage.x, end, passage.x + passage.width, end);
      return;
    }

    graphics.lineBetween(start, passage.y, start, passage.y + passage.height);
    graphics.lineBetween(end, passage.y, end, passage.y + passage.height);
  }

  private drawClosedDoor(graphics: Phaser.GameObjects.Graphics, door: RoomDoor) {
    const slab = this.getClosedDoorRect(door);

    graphics.fillStyle(WALL_DARK, 1);
    graphics.fillRect(slab.x, slab.y, slab.width, slab.height);
    graphics.fillStyle(WALL_MAIN, 1);
    graphics.fillRect(slab.x + 2, slab.y + 2, slab.width - 4, slab.height - 4);
    graphics.lineStyle(2, WALL_EDGE, 0.8);
    graphics.strokeRect(slab.x + 2, slab.y + 2, slab.width - 4, slab.height - 4);
    graphics.lineStyle(2, 0x273a2e, 0.65);

    if (door.side === 'east' || door.side === 'west') {
      const centerX = slab.x + slab.width / 2;
      graphics.lineBetween(centerX, slab.y + 8, centerX, slab.y + slab.height - 8);
      return;
    }

    const centerY = slab.y + slab.height / 2;
    graphics.lineBetween(slab.x + 8, centerY, slab.x + slab.width - 8, centerY);
  }

  private getDoorGap(door: RoomDoor): readonly [number, number] {
    const [axisStart, axisEnd] = this.getAxisRange(door.side);

    return [
      Phaser.Math.Clamp(door.center - door.span / 2, axisStart, axisEnd),
      Phaser.Math.Clamp(door.center + door.span / 2, axisStart, axisEnd)
    ];
  }

  private getDoorPassageRect(door: RoomDoor) {
    const { bounds } = this.room;
    const [start, end] = this.getDoorGap(door);
    const span = end - start;

    if (door.side === 'east') {
      return {
        x: bounds.x + bounds.width - bounds.border,
        y: start,
        width: bounds.border + door.depth,
        height: span
      };
    }

    if (door.side === 'west') {
      return {
        x: bounds.x - door.depth,
        y: start,
        width: bounds.border + door.depth,
        height: span
      };
    }

    if (door.side === 'south') {
      return {
        x: start,
        y: bounds.y + bounds.height - bounds.border,
        width: span,
        height: bounds.border + door.depth
      };
    }

    return {
      x: start,
      y: bounds.y - door.depth,
      width: span,
      height: bounds.border + door.depth
    };
  }

  private getClosedDoorRect(door: RoomDoor) {
    return this.getDoorPassageRect(door);
  }

  private drawTriggerState(state: CombatRoomState) {
    const graphics = this.triggerGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    if (state.phase !== 'open') {
      return;
    }

    const { trigger } = this.room;
    const color = TRIGGER_IDLE;
    const alpha = 0.3;

    graphics.lineStyle(2, color, alpha);
    graphics.strokeCircle(trigger.x, trigger.y, trigger.radius);
    graphics.lineStyle(1, color, alpha * 0.72);
    graphics.strokeCircle(trigger.x, trigger.y, trigger.radius * 0.46);
  }

  private drawSpawnState(state: CombatRoomState) {
    const graphics = this.spawnGraphics;

    if (!graphics) {
      return;
    }

    graphics.clear();

    if (state.phase !== 'open') {
      return;
    }

    const color = SPAWN_IDLE;
    const fillAlpha = 0.34;
    const ringAlpha = 0.18;

    for (const spawn of this.room.spawnPoints) {
      graphics.fillStyle(color, fillAlpha);
      graphics.fillCircle(spawn.x, spawn.y, 3);
      graphics.fillCircle(spawn.x - 7, spawn.y + 5, 2);
      graphics.fillCircle(spawn.x + 7, spawn.y + 4, 2);
      graphics.lineStyle(1, color, ringAlpha);
      graphics.strokeCircle(spawn.x, spawn.y, 7);
    }
  }
}
