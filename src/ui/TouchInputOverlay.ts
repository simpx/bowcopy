import { InputController } from '../input/InputController';
import type { InputVector } from '../input/types';
import { TOUCH_CONTROLS_RIG } from '../data/touchControlsKit';

const TOUCH_INPUT_STYLE_ID = 'bowbert-touch-input-styles';
const TOUCH_LAYOUT = TOUCH_CONTROLS_RIG.layout;
const TOUCH_STYLE = TOUCH_CONTROLS_RIG.style;
const TOUCH_INPUT = TOUCH_CONTROLS_RIG.input;
const TOUCH_COPY = TOUCH_CONTROLS_RIG.copy;

const TOUCH_INPUT_STYLES = `
.touch-input-overlay {
  position: absolute;
  inset: 0;
  z-index: ${TOUCH_LAYOUT.zIndex};
  display: none;
  pointer-events: none;
}

.touch-input-joystick,
.touch-input-dodge {
  pointer-events: auto;
  -webkit-tap-highlight-color: transparent;
}

.touch-input-joystick {
  position: absolute;
  width: ${TOUCH_LAYOUT.joystickWidth};
  aspect-ratio: 1;
  border-radius: 50%;
  touch-action: none;
}

.touch-input-joystick-left {
  z-index: 2;
  left: ${TOUCH_LAYOUT.joystickLeft};
  bottom: ${TOUCH_LAYOUT.joystickBottom};
}

.touch-input-aim-zone {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  width: ${TOUCH_LAYOUT.aimZoneWidth};
  pointer-events: auto;
  touch-action: none;
}

.touch-input-right-cluster {
  position: absolute;
  right: ${TOUCH_LAYOUT.rightClusterRight};
  bottom: ${TOUCH_LAYOUT.rightClusterBottom};
  z-index: 2;
  display: flex;
  align-items: end;
  gap: ${TOUCH_LAYOUT.rightClusterGap};
  pointer-events: none;
}

.touch-input-right-cluster .touch-input-joystick {
  position: relative;
  right: auto;
  bottom: auto;
  pointer-events: none;
}

.touch-input-joystick-ring {
  position: absolute;
  inset: 0;
  border: ${TOUCH_STYLE.ringBorder};
  border-radius: inherit;
  background: ${TOUCH_STYLE.ringBackground};
  box-shadow: ${TOUCH_STYLE.ringShadow};
}

.touch-input-joystick-stick {
  position: absolute;
  top: 50%;
  left: 50%;
  width: ${TOUCH_LAYOUT.stickWidth};
  aspect-ratio: 1;
  border: ${TOUCH_STYLE.stickBorder};
  border-radius: 50%;
  background: ${TOUCH_STYLE.stickBackground};
  box-shadow: ${TOUCH_STYLE.stickShadow};
  transform: translate3d(0, 0, 0);
  translate: -50% -50%;
  transition: transform ${TOUCH_STYLE.stickTransitionMs}ms ease-out;
}

.touch-input-joystick.is-active .touch-input-joystick-stick {
  transition: none;
}

.touch-input-dodge {
  width: ${TOUCH_LAYOUT.dodgeWidth};
  aspect-ratio: 1;
  border: ${TOUCH_STYLE.dodgeBorder};
  border-radius: 50%;
  color: ${TOUCH_STYLE.dodgeText};
  background: ${TOUCH_STYLE.dodgeBackground};
  box-shadow: ${TOUCH_STYLE.dodgeShadow};
  font: ${TOUCH_STYLE.dodgeFont};
  letter-spacing: 0;
  text-transform: uppercase;
  touch-action: none;
}

.touch-input-dodge:active {
  background: ${TOUCH_STYLE.dodgeActiveBackground};
  transform: translateY(1px);
}

@media (hover: none), (pointer: coarse) {
  .touch-input-overlay {
    display: block;
  }
}

@media (max-height: ${TOUCH_LAYOUT.compactLandscape.maxHeightPx}px) and (orientation: landscape) {
  .touch-input-joystick-left,
  .touch-input-right-cluster {
    bottom: ${TOUCH_LAYOUT.compactLandscape.joystickBottom};
  }

  .touch-input-joystick {
    width: ${TOUCH_LAYOUT.compactLandscape.joystickWidth};
  }

  .touch-input-dodge {
    width: ${TOUCH_LAYOUT.compactLandscape.dodgeWidth};
  }
}

@media (orientation: portrait) {
  .touch-input-aim-zone {
    width: ${TOUCH_LAYOUT.portraitAimZoneWidth};
  }
}
`;

