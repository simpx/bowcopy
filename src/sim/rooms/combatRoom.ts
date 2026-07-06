export type RoomPhase = 'open' | 'combat' | 'cleared';

export type RoomDoorSide = 'north' | 'south' | 'east' | 'west';
export type RoomTheme = 'start' | 'wood' | 'stone' | 'mushroom' | 'wizard' | 'boss';

export const ROOM_THEME_NAMES: Record<RoomTheme, string> = {
  start: 'Start',
  wood: 'Wood',
  stone: 'Stone',
  mushroom: 'Mushroom',
  wizard: 'Wizard',
  boss: 'Boss'
};

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
  readonly targetTheme?: RoomTheme;
  readonly targetTypeName?: string;
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
  readonly theme?: RoomTheme;
  readonly typeName?: string;
  readonly decorSeed?: number;
  readonly bounds: RoomBounds;
  readonly doors: readonly RoomDoor[];
  readonly trigger: RoomTrigger;
  readonly spawnPoints: readonly RoomSpawnPoint[];
  readonly floorMarks: readonly FloorMark[];
}

export interface CombatRoomState {
  readonly phase: RoomPhase;
  readonly wave: number;
  readonly remainingSpawnMarkers: number;
}

export interface RoomPosition {
  readonly x: number;
  readonly y: number;
}

export const referenceCombatRoom: CombatRoomDefinition = {
  id: 'reference-combat-room',
  theme: 'wood',
  typeName: ROOM_THEME_NAMES.wood,
  decorSeed: 0,
  bounds: {
    x: 22,
    y: 30,
    width: 1236,
    height: 660,
    border: 44
  },
  doors: [
    {
      id: 'north-main',
      side: 'north',
      center: 640,
      span: 178,
      depth: 48
    },
    {
      id: 'east-main',
      side: 'east',
      center: 360,
      span: 152,
      depth: 48
    },
    {
      id: 'south-main',
      side: 'south',
      center: 640,
      span: 196,
      depth: 48
    },
    {
      id: 'west-main',
      side: 'west',
      center: 360,
      span: 152,
      depth: 48
    }
  ],
  trigger: {
    x: 640,
    y: 360,
    radius: 92
  },
  spawnPoints: [
    { id: 'north-west', x: 390, y: 250 },
    { id: 'north', x: 640, y: 230 },
    { id: 'north-east', x: 890, y: 250 },
    { id: 'east', x: 1010, y: 380 },
    { id: 'south-east', x: 860, y: 475 },
    { id: 'south', x: 640, y: 500 },
    { id: 'south-west', x: 420, y: 475 },
    { id: 'west', x: 270, y: 380 }
  ],
  floorMarks: [
    { id: 'north-fleck-1', x: 154, y: 96, width: 8, height: 3, rotation: -0.2, alpha: 0.1 },
    { id: 'north-fleck-2', x: 520, y: 112, width: 12, height: 3, rotation: 0.14, alpha: 0.09 },
    { id: 'north-fleck-3', x: 926, y: 86, width: 7, height: 2, rotation: 0.2, alpha: 0.08 },
    { id: 'west-fleck-1', x: 154, y: 374, width: 8, height: 3, rotation: 0.12, alpha: 0.09 },
    { id: 'center-fleck-1', x: 640, y: 292, width: 16, height: 4, rotation: -0.1, alpha: 0.1 },
    { id: 'center-fleck-2', x: 514, y: 384, width: 12, height: 3, rotation: 0.04, alpha: 0.09 },
    { id: 'east-fleck-1', x: 1084, y: 314, width: 10, height: 3, rotation: -0.18, alpha: 0.08 },
    { id: 'south-fleck-1', x: 270, y: 624, width: 9, height: 3, rotation: -0.06, alpha: 0.09 },
    { id: 'south-fleck-2', x: 854, y: 642, width: 12, height: 4, rotation: 0.1, alpha: 0.08 }
  ]
} as const;

export const getCombatWaveEnemyCount = (wave: number): number =>
  Math.min(8, 2 + Math.max(1, wave));

export const createInitialCombatRoomState = (): CombatRoomState => ({
  phase: 'combat',
  wave: 1,
  remainingSpawnMarkers: getCombatWaveEnemyCount(1)
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
    wave: state.wave,
    remainingSpawnMarkers: getCombatWaveEnemyCount(state.wave)
  };
};

export const clearCombatRoom = (state: CombatRoomState): CombatRoomState => {
  if (state.phase !== 'combat') {
    return state;
  }

  return {
    phase: 'cleared',
    wave: state.wave,
    remainingSpawnMarkers: 0
  };
};

export const advanceCombatRoomWave = (state: CombatRoomState): CombatRoomState => {
  const wave = state.wave + 1;

  return {
    phase: 'combat',
    wave,
    remainingSpawnMarkers: getCombatWaveEnemyCount(wave)
  };
};

export const areCombatRoomDoorsOpen = (state: CombatRoomState): boolean =>
  state.phase !== 'combat';
