import Phaser from 'phaser';

import {
  ROOM_THEME_KIT,
  getRoomThemeKitTheme,
  hexColorToNumber,
  type FloorProp
} from '../../data/roomThemeKit';
import type {
  CombatRoomDefinition,
  CombatRoomState,
  FloorMark,
  RoomDoor,
  RoomDoorSide,
  RoomTheme
} from '../../sim/rooms';
import { areCombatRoomDoorsOpen } from '../../sim/rooms';

const ROOM_PALETTE = ROOM_THEME_KIT.palette;
const FLOOR_DETAIL_RULES = ROOM_THEME_KIT.floorDetails;
const OUTSIDE_COLOR = hexColorToNumber(ROOM_PALETTE.outside);
const OUTSIDE_DEEP = hexColorToNumber(ROOM_PALETTE.outsideDeep);
const FLOOR_SHADOW = hexColorToNumber(ROOM_PALETTE.floorShadow);
const FLOOR_GRASS = hexColorToNumber(ROOM_PALETTE.floorGrass);
const FLOOR_GRASS_SOFT = hexColorToNumber(ROOM_PALETTE.floorGrassSoft);
const FLOOR_STONE = hexColorToNumber(ROOM_PALETTE.floorStone);
const FLOOR_SCUFF = hexColorToNumber(ROOM_PALETTE.floorScuff);
const FLOOR_WOOD = hexColorToNumber(ROOM_PALETTE.floorWood);
const FLOOR_WOOD_DARK = hexColorToNumber(ROOM_PALETTE.floorWoodDark);
const FLOOR_MUSHROOM_CAP = hexColorToNumber(ROOM_PALETTE.floorMushroomCap);
const FLOOR_MUSHROOM_STEM = hexColorToNumber(ROOM_PALETTE.floorMushroomStem);
const WALL_DARK = hexColorToNumber(ROOM_PALETTE.wallDark);
const WALL_MAIN = hexColorToNumber(ROOM_PALETTE.wallMain);
const WALL_INNER = hexColorToNumber(ROOM_PALETTE.wallInner);
const WALL_EDGE = hexColorToNumber(ROOM_PALETTE.wallEdge);
const WALL_HIGHLIGHT = hexColorToNumber(ROOM_PALETTE.wallHighlight);
const DOOR_OPEN = hexColorToNumber(ROOM_PALETTE.doorOpen);
const DOOR_CLEARED = hexColorToNumber(ROOM_PALETTE.doorCleared);
const SPAWN_IDLE = hexColorToNumber(ROOM_PALETTE.spawnIdle);
const TRIGGER_IDLE = hexColorToNumber(ROOM_PALETTE.triggerIdle);
const WIZARD_SPARK = hexColorToNumber(ROOM_PALETTE.wizardSpark);
const WIZARD_GLOW = hexColorToNumber(ROOM_PALETTE.wizardGlow);

interface Segment {
  readonly start: number;
  readonly end: number;
}

const FLOOR_PROPS = ROOM_THEME_KIT.baseProps;

const THEME_FLOOR_COLORS: Record<RoomTheme, number> = {
  start: hexColorToNumber(getRoomThemeKitTheme('start').floorColor),
  wood: hexColorToNumber(getRoomThemeKitTheme('wood').floorColor),
  stone: hexColorToNumber(getRoomThemeKitTheme('stone').floorColor),
  mushroom: hexColorToNumber(getRoomThemeKitTheme('mushroom').floorColor),
  wizard: hexColorToNumber(getRoomThemeKitTheme('wizard').floorColor),
  boss: hexColorToNumber(getRoomThemeKitTheme('boss').floorColor)
};

