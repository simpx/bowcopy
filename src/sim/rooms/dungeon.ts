import {
  referenceCombatRoom,
  type CombatRoomDefinition,
  type FloorMark,
  type RoomDoor,
  type RoomDoorSide,
  type RoomPhase,
  type RoomTheme,
  type RoomSpawnPoint
} from './combatRoom';

export type DungeonRoomKind = 'start' | 'normal' | 'wizard' | 'boss';
export type DungeonRoomTheme = RoomTheme;

export interface DungeonRoomState {
  readonly id: string;
  readonly gridX: number;
  readonly gridY: number;
  readonly kind: DungeonRoomKind;
  readonly theme: DungeonRoomTheme;
  readonly depth: number;
  readonly enemyBudget: number;
  phase: RoomPhase;
  wave: number;
  remainingSpawnMarkers: number;
  visited: boolean;
}

export interface DungeonState {
  readonly rooms: Map<string, DungeonRoomState>;
  currentRoomId: string;
}

const START_GRID = { x: 2, y: 4 } as const;

const DUNGEON_BLUEPRINT = [
  '..B..',
  '..N..',
  '.NNN.',
  '..N..',
  '.NS..',
  '.W...'
] as const;

const ROOM_KIND_BY_SYMBOL: Partial<Record<string, DungeonRoomKind>> = {
  S: 'start',
  N: 'normal',
  W: 'wizard',
  B: 'boss'
};

const DOOR_TEMPLATE: Record<RoomDoorSide, Omit<RoomDoor, 'id' | 'side'>> = {
  north: {
    center: 640,
    span: 178,
    depth: 48
  },
  east: {
    center: 360,
    span: 152,
    depth: 48
  },
  south: {
    center: 640,
    span: 196,
    depth: 48
  },
  west: {
    center: 360,
    span: 152,
    depth: 48
  }
};

const SIDE_DELTAS: Record<RoomDoorSide, { readonly x: number; readonly y: number }> = {
  north: { x: 0, y: -1 },
  east: { x: 1, y: 0 },
  south: { x: 0, y: 1 },
  west: { x: -1, y: 0 }
};

export const OPPOSITE_DOOR_SIDE: Record<RoomDoorSide, RoomDoorSide> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east'
};

const ROOM_SIDES: readonly RoomDoorSide[] = ['north', 'east', 'south', 'west'] as const;

export function createInitialDungeonState(): DungeonState {
  const rooms = new Map<string, DungeonRoomState>();

  for (let y = 0; y < DUNGEON_BLUEPRINT.length; y += 1) {
    const row = DUNGEON_BLUEPRINT[y];

    for (let x = 0; x < row.length; x += 1) {
      const kind = ROOM_KIND_BY_SYMBOL[row[x]];

      if (!kind) continue;

      const id = dungeonRoomId(x, y);
      const depth = Math.abs(x - START_GRID.x) + Math.abs(y - START_GRID.y);
      const enemyBudget = enemyBudgetForRoom(kind, depth);
      const phase: RoomPhase = kind === 'start' || kind === 'wizard' ? 'cleared' : 'open';

      rooms.set(id, {
        id,
        gridX: x,
        gridY: y,
        kind,
        theme: themeForRoom(kind, x, y),
        depth,
        enemyBudget,
        phase,
        wave: Math.max(1, depth),
        remainingSpawnMarkers: 0,
        visited: kind === 'start'
      });
    }
  }

  return {
    rooms,
    currentRoomId: dungeonRoomId(START_GRID.x, START_GRID.y)
  };
}

export function getCurrentDungeonRoom(state: DungeonState): DungeonRoomState {
  return getDungeonRoom(state, state.currentRoomId);
}

export function getDungeonRoom(state: DungeonState, id: string): DungeonRoomState {
  const room = state.rooms.get(id);

  if (!room) {
    throw new Error(`Missing dungeon room: ${id}`);
  }

  return room;
}

export function getNeighborDungeonRoom(
  state: DungeonState,
  room: DungeonRoomState,
  side: RoomDoorSide
): DungeonRoomState | undefined {
  const delta = SIDE_DELTAS[side];

  return state.rooms.get(dungeonRoomId(room.gridX + delta.x, room.gridY + delta.y));
}

