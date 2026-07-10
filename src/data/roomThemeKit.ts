import roomThemeKitJson from '../../assets/rooms/room-theme-kit.json';

import type { RoomDoorSide, RoomTheme } from '../sim/rooms/combatRoom';

export type RoomVisualThemeId = 'start' | 'forest' | 'stone' | 'mushroom' | 'wizard' | 'boss';
export type FloorPropKind = 'stump' | 'stone' | 'mushroom';
export type FloorDetailShape = 'v-grass' | 'w-grass' | 'split-grass' | 'tiny-dash';
export type RoomThemeKitDungeonKind = 'start' | 'normal' | 'wizard' | 'boss';

export interface FloorProp {
  readonly kind: FloorPropKind;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly rotation: number;
}

export interface RoomThemeKitDoorTemplate {
  readonly center: number;
  readonly span: number;
  readonly depth: number;
}

export interface RoomThemeKitFloorDetails {
  readonly gridStep: {
    readonly x: number;
    readonly y: number;
  };
  readonly padding: {
    readonly x: number;
    readonly y: number;
  };
  readonly skipBelowSeed: number;
  readonly shapeMix: readonly {
    readonly shape: FloorDetailShape;
    readonly maxSeed: number;
  }[];
  readonly pebbleSeed: number;
  readonly scuffSeed: number;
}

export interface RoomThemeKitTheme {
  readonly assetFolder: string | null;
  readonly runtimeTheme: RoomTheme;
  readonly label: string;
  readonly floorColor: string;
  readonly decorSeed: number;
  readonly extraProps: readonly FloorProp[];
  readonly encounter: {
    readonly kind: string;
    readonly preferredEnemies: readonly string[];
  };
}

export interface RoomThemeKit {
  readonly id: string;
  readonly status: string;
  readonly room: {
    readonly bounds: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly border: number;
    };
    readonly trigger: {
      readonly x: number;
      readonly y: number;
      readonly radius: number;
    };
    readonly doors: Record<RoomDoorSide, RoomThemeKitDoorTemplate>;
    readonly spawnPoints: readonly {
      readonly id: string;
      readonly x: number;
      readonly y: number;
    }[];
    readonly floorMarks: readonly {
      readonly id: string;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly rotation: number;
      readonly alpha: number;
    }[];
  };
  readonly palette: Record<string, string>;
  readonly floorDetails: RoomThemeKitFloorDetails;
  readonly baseProps: readonly FloorProp[];
  readonly themes: Record<RoomVisualThemeId, RoomThemeKitTheme>;
  readonly dungeonDsl: {
    /** Seeded layout generator: fixed intro/antechamber/boss plus shuffled pools. */
    readonly generator?: {
      readonly intro: string;
      readonly spine: readonly string[];
      readonly pockets: readonly string[];
      readonly antechamber: string;
      readonly boss: string;
    };
    readonly rows: readonly string[];
    readonly legend: Record<
      string,
      {
        readonly kind: RoomThemeKitDungeonKind;
        readonly theme: RoomVisualThemeId;
        /** Encounter kind pinned to rooms of this symbol (level design). */
        readonly encounter?: string;
        /** Enemy budget override; falls back to the depth formula. */
        readonly budget?: number;
        /** Mixed rooms: several encounters run at once, each with its own budget. */
        readonly encounters?: readonly { readonly kind: string; readonly budget: number }[];
      }
    >;
  };
}

export const ROOM_THEME_KIT = roomThemeKitJson as RoomThemeKit;

export const ROOM_VISUAL_THEME_BY_RUNTIME_THEME: Record<RoomTheme, RoomVisualThemeId> = {
  start: 'start',
  wood: 'forest',
  stone: 'stone',
  mushroom: 'mushroom',
  wizard: 'wizard',
  boss: 'boss'
};

export const ROOM_RUNTIME_THEME_BY_VISUAL_THEME: Record<RoomVisualThemeId, RoomTheme> = {
  start: 'start',
  forest: 'wood',
  stone: 'stone',
  mushroom: 'mushroom',
  wizard: 'wizard',
  boss: 'boss'
};

export function hexColorToNumber(hexColor: string): number {
  return Number.parseInt(hexColor.replace('#', ''), 16);
}

export function getRoomThemeKitTheme(runtimeTheme: RoomTheme): RoomThemeKitTheme {
  return ROOM_THEME_KIT.themes[ROOM_VISUAL_THEME_BY_RUNTIME_THEME[runtimeTheme]];
}