type JoystickMode = 'analog' | 'direction';
type JoystickCenterMode = 'element' | 'pointer';

type JoystickElements = {
  readonly root: HTMLDivElement;
  readonly stick: HTMLDivElement;
};

type JoystickOptions = {
  readonly root: HTMLElement;
  readonly stick: HTMLElement;
  readonly eventRoot?: HTMLElement;
  readonly mode: JoystickMode;
  readonly centerMode?: JoystickCenterMode;
  readonly onStart?: () => void;
  readonly onMove: (vector: InputVector) => void;
  readonly onEnd: () => void;
};

const makeVector = (x: number, y: number): InputVector => ({ x, y });

const isActiveVector = (vector: InputVector) => Math.hypot(vector.x, vector.y) > 0;

const ensureTouchInputStyles = () => {
  if (document.getElementById(TOUCH_INPUT_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = TOUCH_INPUT_STYLE_ID;
  style.textContent = TOUCH_INPUT_STYLES;
  document.head.append(style);
};

const createJoystickElements = (className: string, label: string): JoystickElements => {
  const root = document.createElement('div');
  root.className = `touch-input-joystick ${className}`;
  root.setAttribute('role', 'application');
  root.setAttribute('aria-label', label);

  const ring = document.createElement('div');
  ring.className = 'touch-input-joystick-ring';

  const stick = document.createElement('div');
  stick.className = 'touch-input-joystick-stick';

  root.append(ring, stick);

  return { root, stick };
};

class VirtualJoystick {
  private pointerId?: number;
  private centerX = 0;
  private centerY = 0;
  private radius = 1;
  private readonly eventRoot: HTMLElement;

  constructor(private readonly options: JoystickOptions) {
    this.eventRoot = options.eventRoot ?? options.root;
    this.eventRoot.addEventListener('pointerdown', this.handlePointerDown);
  }

  dispose() {
    this.eventRoot.removeEventListener('pointerdown', this.handlePointerDown);
    this.removeWindowListeners();
    this.pointerId = undefined;
  }

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (this.pointerId !== undefined) {
      return;
    }

    event.preventDefault();
    this.pointerId = event.pointerId;
    this.measure(event);
    this.options.root.classList.add('is-active');
    this.eventRoot.setPointerCapture(event.pointerId);
    this.options.onStart?.();
    this.updateFromPointer(event);

    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerEnd);
    window.addEventListener('pointercancel', this.handlePointerEnd);
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    event.preventDefault();
    this.updateFromPointer(event);
  };

  private readonly handlePointerEnd = (event: PointerEvent) => {
    if (event.pointerId !== this.pointerId) {
      return;
    }

    event.preventDefault();
    if (this.eventRoot.hasPointerCapture(event.pointerId)) {
      this.eventRoot.releasePointerCapture(event.pointerId);
    }
    this.options.root.classList.remove('is-active');
    this.options.stick.style.transform = 'translate3d(0, 0, 0)';
    this.pointerId = undefined;
    this.options.onEnd();
    this.removeWindowListeners();
  };

  private measure(event: PointerEvent) {
    const rect = this.options.root.getBoundingClientRect();

    if (this.options.centerMode === 'pointer') {
      this.centerX = event.clientX;
      this.centerY = event.clientY;
    } else {
      this.centerX = rect.left + rect.width / 2;
      this.centerY = rect.top + rect.height / 2;
    }

    this.radius = Math.max(1, Math.min(rect.width, rect.height) * TOUCH_INPUT.radiusFactor);
  }

  private updateFromPointer(event: PointerEvent) {
    const dx = event.clientX - this.centerX;
    const dy = event.clientY - this.centerY;
    const distance = Math.hypot(dx, dy);
    const limitedDistance = Math.min(distance, this.radius);
    const directionX = distance > 0 ? dx / distance : 0;
    const directionY = distance > 0 ? dy / distance : 0;
    const visualX = directionX * limitedDistance;
    const visualY = directionY * limitedDistance;

    this.options.stick.style.transform = `translate3d(${visualX}px, ${visualY}px, 0)`;

    if (this.options.mode === 'direction') {
      this.options.onMove(
        distance > this.radius * TOUCH_INPUT.directionDeadZone
          ? makeVector(directionX, directionY)
          : makeVector(0, 0)
      );
      return;
    }

    this.options.onMove(makeVector(visualX / this.radius, visualY / this.radius));
  }

  private removeWindowListeners() {
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerEnd);
    window.removeEventListener('pointercancel', this.handlePointerEnd);
  }
}

