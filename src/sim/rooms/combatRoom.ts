export type RoomPhase = 'open' | 'combat' | 'cleared';

export type RoomDoorSide = 'north' | 'south' | 'east' | 'west';

export type DecorationAssetId =
  | 'crateBarrel'
  | 'floorScuffRed'
  | 'mushroomPurple'
  | 'stoneBlockLarge'
  | 'stonePatch'
  | 'stonePebble';

export interface RoomBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly border: number;
}

export interface RoomDoor {
  readonly id: string;
  readonly side: RoomDoorSide;
  readonly center: number;
  readonly span: number;
  readonly depth: number;
}

export interface RoomTrigger {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface RoomSpawnPoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface RoomDecoration {
  readonly id: string;
  readonly asset: DecorationAssetId;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
  readonly flipX?: boolean;
}

export interface FloorMark {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly alpha: number;
}

export interface CombatRoomDefinition {
  readonly id: string;
  readonly bounds: RoomBounds;
  readonly doors: readonly RoomDoor[];
  readonly trigger: RoomTrigger;
  readonly spawnPoints: readonly RoomSpawnPoint[];
  readonly decorations: readonly RoomDecoration[];
  readonly floorMarks: readonly FloorMark[];
}

export interface CombatRoomState {
  readonly phase: RoomPhase;
  readonly remainingSpawnMarkers: number;
}

export interface RoomPosition {
  readonly x: number;
  readonly y: number;
}

export const referenceCombatRoom: CombatRoomDefinition = {
  id: 'reference-combat-room',
  bounds: {
    x: 24,
    y: 20,
    width: 912,
    height: 500,
    border: 9
  },
  doors: [
    {
      id: 'east-main',
      side: 'east',
      center: 268,
      span: 118,
      depth: 24
    },
    {
      id: 'south-main',
      side: 'south',
      center: 480,
      span: 148,
      depth: 20
    }
  ],
  trigger: {
    x: 480,
    y: 270,
    radius: 72
  },
  spawnPoints: [
    { id: 'north-west', x: 414, y: 224 },
    { id: 'north-east', x: 526, y: 222 },
    { id: 'east', x: 594, y: 282 },
    { id: 'south-east', x: 528, y: 342 },
    { id: 'south-west', x: 428, y: 336 }
  ],
  decorations: [
    {
      id: 'crate-left',
      asset: 'crateBarrel',
      x: 300,
      y: 210,
      scale: 0.31,
      rotation: -0.03
    },
    {
      id: 'block-upper',
      asset: 'stoneBlockLarge',
      x: 246,
      y: 146,
      scale: 0.18,
      rotation: 0.04,
      flipX: true
    },
    {
      id: 'mushroom-west',
      asset: 'mushroomPurple',
      x: 92,
      y: 478,
      scale: 0.16,
      rotation: -0.12
    },
    {
      id: 'mushroom-center',
      asset: 'mushroomPurple',
      x: 542,
      y: 292,
      scale: 0.13,
      rotation: 0.08,
      flipX: true
    },
    {
      id: 'stone-center-left',
      asset: 'stonePatch',
      x: 416,
      y: 304,
      scale: 0.24,
      rotation: 0.02
    },
    {
      id: 'stone-center-low',
      asset: 'stonePebble',
      x: 442,
      y: 344,
      scale: 0.2,
      rotation: -0.08
    },
    {
      id: 'scuff-north',
      asset: 'floorScuffRed',
      x: 724,
      y: 106,
      scale: 0.2,
      rotation: 0.1
    },
    {
      id: 'scuff-east',
      asset: 'floorScuffRed',
      x: 766,
      y: 330,
      scale: 0.18,
      rotation: -0.13,
      flipX: true
    },
    {
      id: 'pebble-south',
      asset: 'stonePebble',
      x: 708,
      y: 426,
      scale: 0.17,
      rotation: 0.18
    }
  ],
  floorMarks: [
    { id: 'north-fleck-1', x: 154, y: 66, width: 8, height: 3, rotation: -0.2, alpha: 0.22 },
    { id: 'north-fleck-2', x: 386, y: 82, width: 12, height: 3, rotation: 0.14, alpha: 0.18 },
    { id: 'north-fleck-3', x: 642, y: 62, width: 7, height: 2, rotation: 0.2, alpha: 0.15 },
    { id: 'west-fleck-1', x: 126, y: 274, width: 8, height: 3, rotation: 0.12, alpha: 0.16 },
    { id: 'center-fleck-1', x: 482, y: 198, width: 16, height: 4, rotation: -0.1, alpha: 0.2 },
    { id: 'center-fleck-2', x: 406, y: 282, width: 12, height: 3, rotation: 0.04, alpha: 0.22 },
    { id: 'east-fleck-1', x: 812, y: 236, width: 10, height: 3, rotation: -0.18, alpha: 0.16 },
    { id: 'south-fleck-1', x: 196, y: 448, width: 9, height: 3, rotation: -0.06, alpha: 0.18 },
    { id: 'south-fleck-2', x: 626, y: 462, width: 12, height: 4, rotation: 0.1, alpha: 0.16 }
  ]
} as const;

export const createInitialCombatRoomState = (): CombatRoomState => ({
  phase: 'open',
  remainingSpawnMarkers: 0
});

export const isInsideRoomTrigger = (
  room: CombatRoomDefinition,
  position: RoomPosition
): boolean => {
  const deltaX = position.x - room.trigger.x;
  const deltaY = position.y - room.trigger.y;

  return deltaX * deltaX + deltaY * deltaY <= room.trigger.radius * room.trigger.radius;
};

export const startCombatFromTrigger = (
  room: CombatRoomDefinition,
  state: CombatRoomState,
  position: RoomPosition
): CombatRoomState => {
  if (state.phase !== 'open' || !isInsideRoomTrigger(room, position)) {
    return state;
  }

  return {
    phase: 'combat',
    remainingSpawnMarkers: room.spawnPoints.length
  };
};

export const clearCombatRoom = (state: CombatRoomState): CombatRoomState => {
  if (state.phase !== 'combat') {
    return state;
  }

  return {
    phase: 'cleared',
    remainingSpawnMarkers: 0
  };
};

export const areCombatRoomDoorsOpen = (state: CombatRoomState): boolean =>
  state.phase !== 'combat';