const THEME_EXTRA_PROPS: Record<RoomTheme, readonly FloorProp[]> = {
  start: getRoomThemeKitTheme('start').extraProps,
  wood: getRoomThemeKitTheme('wood').extraProps,
  stone: getRoomThemeKitTheme('stone').extraProps,
  mushroom: getRoomThemeKitTheme('mushroom').extraProps,
  wizard: getRoomThemeKitTheme('wizard').extraProps,
  boss: getRoomThemeKitTheme('boss').extraProps
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
    const left = floor.x + FLOOR_DETAIL_RULES.padding.x;
    const right = floor.x + floor.width - FLOOR_DETAIL_RULES.padding.x;
    const top = floor.y + FLOOR_DETAIL_RULES.padding.y;
    const bottom = floor.y + floor.height - FLOOR_DETAIL_RULES.padding.y;

    for (let y = top; y <= bottom; y += FLOOR_DETAIL_RULES.gridStep.y) {
      for (let x = left; x <= right; x += FLOOR_DETAIL_RULES.gridStep.x) {
        const seed = this.getFloorSeed(x, y);

        if (seed < FLOOR_DETAIL_RULES.skipBelowSeed) {
          continue;
        }

        const detailX = x + (seed - 0.5) * 52;
        const detailY = y + (this.getFloorSeed(y, x) - 0.5) * 38;
        const scale = 0.78 + this.getFloorSeed(x + 31, y - 17) * 0.54;
        const shapeSeed = this.getFloorSeed(x - 43, y + 71);
        const shape =
          FLOOR_DETAIL_RULES.shapeMix.find((candidate) => shapeSeed < candidate.maxSeed)?.shape ??
          'tiny-dash';

        if (shape === 'v-grass') {
          this.drawVGrassTuft(graphics, detailX, detailY, scale);
        } else if (shape === 'w-grass') {
          this.drawWGrassTuft(graphics, detailX, detailY, scale);
        } else if (shape === 'split-grass') {
          this.drawSplitGrassTuft(graphics, detailX, detailY, scale);
        } else {
          this.drawTinyGroundDash(graphics, detailX, detailY, scale);
        }

        if (seed > FLOOR_DETAIL_RULES.pebbleSeed) {
          this.drawPebble(graphics, detailX + 26, detailY + 7, scale);
        }

        if (seed > FLOOR_DETAIL_RULES.scuffSeed) {
          this.drawScuff(graphics, detailX - 22, detailY + 16, scale);
        }
      }
    }

    this.drawFloorProps(graphics);
    this.staticObjects.push(graphics);
  }

  private getFloorSeed(x: number, y: number): number {
    const decorOffset = (this.room.decorSeed ?? 0) * 1031.17;
    const value = Math.sin(x * 12.9898 + y * 78.233 + decorOffset) * 43758.5453;

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

    return [...FLOOR_PROPS, ...THEME_EXTRA_PROPS[theme]].map((prop, index) =>
      this.jitterFloorProp(prop, index)
    );
  }

  private jitterFloorProp(prop: FloorProp, index: number): FloorProp {
    const seedX = this.getFloorSeed(prop.x + index * 19, prop.y - index * 11);
    const seedY = this.getFloorSeed(prop.y + index * 23, prop.x - index * 7);

    return {
      ...prop,
      x: prop.x + (seedX - 0.5) * 34,
      y: prop.y + (seedY - 0.5) * 24,
      rotation: prop.rotation + (seedX - 0.5) * 0.16,
      scale: prop.scale * (0.92 + seedY * 0.18)
    };
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

    for (const door of this.room.doors) {
      this.drawDoorDecorations(graphics, door);
    }
  }

  private drawDoorDecorations(graphics: Phaser.GameObjects.Graphics, door: RoomDoor) {
    if (!door.targetTheme) {
      return;
    }

    const base = this.getDoorDecorationBase(door);
    const inward = this.getDoorInwardDirection(door);
    const lateral = this.getDoorLateralDirection(door);
    const place = (offset: number, advance: number, scale: number, rotation = 0): FloorProp => ({
      kind: 'stone',
      x: base.x + lateral.x * offset + inward.x * advance,
      y: base.y + lateral.y * offset + inward.y * advance,
      scale,
      rotation
    });

    if (door.targetTheme === 'mushroom') {
      for (const prop of [
        place(-54, 18, 0.46, -0.1),
        place(-20, 38, 0.54, 0.08),
        place(24, 22, 0.44, 0.04),
        place(58, 46, 0.5, -0.05)
      ]) {
        this.drawMushrooms(graphics, { ...prop, kind: 'mushroom' });
      }

      return;
    }

    if (door.targetTheme === 'wood') {
      this.drawStump(graphics, { ...place(-42, 28, 0.48, 0.1), kind: 'stump' });
      this.drawStump(graphics, { ...place(42, 36, 0.42, -0.08), kind: 'stump' });
      this.drawStoneCluster(graphics, { ...place(0, 56, 0.36, 0.03), kind: 'stone' });
      return;
    }

    if (door.targetTheme === 'wizard') {
      this.drawWizardSpark(graphics, place(-34, 26, 0.78, -0.05));
      this.drawWizardSpark(graphics, place(34, 38, 0.64, 0.08));
      this.drawMushrooms(graphics, { ...place(0, 54, 0.4, -0.08), kind: 'mushroom' });
      return;
    }

    if (door.targetTheme === 'boss') {
      this.drawStoneCluster(graphics, { ...place(-44, 26, 0.64, 0.08), kind: 'stone' });
      this.drawStoneCluster(graphics, { ...place(2, 48, 0.76, -0.02), kind: 'stone' });
      this.drawStump(graphics, { ...place(48, 34, 0.52, -0.08), kind: 'stump' });
      return;
    }

    this.drawStoneCluster(graphics, { ...place(-32, 24, 0.46, 0.06), kind: 'stone' });
    this.drawStoneCluster(graphics, { ...place(32, 40, 0.5, -0.04), kind: 'stone' });
  }

  private drawWizardSpark(graphics: Phaser.GameObjects.Graphics, prop: FloorProp) {
    const { x, y, scale, rotation } = prop;
    const radius = 9 * scale;
    const tilt = rotation * 10;

    graphics.lineStyle(Math.max(1, Math.round(2 * scale)), WIZARD_SPARK, 0.58);
    graphics.lineBetween(x - radius, y + tilt, x + radius, y - tilt);
    graphics.lineBetween(x, y - radius, x, y + radius);
    graphics.fillStyle(WIZARD_GLOW, 0.44);
    graphics.fillCircle(x, y, 2.4 * scale);
  }

  private getDoorDecorationBase(door: RoomDoor): { readonly x: number; readonly y: number } {
    const { bounds } = this.room;

    if (door.side === 'north') {
      return { x: door.center, y: bounds.y + bounds.border + 26 };
    }

    if (door.side === 'south') {
      return { x: door.center, y: bounds.y + bounds.height - bounds.border - 26 };
    }

    if (door.side === 'west') {
      return { x: bounds.x + bounds.border + 26, y: door.center };
    }

    return { x: bounds.x + bounds.width - bounds.border - 26, y: door.center };
  }

  private getDoorInwardDirection(
    door: RoomDoor
  ): { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 } {
    if (door.side === 'north') return { x: 0, y: 1 };
    if (door.side === 'south') return { x: 0, y: -1 };
    if (door.side === 'west') return { x: 1, y: 0 };

    return { x: -1, y: 0 };
  }

  private getDoorLateralDirection(
    door: RoomDoor
  ): { readonly x: -1 | 0 | 1; readonly y: -1 | 0 | 1 } {
    if (door.side === 'north' || door.side === 'south') {
      return { x: 1, y: 0 };
    }

    return { x: 0, y: 1 };
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
    return this.room.theme ?? 'wood';
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
