import {
  ROOM_THEME_NAMES,
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
  readonly typeName: string;
  readonly decorSeed: number;
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

type GridPoint = {
  readonly x: number;
  readonly y: number;
};

type DungeonBlueprintSelection = {
  readonly rows: readonly string[];
  readonly start: GridPoint;
};

const DUNGEON_ROUTE_DSL = [
  '..B..',
  '..R..',
  '.GMM.',
  '..G..',
  '.MS..',
  '.W...'
] as const;

const ROOM_SPEC_BY_SYMBOL: Partial<
  Record<string, { readonly kind: DungeonRoomKind; readonly theme: DungeonRoomTheme }>
> = {
  S: { kind: 'start', theme: 'start' },
  G: { kind: 'normal', theme: 'wood' },
  M: { kind: 'normal', theme: 'mushroom' },
  R: { kind: 'normal', theme: 'stone' },
  W: { kind: 'wizard', theme: 'wizard' },
  B: { kind: 'boss', theme: 'boss' }
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
  const blueprint = createDungeonBlueprint();
  const rooms = new Map<string, DungeonRoomState>();

  for (let y = 0; y < blueprint.rows.length; y += 1) {
    const row = blueprint.rows[y];

    for (let x = 0; x < row.length; x += 1) {
      const roomSpec = ROOM_SPEC_BY_SYMBOL[row[x]];

      if (!roomSpec) continue;

      const id = dungeonRoomId(x, y);
      const { kind, theme } = roomSpec;
      const depth = Math.abs(x - blueprint.start.x) + Math.abs(y - blueprint.start.y);
      const enemyBudget = enemyBudgetForRoom(kind, depth, theme);
      const phase: RoomPhase = kind === 'start' || kind === 'wizard' ? 'cleared' : 'open';

      rooms.set(id, {
        id,
        gridX: x,
        gridY: y,
        kind,
        theme,
        typeName: ROOM_THEME_NAMES[theme],
        decorSeed: seededGridValue(x, y, row.charCodeAt(x) + 97),
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
    currentRoomId: dungeonRoomId(blueprint.start.x, blueprint.start.y)
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
    typeName: room.typeName,
    decorSeed: room.decorSeed,
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
  return getDungeonRoomExits(state, room).map((side) => {
    const target = getNeighborDungeonRoom(state, room, side);

    return {
      id: `${room.id}-${side}`,
      side,
      ...DOOR_TEMPLATE[side],
      targetTheme: target?.theme,
      targetTypeName: target?.typeName
    };
  });
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

function createDungeonBlueprint(): DungeonBlueprintSelection {
  const rows = normalizeBlueprintRows(DUNGEON_ROUTE_DSL);

  return {
    rows,
    start: findStartGrid(rows)
  };
}

function normalizeBlueprintRows(rows: readonly string[]): readonly string[] {
  const width = Math.max(...rows.map((row) => row.length));

  return rows.map((row) => row.padEnd(width, '.'));
}

function findStartGrid(rows: readonly string[]): GridPoint {
  let start: GridPoint | undefined;

  for (let y = 0; y < rows.length; y += 1) {
    const x = rows[y].indexOf('S');

    if (x < 0) continue;

    if (start) {
      throw new Error('Dungeon blueprint must contain exactly one start room.');
    }

    start = { x, y };
  }

  if (!start) {
    throw new Error('Dungeon blueprint is missing a start room.');
  }

  return start;
}

function enemyBudgetForRoom(kind: DungeonRoomKind, depth: number, theme: DungeonRoomTheme): number {
  if (kind === 'start' || kind === 'wizard') return 0;
  if (kind === 'boss') return 7;

  const baseBudget = Math.min(6, 2 + depth);

  if (theme === 'wood') return Math.min(7, baseBudget + 1);
  if (theme === 'mushroom') return Math.min(7, baseBudget + 1);

  return baseBudget;
}

function seededGridValue(x: number, y: number, salt: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7 + salt * 19.19) * 43758.5453;

  return value - Math.floor(value);
}

function seededRoomValue(room: DungeonRoomState, salt: number): number {
  const value =
    Math.sin(room.decorSeed * 991.7 + room.gridX * 127.1 + room.gridY * 311.7 + salt * 19.19) *
    43758.5453;

  return value - Math.floor(value);
}

function dungeonRoomId(x: number, y: number): string {
  return `${x},${y}`;
}
