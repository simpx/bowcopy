import Phaser from 'phaser';

import type {
  CombatRoomDefinition,
  CombatRoomState,
  FloorMark,
  RoomDoor,
  RoomDoorSide,
  RoomTheme
} from '../../sim/rooms';
import { areCombatRoomDoorsOpen } from '../../sim/rooms';

const OUTSIDE_COLOR = 0x0b1711;
const OUTSIDE_DEEP = 0x030806;
const FLOOR_COLOR = 0x3f694b;
const FLOOR_SHADOW = 0x17291f;
const FLOOR_GRASS = 0x254634;
const FLOOR_GRASS_SOFT = 0x6e8c62;
const FLOOR_STONE = 0x7c8372;
const FLOOR_SCUFF = 0x79392f;
const FLOOR_WOOD = 0x6f4a32;
const FLOOR_WOOD_DARK = 0x241811;
const FLOOR_MUSHROOM_CAP = 0xa94842;
const FLOOR_MUSHROOM_STEM = 0xc2b38b;
const WALL_DARK = 0x020503;
const WALL_MAIN = 0x0a1c13;
const WALL_INNER = 0x10271a;
const WALL_EDGE = 0x020503;
const WALL_HIGHLIGHT = 0x234430;
const DOOR_OPEN = 0x16291e;
const DOOR_CLEARED = 0x264632;
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

const THEME_FLOOR_COLORS: Record<RoomTheme, number> = {
  forest: FLOOR_COLOR,
  stone: 0x415f4e,
  mushroom: 0x3f654f,
  wizard: 0x3d604f
};

const THEME_EXTRA_PROPS: Record<RoomTheme, readonly FloorProp[]> = {
  forest: [],
  stone: [
    { kind: 'stone', x: 330, y: 202, scale: 0.48, rotation: 0.12 },
    { kind: 'stone', x: 944, y: 448, scale: 0.62, rotation: -0.04 }
  ],
  mushroom: [
    { kind: 'mushroom', x: 318, y: 210, scale: 0.48, rotation: 0.1 },
    { kind: 'mushroom', x: 910, y: 170, scale: 0.44, rotation: -0.08 },
    { kind: 'mushroom', x: 758, y: 566, scale: 0.52, rotation: 0.04 }
  ],
  wizard: [
    { kind: 'stump', x: 324, y: 218, scale: 0.6, rotation: 0.1 },
    { kind: 'mushroom', x: 900, y: 504, scale: 0.62, rotation: -0.12 }
  ]
};

export const preloadCombatRoomAssets = (_scene: Phaser.Scene) => {};