export class TouchInputOverlay {
  private readonly root = document.createElement('div');
  private readonly leftJoystick: VirtualJoystick;
  private readonly rightJoystick: VirtualJoystick;
  private readonly dodgeButton = document.createElement('button');

  constructor(parent: HTMLElement, input: InputController) {
    ensureTouchInputStyles();

    this.root.className = 'touch-input-overlay';

    const left = createJoystickElements('touch-input-joystick-left', TOUCH_COPY.movementLabel);
    const right = createJoystickElements('touch-input-joystick-right', TOUCH_COPY.aimLabel);
    const aimZone = document.createElement('div');
    const rightCluster = document.createElement('div');

    aimZone.className = 'touch-input-aim-zone';
    aimZone.setAttribute('aria-label', TOUCH_COPY.aimZoneLabel);

    rightCluster.className = 'touch-input-right-cluster';

    this.dodgeButton.type = 'button';
    this.dodgeButton.className = 'touch-input-dodge';
    this.dodgeButton.textContent = TOUCH_COPY.dodge;
    this.dodgeButton.setAttribute('aria-label', TOUCH_COPY.dodge);
    this.dodgeButton.addEventListener('pointerdown', this.handleDodgePointerDown);

    rightCluster.append(this.dodgeButton, right.root);
    this.root.append(left.root, aimZone, rightCluster);
    parent.append(this.root);

    this.leftJoystick = new VirtualJoystick({
      root: left.root,
      stick: left.stick,
      mode: TOUCH_INPUT.leftMode,
      onMove: (vector) => input.setMoveVector(vector, 'touch'),
      onEnd: () => input.setMoveVector(makeVector(0, 0), 'touch')
    });

    this.rightJoystick = new VirtualJoystick({
      root: right.root,
      stick: right.stick,
      eventRoot: aimZone,
      mode: TOUCH_INPUT.rightMode,
      centerMode: TOUCH_INPUT.rightCenterMode,
      onMove: (vector) => {
        input.setAimVector(vector, 'touch');
        input.setFiring(isActiveVector(vector), 'touch');
      },
      onEnd: () => input.releaseAim('touch')
    });

    this.handleDodge = () => input.emitDodge('touch');
  }

  dispose() {
    this.leftJoystick.dispose();
    this.rightJoystick.dispose();
    this.dodgeButton.removeEventListener('pointerdown', this.handleDodgePointerDown);
    this.root.remove();
  }

  private handleDodge: () => void = () => {};

  private readonly handleDodgePointerDown = (event: PointerEvent) => {
    event.preventDefault();
    this.handleDodge();
  };
}
