import touchControlsRigJson from '../../assets/ui/touch-controls/rig.json';

export interface TouchControlsRig {
  readonly id: string;
  readonly status: string;
  readonly layout: {
    readonly zIndex: number;
    readonly joystickWidth: string;
    readonly joystickLeft: string;
    readonly joystickBottom: string;
    readonly rightClusterRight: string;
    readonly rightClusterBottom: string;
    readonly rightClusterGap: string;
    readonly aimZoneWidth: string;
    readonly portraitAimZoneWidth: string;
    readonly stickWidth: string;
    readonly dodgeWidth: string;
    readonly compactLandscape: {
      readonly maxHeightPx: number;
      readonly joystickBottom: string;
      readonly joystickWidth: string;
      readonly dodgeWidth: string;
    };
  };
  readonly style: {
    readonly ringBorder: string;
    readonly ringBackground: string;
    readonly ringShadow: string;
    readonly stickBorder: string;
    readonly stickBackground: string;
    readonly stickShadow: string;
    readonly stickTransitionMs: number;
    readonly dodgeBorder: string;
    readonly dodgeText: string;
    readonly dodgeBackground: string;
    readonly dodgeActiveBackground: string;
    readonly dodgeShadow: string;
    readonly dodgeFont: string;
  };
  readonly input: {
    readonly leftMode: 'analog' | 'direction';
    readonly rightMode: 'analog' | 'direction';
    readonly rightCenterMode: 'element' | 'pointer';
    readonly radiusFactor: number;
    readonly directionDeadZone: number;
  };
  readonly copy: {
    readonly dodge: string;
    readonly movementLabel: string;
    readonly aimLabel: string;
    readonly aimZoneLabel: string;
  };
}

export const TOUCH_CONTROLS_RIG = touchControlsRigJson as TouchControlsRig;