export class CombatRoomRenderer {
  private readonly staticObjects: Phaser.GameObjects.GameObject[] = [];
  private baseGraphics?: Phaser.GameObjects.Graphics;
  private doorGraphics?: Phaser.GameObjects.Graphics;
  private spawnGraphics?: Phaser.GameObjects.Graphics;
  private triggerGraphics?: Phaser.GameObjects.Graphics;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly room: CombatRoomDefinition
  ) {}

  create() {
    this.drawRoomBase();
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
    const markObject = this.scene.add
      .rectangle(mark.x, mark.y, mark.width, mark.height, FLOOR_SHADOW, mark.alpha)
      .setRotation(mark.rotation)
      .setDepth(3);

    this.staticObjects.push(markObject);
  }

  private drawRoomBase() {
    const { bounds } = this.room;
    const graphics = this.scene.add.graphics().setDepth(0);
    const floor = this.getInnerFloorRect();
    const worldPadding = 140;

    graphics.fillStyle(OUTSIDE_DEEP, 1);
    graphics.fillRect(
      bounds.x - worldPadding,
      bounds.y - worldPadding,
      bounds.width + worldPadding * 2,
      bounds.height + worldPadding * 2
    );
    graphics.fillStyle(OUTSIDE_COLOR, 1);
    graphics.fillRect(bounds.x - 20, bounds.y - 20, bounds.width + 40, bounds.height + 40);
    graphics.fillStyle(this.getThemeFloorColor(), 1);
    graphics.fillRect(floor.x, floor.y, floor.width, floor.height);
    graphics.lineStyle(4, WALL_EDGE, 0.78);
    graphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    this.staticObjects.push(graphics);
  }

  private drawSimpleFloorDetails() {
    const graphics = this.scene.add.graphics().setDepth(1);
    const floor = this.getInnerFloorRect();
    const left = floor.x + 26;
    const right = floor.x + floor.width - 26;
    const top = floor.y + 24;
    const bottom = floor.y + floor.height - 24;

    for (let y = top; y <= bottom; y += 58) {
      for (let x = left; x <= right; x += 78) {
        const seed = this.getFloorSeed(x, y);

        if (seed < 0.12) {
          continue;
        }

        const detailX = x + (seed - 0.5) * 52;
        const detailY = y + (this.getFloorSeed(y, x) - 0.5) * 38;
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
    this.staticObjects.push(graphics);
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
    for (const prop of this.getFloorProps()) {
      if (prop.kind === 'stump') {
        this.drawStump(graphics, prop);
      } else if (prop.kind === 'stone') {
        this.drawStoneCluster(graphics, prop);
      } else {
        this.drawMushrooms(graphics, prop);
      }
    }
  }

  private getFloorProps(): readonly FloorProp[] {
    const theme = this.getRoomTheme();

    return [...FLOOR_PROPS, ...THEME_EXTRA_PROPS[theme]];
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
    graphics.fillRect(bounds.x - 6, bounds.y - 6, bounds.width + 12, 6);
    graphics.fillRect(bounds.x - 6, bounds.y + bounds.height, bounds.width + 12, 6);
    graphics.fillRect(bounds.x - 6, bounds.y, 6, bounds.height);
    graphics.fillRect(bounds.x + bounds.width, bounds.y, 6, bounds.height);

    this.drawCornerCaps(graphics);

    for (const door of this.room.doors) {
      this.drawDoorTunnel(graphics, door);
    }

    for (const side of ['north', 'south', 'east', 'west'] as const) {
      this.drawWallSide(graphics, side);
    }
  }

  private drawCornerCaps(graphics: Phaser.GameObjects.Graphics) {
    const { bounds } = this.room;
    const { x, y, width, height, border } = bounds;

    graphics.fillStyle(WALL_DARK, 1);
    graphics.fillRect(x, y, border, border);
    graphics.fillRect(x + width - border, y, border, border);
    graphics.fillRect(x, y + height - border, border, border);
    graphics.fillRect(x + width - border, y + height - border, border, border);
    graphics.fillStyle(WALL_MAIN, 1);
    graphics.fillRect(x + 4, y + 4, border - 4, border - 4);
    graphics.fillRect(x + width - border, y + 4, border - 4, border - 4);
    graphics.fillRect(x + 4, y + height - border, border - 4, border - 4);
    graphics.fillRect(x + width - border, y + height - border, border - 4, border - 4);
  }

  private drawDoorTunnel(graphics: Phaser.GameObjects.Graphics, door: RoomDoor) {
    const passage = this.getDoorPassageRect(door);
    const [start, end] = this.getDoorGap(door);

    graphics.fillStyle(OUTSIDE_DEEP, 1);
    graphics.fillRect(passage.x, passage.y, passage.width, passage.height);
    graphics.fillStyle(DOOR_OPEN, 0.82);
    graphics.fillRect(passage.x + 4, passage.y + 4, passage.width - 8, passage.height - 8);
    graphics.lineStyle(3, WALL_EDGE, 0.78);

    if (door.side === 'east' || door.side === 'west') {
      graphics.lineBetween(passage.x, start, passage.x + passage.width, start);
      graphics.lineBetween(passage.x, end, passage.x + passage.width, end);
      return;
    }

    graphics.lineBetween(start, passage.y, start, passage.y + passage.height);
    graphics.lineBetween(end, passage.y, end, passage.y + passage.height);
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

    graphics.fillStyle(WALL_DARK, 1);
    graphics.fillRect(rect.x, rect.y, rect.width, rect.height);
    graphics.fillStyle(WALL_MAIN, 1);

    if (side === 'north') {
      graphics.fillRect(rect.x, rect.y + 4, rect.width, rect.height - 4);
    } else if (side === 'south') {
      graphics.fillRect(rect.x, rect.y, rect.width, rect.height - 4);
    } else if (side === 'west') {
      graphics.fillRect(rect.x + 4, rect.y, rect.width - 4, rect.height);
    } else {
      graphics.fillRect(rect.x, rect.y, rect.width - 4, rect.height);
    }

    graphics.lineStyle(4, WALL_EDGE, 0.9);

    if (side === 'north') {
      graphics.lineBetween(segment.start, y + border, segment.end, y + border);
      graphics.lineStyle(2, WALL_HIGHLIGHT, 0.5);
      graphics.lineBetween(segment.start + 4, y + border - 7, segment.end - 4, y + border - 7);
      return;
    }

    if (side === 'south') {
      graphics.lineBetween(segment.start, y + height - border, segment.end, y + height - border);
      graphics.lineStyle(2, WALL_HIGHLIGHT, 0.36);
      graphics.lineBetween(segment.start + 4, y + height - border + 7, segment.end - 4, y + height - border + 7);
      return;
    }

    if (side === 'west') {
      graphics.lineBetween(x + border, segment.start, x + border, segment.end);
      graphics.lineStyle(2, WALL_HIGHLIGHT, 0.42);
      graphics.lineBetween(x + border - 7, segment.start + 4, x + border - 7, segment.end - 4);
      return;
    }

    graphics.lineBetween(x + width - border, segment.start, x + width - border, segment.end);
    graphics.lineStyle(2, WALL_HIGHLIGHT, 0.42);
    graphics.lineBetween(x + width - border + 7, segment.start + 4, x + width - border + 7, segment.end - 4);
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

    graphics.fillStyle(OUTSIDE_DEEP, 0.98);
    graphics.fillRect(passage.x, passage.y, passage.width, passage.height);
    graphics.fillStyle(color, 0.84);
    graphics.fillRect(passage.x + 6, passage.y + 6, passage.width - 12, passage.height - 12);
    graphics.lineStyle(3, WALL_EDGE, isCleared ? 0.72 : 0.56);

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
    graphics.fillRect(slab.x + 4, slab.y + 4, slab.width - 8, slab.height - 8);
    graphics.fillStyle(WALL_INNER, 0.72);
    graphics.fillRect(slab.x + 10, slab.y + 10, slab.width - 20, slab.height - 20);
    graphics.lineStyle(4, WALL_EDGE, 0.9);
    graphics.strokeRect(slab.x + 4, slab.y + 4, slab.width - 8, slab.height - 8);
    graphics.lineStyle(2, WALL_HIGHLIGHT, 0.48);

    if (door.side === 'east' || door.side === 'west') {
      const centerX = slab.x + slab.width / 2;
      graphics.lineBetween(centerX, slab.y + 12, centerX, slab.y + slab.height - 12);
      return;
    }

    const centerY = slab.y + slab.height / 2;
    graphics.lineBetween(slab.x + 12, centerY, slab.x + slab.width - 12, centerY);
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

  private getInnerFloorRect() {
    const { bounds } = this.room;

    return {
      x: bounds.x + bounds.border,
      y: bounds.y + bounds.border,
      width: bounds.width - bounds.border * 2,
      height: bounds.height - bounds.border * 2
    };
  }

  private getRoomTheme(): RoomTheme {
    return this.room.theme ?? 'forest';
  }

  private getThemeFloorColor(): number {
    return THEME_FLOOR_COLORS[this.getRoomTheme()];
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

  destroy() {
    for (const object of this.staticObjects) {
      object.destroy();
    }

    this.staticObjects.length = 0;
    this.baseGraphics?.destroy();
    this.baseGraphics = undefined;
    this.doorGraphics?.destroy();
    this.doorGraphics = undefined;
    this.spawnGraphics?.destroy();
    this.spawnGraphics = undefined;
    this.triggerGraphics?.destroy();
    this.triggerGraphics = undefined;
  }
}
