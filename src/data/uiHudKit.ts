import heartsHudRigJson from '../../assets/ui/hearts/rig.json';

export interface HeartsHudRig {
  readonly id: string;
  readonly status: string;
  readonly shape: {
    readonly viewBox: string;
    readonly heartPath: string;
    readonly highlightPath: string;
    readonly aspectRatio: string;
    readonly peg: {
      readonly width: string;
      readonly height: string;
      readonly bottom: string;
      readonly rotationDeg: number;
    };
  };
  readonly layout: {
    readonly top: string;
    readonly left: string;
    readonly rowGap: string;
    readonly rowHeight: string;
    readonly heartWidth: string;
    readonly zIndex: number;
    readonly compactLandscape: {
      readonly maxHeightPx: number;
      readonly top: string;
      readonly left: string;
      readonly rowGap: string;
      readonly rowHeight: string;
      readonly heartWidth: string;
    };
  };
  readonly colors: {
    readonly shell: string;
    readonly fill: string;
    readonly highlight: string;
    readonly outline: string;
    readonly peg: string;
  };
  readonly style: {
    readonly outlineWidth: number;
    readonly highlightWidth: number;
    readonly shellOpacity: number;
    readonly highlightOpacity: number;
    readonly emptyOpacity: number;
    readonly emptyScale: number;
    readonly baseTiltDeg: number;
    readonly alternateTiltDeg: number;
    readonly alternateYOffsetPx: number;
    readonly emptyYOffsetPx: number;
    readonly dropShadow: string;
    readonly flashShadow: string;
  };
  readonly states: {
    readonly full: {
      readonly clipPath: string;
    };
    readonly half: {
      readonly clipPath: string;
    };
    readonly empty: {
      readonly clipPath: string;
    };
  };
  readonly motion: {
    readonly transitionMs: number;
    readonly damageClassMs: number;
    readonly wiggleMs: number;
    readonly flashMs: number;
  };
}

export const HEARTS_HUD_RIG = heartsHudRigJson as HeartsHudRig;
