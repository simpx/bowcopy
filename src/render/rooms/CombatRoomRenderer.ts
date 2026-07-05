import Phaser from 'phaser';

import crateBarrelUrl from '../../../assets/prototype-video-crops/decorations/crate-barrel.png';
import floorScuffRedUrl from '../../../assets/prototype-video-crops/decorations/floor-scuff-red.png';
import mushroomPurpleUrl from '../../../assets/prototype-video-crops/decorations/mushroom-purple.png';
import stoneBlockLargeUrl from '../../../assets/prototype-video-crops/decorations/stone-block-large.png';
import stonePatchUrl from '../../../assets/prototype-video-crops/decorations/stone-patch.png';
import stonePebbleUrl from '../../../assets/prototype-video-crops/decorations/stone-pebble.png';
import type {
  CombatRoomDefinition,
  CombatRoomState,
  DecorationAssetId,
  FloorMark,
  RoomDoor,
  RoomDoorSide
} from '../../sim/rooms';
import { areCombatRoomDoorsOpen } from '../../sim/rooms';

const DECORATION_TEXTURE_KEYS: Record<DecorationAssetId, string> = {
  crateBarrel: 'prototype-decoration-crate-barrel',
  floorScuffRed: 'prototype-decoration-floor-scuff-red',
  mushroomPurple: 'prototype-decoration-mushroom-purple',
  stoneBlockLarge: 'prototype-decoration-stone-block-large',
  stonePatch: 'prototype-decoration-stone-patch',
  stonePebble: 'prototype-decoration-stone-pebble'
};

const ROOM_ASSETS = [
  { key: DECORATION_TEXTURE_KEYS.crateBarrel, url: crateBarrelUrl },
  { key: DECORATION_TEXTURE_KEYS.floorScuffRed, url: floorScuffRedUrl },
  { key: DECORATION_TEXTURE_KEYS.mushroomPurple, url: mushroomPurpleUrl },
  { key: DECORATION_TEXTURE_KEYS.stoneBlockLarge, url: stoneBlockLargeUrl },
  { key: DECORATION_TEXTURE_KEYS.stonePatch, url: stonePatchUrl },
  { key: DECORATION_TEXTURE_KEYS.stonePebble, url: stonePebbleUrl }
] as const;

const FLOOR_COLOR = 0x33583d;
const FLOOR_SHADOW = 0x213b2b;
const WALL_DARK = 0x020503;
const WALL_MAIN = 0x07120d;
const WALL_EDGE = 0x17291d;
const DOOR_OPEN = 0x2f553a;
const DOOR_CLEARED = 0x406b48;
const SPAWN_IDLE = 0xf1c07a;
const SPAWN_COMBAT = 0xe96945;
const SPAWN_CLEARED = 0xa2d07e;
const TRIGGER_IDLE = 0xe9f3d6;
const TRIGGER_COMBAT = 0xd25f49;
const TRIGGER_CLEARED = 0x9fdd86;

interface Segment {
  readonly start: number;
  readonly end: number;
}

export const preloadCombatRoomAssets = (scene: Phaser.Scene) => {
  for (const asset of ROOM_ASSETS) {
    if (!scene.textures.exists(asset.key)) {
      scene.load.image(asset.key, asset.url);
    }
  }
};

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

    this.baseGraphics = this.scene.add.graphics().setDepth(2);
    this.drawFloorMarks();
    this.drawDecorations();
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

  private drawDecorations() {
    for (const decoration of this.room.decorations) {
      const image = this.scene.add
        .image(decoration.x, decoration.y, DECORATION_TEXTURE_KEYS[decoration.asset])
        .setScale(decoration.scale)
        .setRotation(decoration.rotation)
        .setDepth(10 + decoration.y / 1000);

      image.setFlipX(decoration.flipX === true);
    }
  }

  private drawBaseWalls() {
    const graphics = this.baseGraphics;

    if (!graphics) {
      return;
    }

    const { bounds } = this.room;

    graphics.clear();
    graphics.fillStyle(WALL_DARK, 1);
    graphics.fillRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, 3);
    graphics.fillRect(bounds.x - 3, bounds.y + bounds.height, bounds.width + 6, 3);
    graphics.fillRect(bounds.x - 3, bounds.y, 3, bounds.height);
    graphics.fillRect(bounds.x + bounds.width, bounds.y, 3, bounds.height);

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

    const { trigger } = this.room;
    const color =
      state.phase === 'combat'
        ? TRIGGER_COMBAT
        : state.phase === 'cleared'
          ? TRIGGER_CLEARED
          : TRIGGER_IDLE;
    const alpha = state.phase === 'open' ? 0.3 : 0.16;

    graphics.clear();
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

    const color =
      state.phase === 'combat'
        ? SPAWN_COMBAT
        : state.phase === 'cleared'
          ? SPAWN_CLEARED
          : SPAWN_IDLE;
    const fillAlpha = state.phase === 'cleared' ? 0.34 : 0.78;
    const ringAlpha = state.phase === 'combat' ? 0.44 : 0.18;

    graphics.clear();

    for (const spawn of this.room.spawnPoints) {
      graphics.fillStyle(color, fillAlpha);
      graphics.fillCircle(spawn.x, spawn.y, 3);
      graphics.fillCircle(spawn.x - 7, spawn.y + 5, 2);
      graphics.fillCircle(spawn.x + 7, spawn.y + 4, 2);
      graphics.lineStyle(1, color, ringAlpha);
      graphics.strokeCircle(spawn.x, spawn.y, state.phase === 'combat' ? 11 : 7);
    }
  }
}
