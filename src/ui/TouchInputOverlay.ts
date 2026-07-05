import { InputController } from '../input/InputController';
import type { InputVector } from '../input/types';

const TOUCH_INPUT_STYLE_ID = 'bowbert-touch-input-styles';
const TOUCH_INPUT_STYLES = `
.touch-input-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
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
  width: clamp(104px, 19vmin, 132px);
  aspect-ratio: 1;
  border-radius: 50%;
  touch-action: none;
}

.touch-input-joystick-left {
  z-index: 2;
  left: max(18px, env(safe-area-inset-left));
  bottom: max(18px, env(safe-area-inset-bottom));
}

.touch-input-aim-zone {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1;
  width: 58%;
  pointer-events: auto;
  touch-action: none;
}

.touch-input-right-cluster {
  position: absolute;
  right: max(18px, env(safe-area-inset-right));
  bottom: max(18px, env(safe-area-inset-bottom));
  z-index: 2;
  display: flex;
  align-items: end;
  gap: clamp(12px, 2.6vmin, 20px);
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
  border: 2px solid rgb(218 235 255 / 48%);
  border-radius: inherit;
  background:
    radial-gradient(circle at center, rgb(248 241 220 / 12%) 0 31%, transparent 32%),
    rgb(17 23 34 / 44%);
  box-shadow: 0 10px 34px rgb(0 0 0 / 26%);
}

.touch-input-joystick-stick {
  position: absolute;
  top: 50%;
  left: 50%;
  width: clamp(42px, 8vmin, 56px);
  aspect-ratio: 1;
  border: 2px solid rgb(248 241 220 / 72%);
  border-radius: 50%;
  background: rgb(248 241 220 / 30%);
  box-shadow: 0 6px 18px rgb(0 0 0 / 22%);
  transform: translate3d(0, 0, 0);
  translate: -50% -50%;
  transition: transform 80ms ease-out;
}

.touch-input-joystick.is-active .touch-input-joystick-stick {
  transition: none;
}

.touch-input-dodge {
  width: clamp(64px, 11vmin, 78px);
  aspect-ratio: 1;
  border: 2px solid rgb(248 241 220 / 64%);
  border-radius: 50%;
  color: #f8f1dc;
  background: rgb(92 225 185 / 24%);
  box-shadow: 0 10px 34px rgb(0 0 0 / 24%);
  font: 700 clamp(11px, 2.1vmin, 13px) / 1 Inter, ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0;
  text-transform: uppercase;
  touch-action: none;
}

.touch-input-dodge:active {
  background: rgb(92 225 185 / 42%);
  transform: translateY(1px);
}

@media (hover: none), (pointer: coarse) {
  .touch-input-overlay {
    display: block;
  }
}

@media (max-height: 430px) and (orientation: landscape) {
  .touch-input-joystick-left,
  .touch-input-right-cluster {
    bottom: max(12px, env(safe-area-inset-bottom));
  }

  .touch-input-joystick {
    width: clamp(88px, 22vh, 108px);
  }

  .touch-input-dodge {
    width: clamp(56px, 14vh, 66px);
  }
}

@media (orientation: portrait) {
  .touch-input-aim-zone {
    width: 64%;
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

    this.radius = Math.max(1, Math.min(rect.width, rect.height) * 0.38);
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
      this.options.onMove(distance > this.radius * 0.12 ? makeVector(directionX, directionY) : makeVector(0, 0));
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

    const left = createJoystickElements('touch-input-joystick-left', 'Movement joystick');
    const right = createJoystickElements('touch-input-joystick-right', 'Aim and fire joystick');
    const aimZone = document.createElement('div');
    const rightCluster = document.createElement('div');

    aimZone.className = 'touch-input-aim-zone';
    aimZone.setAttribute('aria-label', 'Aim and fire area');

    rightCluster.className = 'touch-input-right-cluster';

    this.dodgeButton.type = 'button';
    this.dodgeButton.className = 'touch-input-dodge';
    this.dodgeButton.textContent = 'Dodge';
    this.dodgeButton.setAttribute('aria-label', 'Dodge');
    this.dodgeButton.addEventListener('pointerdown', this.handleDodgePointerDown);

    rightCluster.append(this.dodgeButton, right.root);
    this.root.append(left.root, aimZone, rightCluster);
    parent.append(this.root);

    this.leftJoystick = new VirtualJoystick({
      root: left.root,
      stick: left.stick,
      mode: 'analog',
      onMove: (vector) => input.setMoveVector(vector, 'touch'),
      onEnd: () => input.setMoveVector(makeVector(0, 0), 'touch')
    });

    this.rightJoystick = new VirtualJoystick({
      root: right.root,
      stick: right.stick,
      eventRoot: aimZone,
      mode: 'direction',
      centerMode: 'pointer',
      onStart: () => input.setFiring(true, 'touch'),
      onMove: (vector) => input.setAimVector(vector, 'touch'),
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