export function enterDungeonRoom(state: DungeonState, roomId: string): DungeonRoomState {
  const room = getDungeonRoom(state, roomId);

  state.currentRoomId = roomId;
  room.visited = true;

  return room;
}

export function startCurrentDungeonRoomCombat(state: DungeonState): DungeonRoomState {
  const room = getCurrentDungeonRoom(state);

  if (!isCombatDungeonRoom(room) || room.phase !== 'open') {
    return room;
  }

  room.phase = 'combat';
  room.remainingSpawnMarkers = room.enemyBudget;

  return room;
}

export function clearCurrentDungeonRoom(state: DungeonState): DungeonRoomState {
  const room = getCurrentDungeonRoom(state);

  if (room.phase !== 'combat') {
    return room;
  }

  room.phase = 'cleared';
  room.remainingSpawnMarkers = 0;

  return room;
}

export function createCombatRoomDefinitionForDungeonRoom(
  state: DungeonState,
  room: DungeonRoomState
): CombatRoomDefinition {
  return {
    ...referenceCombatRoom,
    id: room.id,
    theme: room.theme,
    doors: createDoorsForDungeonRoom(state, room),
    floorMarks: createFloorMarksForDungeonRoom(room),
    spawnPoints: createSpawnPointsForDungeonRoom(room)
  };
}

export function getDungeonRoomExits(state: DungeonState, room: DungeonRoomState): readonly RoomDoorSide[] {
  return ROOM_SIDES.filter((side) => Boolean(getNeighborDungeonRoom(state, room, side)));
}

export function isCombatDungeonRoom(room: DungeonRoomState): boolean {
  return room.kind === 'normal' || room.kind === 'boss';
}

function createDoorsForDungeonRoom(state: DungeonState, room: DungeonRoomState): readonly RoomDoor[] {
  return getDungeonRoomExits(state, room).map((side) => ({
    id: `${room.id}-${side}`,
    side,
    ...DOOR_TEMPLATE[side]
  }));
}

function createFloorMarksForDungeonRoom(room: DungeonRoomState): readonly FloorMark[] {
  return referenceCombatRoom.floorMarks.map((mark, index) => {
    const seed = seededRoomValue(room, index);

    return {
      ...mark,
      x: mark.x + (seed - 0.5) * 26,
      y: mark.y + (seededRoomValue(room, index + 17) - 0.5) * 18,
      rotation: mark.rotation + (seededRoomValue(room, index + 31) - 0.5) * 0.18,
      alpha: mark.alpha * (0.82 + seed * 0.5)
    };
  });
}

function createSpawnPointsForDungeonRoom(room: DungeonRoomState): readonly RoomSpawnPoint[] {
  if (room.kind === 'boss') {
    return referenceCombatRoom.spawnPoints;
  }

  const count = Math.min(referenceCombatRoom.spawnPoints.length, Math.max(3, room.enemyBudget + 2));

  return referenceCombatRoom.spawnPoints.slice(0, count);
}

function enemyBudgetForRoom(kind: DungeonRoomKind, depth: number): number {
  if (kind === 'start' || kind === 'wizard') return 0;
  if (kind === 'boss') return 7;

  return Math.min(6, 2 + depth);
}

function themeForRoom(kind: DungeonRoomKind, x: number, y: number): DungeonRoomTheme {
  if (kind === 'wizard') return 'wizard';
  if (kind === 'boss') return 'stone';

  const themeIndex = Math.abs(x * 3 + y * 5) % 3;

  if (themeIndex === 1) return 'stone';
  if (themeIndex === 2) return 'mushroom';

  return 'forest';
}

function seededRoomValue(room: DungeonRoomState, salt: number): number {
  const value = Math.sin(room.gridX * 127.1 + room.gridY * 311.7 + salt * 19.19) * 43758.5453;

  return value - Math.floor(value);
}

function dungeonRoomId(x: number, y: number): string {
  return `${x},${y}`;
}
