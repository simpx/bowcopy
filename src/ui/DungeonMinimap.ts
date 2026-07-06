import type { DungeonRoomState, DungeonState } from '../sim/rooms';

const DUNGEON_MINIMAP_STYLE_ID = 'bowbert-dungeon-minimap-styles';
const CELL_SIZE = 13;
const CELL_GAP = 4;

const DUNGEON_MINIMAP_STYLES = `
:root {
  --bowbert-minimap-bg: rgb(3 8 6 / 62%);
  --bowbert-minimap-line: rgb(5 8 5 / 84%);
  --bowbert-minimap-empty: rgb(39 70 50 / 36%);
  --bowbert-minimap-visited: rgb(69 105 76 / 78%);
  --bowbert-minimap-current: #f2efd8;
  --bowbert-minimap-cleared: #75a868;
}

.dungeon-minimap {
  position: absolute;
  top: max(10px, env(safe-area-inset-top));
  right: max(10px, env(safe-area-inset-right));
  z-index: 6;
  padding: 7px;
  border: 2px solid var(--bowbert-minimap-line);
  background: var(--bowbert-minimap-bg);
  box-shadow: 0 4px 0 rgb(0 0 0 / 34%);
  pointer-events: none;
}

.dungeon-minimap-grid {
  position: relative;
}

.dungeon-minimap-link {
  position: absolute;
  background: var(--bowbert-minimap-line);
  opacity: 0.68;
}

.dungeon-minimap-link.is-horizontal {
  height: 3px;
}

.dungeon-minimap-link.is-vertical {
  width: 3px;
}

.dungeon-minimap-room {
  position: absolute;
  width: ${CELL_SIZE}px;
  height: ${CELL_SIZE}px;
  border: 2px solid var(--bowbert-minimap-line);
  background: var(--bowbert-minimap-empty);
}

.dungeon-minimap-room.is-visited {
  background: var(--bowbert-minimap-visited);
}

.dungeon-minimap-room.is-cleared {
  background: var(--bowbert-minimap-cleared);
}

.dungeon-minimap-room.is-current {
  background: var(--bowbert-minimap-current);
}

@media (max-height: 430px) and (orientation: landscape) {
  .dungeon-minimap {
    padding: 5px;
    transform: scale(0.86);
    transform-origin: top right;
  }
}
`;

const ensureDungeonMinimapStyles = () => {
  if (document.getElementById(DUNGEON_MINIMAP_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = DUNGEON_MINIMAP_STYLE_ID;
  style.textContent = DUNGEON_MINIMAP_STYLES;
  document.head.append(style);
};

export class DungeonMinimap {
  private readonly root = document.createElement('div');
  private readonly grid = document.createElement('div');

  constructor(parent: HTMLElement, state: DungeonState) {
    ensureDungeonMinimapStyles();

    this.root.className = 'dungeon-minimap';
    this.grid.className = 'dungeon-minimap-grid';
    this.root.append(this.grid);
    parent.append(this.root);
    this.update(state);
  }

  update(state: DungeonState) {
    const visibleRooms = getVisibleRooms(state);
    const bounds = getRoomGridBounds(visibleRooms);
    const width = (bounds.maxX - bounds.minX + 1) * (CELL_SIZE + CELL_GAP) - CELL_GAP;
    const height = (bounds.maxY - bounds.minY + 1) * (CELL_SIZE + CELL_GAP) - CELL_GAP;

    this.grid.replaceChildren();
    this.grid.style.width = `${width}px`;
    this.grid.style.height = `${height}px`;

    for (const room of visibleRooms) {
      this.drawLinks(room, state, bounds);
    }

    for (const room of visibleRooms) {
      this.drawRoom(room, state, bounds);
    }
  }

  dispose() {
    this.root.remove();
    this.grid.replaceChildren();
  }

  private drawLinks(room: DungeonRoomState, state: DungeonState, bounds: RoomGridBounds) {
    const visibleIds = getVisibleRoomIds(state);

    for (const other of state.rooms.values()) {
      if (!visibleIds.has(other.id) || room.id >= other.id) continue;

      const dx = other.gridX - room.gridX;
      const dy = other.gridY - room.gridY;

      if (Math.abs(dx) + Math.abs(dy) !== 1) continue;

      const link = document.createElement('div');
      const roomPos = getRoomPixelPosition(room, bounds);
      const otherPos = getRoomPixelPosition(other, bounds);

      if (dx !== 0) {
        link.className = 'dungeon-minimap-link is-horizontal';
        link.style.left = `${Math.min(roomPos.x, otherPos.x) + CELL_SIZE}px`;
        link.style.top = `${roomPos.y + CELL_SIZE / 2 - 1.5}px`;
        link.style.width = `${CELL_GAP + 4}px`;
      } else {
        link.className = 'dungeon-minimap-link is-vertical';
        link.style.left = `${roomPos.x + CELL_SIZE / 2 - 1.5}px`;
        link.style.top = `${Math.min(roomPos.y, otherPos.y) + CELL_SIZE}px`;
        link.style.height = `${CELL_GAP + 4}px`;
      }

      this.grid.append(link);
    }
  }

  private drawRoom(room: DungeonRoomState, state: DungeonState, bounds: RoomGridBounds) {
    const cell = document.createElement('div');
    const pos = getRoomPixelPosition(room, bounds);

    cell.className = 'dungeon-minimap-room';
    cell.classList.toggle('is-visited', room.visited);
    cell.classList.toggle('is-cleared', room.phase === 'cleared');
    cell.classList.toggle('is-current', room.id === state.currentRoomId);
    cell.style.left = `${pos.x}px`;
    cell.style.top = `${pos.y}px`;
    this.grid.append(cell);
  }
}

type RoomGridBounds = {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
};

function getVisibleRooms(state: DungeonState): DungeonRoomState[] {
  const visibleIds = getVisibleRoomIds(state);

  return Array.from(state.rooms.values()).filter((room) => visibleIds.has(room.id));
}

function getVisibleRoomIds(state: DungeonState): Set<string> {
  const ids = new Set<string>();
  const visitedRooms = Array.from(state.rooms.values()).filter((room) => room.visited);

  for (const room of visitedRooms) {
    ids.add(room.id);

    for (const other of state.rooms.values()) {
      const distance = Math.abs(other.gridX - room.gridX) + Math.abs(other.gridY - room.gridY);

      if (distance === 1) {
        ids.add(other.id);
      }
    }
  }

  return ids;
}

function getRoomGridBounds(rooms: readonly DungeonRoomState[]): RoomGridBounds {
  if (rooms.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
  }

  return {
    minX: Math.min(...rooms.map((room) => room.gridX)),
    maxX: Math.max(...rooms.map((room) => room.gridX)),
    minY: Math.min(...rooms.map((room) => room.gridY)),
    maxY: Math.max(...rooms.map((room) => room.gridY))
  };
}

function getRoomPixelPosition(room: DungeonRoomState, bounds: RoomGridBounds): { readonly x: number; readonly y: number } {
  return {
    x: (room.gridX - bounds.minX) * (CELL_SIZE + CELL_GAP),
    y: (room.gridY - bounds.minY) * (CELL_SIZE + CELL_GAP)
  };
}
