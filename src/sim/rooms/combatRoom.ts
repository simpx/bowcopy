import { ROOM_THEME_KIT } from '../../data/roomThemeKit';

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

const REFERENCE_ROOM_DOORS: readonly RoomDoor[] = Object.entries(ROOM_THEME_KIT.room.doors).map(
  ([side, template]) => ({
    id: `${side}-main`,
    side: side as RoomDoorSide,
    ...template
  })
);

export const referenceCombatRoom: CombatRoomDefinition = {
  id: 'reference-combat-room',
  theme: 'wood',
  typeName: ROOM_THEME_NAMES.wood,
  decorSeed: 0,
  bounds: ROOM_THEME_KIT.room.bounds,
  doors: REFERENCE_ROOM_DOORS,
  trigger: ROOM_THEME_KIT.room.trigger,
  spawnPoints: ROOM_THEME_KIT.room.spawnPoints,
  floorMarks: ROOM_THEME_KIT.room.floorMarks
};

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
