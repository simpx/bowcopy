import type { PlayerHealthState } from '../game/PlayerHealth';
import { HEARTS_HUD_RIG } from '../data/uiHudKit';

const HEARTS_HUD_STYLE_ID = 'bowbert-hearts-hud-styles';
const DAMAGE_CLASS_MS = HEARTS_HUD_RIG.motion.damageClassMs;
const HEART_PATH = HEARTS_HUD_RIG.shape.heartPath;
const HEART_HIGHLIGHT_PATH = HEARTS_HUD_RIG.shape.highlightPath;
const HEARTS_HUD_STYLES = `
.hearts-hud {
  position: absolute;
  top: ${HEARTS_HUD_RIG.layout.top};
  left: ${HEARTS_HUD_RIG.layout.left};
  z-index: ${HEARTS_HUD_RIG.layout.zIndex};
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.hearts-hud-row {
  display: flex;
  align-items: center;
  gap: ${HEARTS_HUD_RIG.layout.rowGap};
  height: ${HEARTS_HUD_RIG.layout.rowHeight};
}

.hearts-hud-heart {
  position: relative;
  width: ${HEARTS_HUD_RIG.layout.heartWidth};
  aspect-ratio: ${HEARTS_HUD_RIG.shape.aspectRatio};
  transform: translateY(0) rotate(${HEARTS_HUD_RIG.style.baseTiltDeg}deg);
  filter: ${HEARTS_HUD_RIG.style.dropShadow};
  transition:
    opacity ${HEARTS_HUD_RIG.motion.transitionMs}ms ease,
    transform ${HEARTS_HUD_RIG.motion.transitionMs}ms ease;
}

.hearts-hud-heart:nth-child(2n) {
  transform: translateY(${HEARTS_HUD_RIG.style.alternateYOffsetPx}px) rotate(${HEARTS_HUD_RIG.style.alternateTiltDeg}deg);
}

.hearts-hud-heart::after {
  position: absolute;
  left: 50%;
  bottom: ${HEARTS_HUD_RIG.shape.peg.bottom};
  width: ${HEARTS_HUD_RIG.shape.peg.width};
  height: ${HEARTS_HUD_RIG.shape.peg.height};
  border-radius: 999px;
  background: ${HEARTS_HUD_RIG.colors.peg};
  content: "";
  transform: translateX(-50%) rotate(${HEARTS_HUD_RIG.shape.peg.rotationDeg}deg);
  z-index: -1;
}

.hearts-hud-heart svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.hearts-hud-heart-shell {
  fill: ${HEARTS_HUD_RIG.colors.shell};
  opacity: ${HEARTS_HUD_RIG.style.shellOpacity};
}

.hearts-hud-heart-fill {
  fill: ${HEARTS_HUD_RIG.colors.fill};
  clip-path: ${HEARTS_HUD_RIG.states.empty.clipPath};
  transition: clip-path ${HEARTS_HUD_RIG.motion.transitionMs}ms ease;
}

.hearts-hud-heart-highlight {
  fill: none;
  stroke: ${HEARTS_HUD_RIG.colors.highlight};
  stroke-width: ${HEARTS_HUD_RIG.style.highlightWidth};
  stroke-linecap: round;
  opacity: 0;
}

.hearts-hud-heart-outline {
  fill: none;
  stroke: ${HEARTS_HUD_RIG.colors.outline};
  stroke-width: ${HEARTS_HUD_RIG.style.outlineWidth};
  stroke-linejoin: round;
  stroke-linecap: round;
}

.hearts-hud-heart.is-full .hearts-hud-heart-fill {
  clip-path: ${HEARTS_HUD_RIG.states.full.clipPath};
}

.hearts-hud-heart.is-half .hearts-hud-heart-fill {
  clip-path: ${HEARTS_HUD_RIG.states.half.clipPath};
}

.hearts-hud-heart.is-full .hearts-hud-heart-highlight,
.hearts-hud-heart.is-half .hearts-hud-heart-highlight {
  opacity: ${HEARTS_HUD_RIG.style.highlightOpacity};
}

.hearts-hud-heart.is-empty {
  opacity: ${HEARTS_HUD_RIG.style.emptyOpacity};
  transform: translateY(${HEARTS_HUD_RIG.style.emptyYOffsetPx}px) scale(${HEARTS_HUD_RIG.style.emptyScale}) rotate(${HEARTS_HUD_RIG.style.baseTiltDeg}deg);
}

.hearts-hud.is-damaged {
  animation: hearts-hud-wiggle ${HEARTS_HUD_RIG.motion.wiggleMs}ms ease-out;
}

.hearts-hud.is-damaged .hearts-hud-heart.is-full,
.hearts-hud.is-damaged .hearts-hud-heart.is-half {
  animation: hearts-hud-flash ${HEARTS_HUD_RIG.motion.flashMs}ms ease-out;
}

@keyframes hearts-hud-wiggle {
  0%,
  100% {
    transform: translate3d(0, 0, 0);
  }

  18% {
    transform: translate3d(-4px, 0, 0);
  }

  36% {
    transform: translate3d(5px, 0, 0);
  }

  58% {
    transform: translate3d(-3px, 0, 0);
  }

  78% {
    transform: translate3d(2px, 0, 0);
  }
}

@keyframes hearts-hud-flash {
  0%,
  100% {
    filter: ${HEARTS_HUD_RIG.style.dropShadow};
  }

  35% {
    filter: ${HEARTS_HUD_RIG.style.flashShadow};
  }
}

@media (max-height: ${HEARTS_HUD_RIG.layout.compactLandscape.maxHeightPx}px) and (orientation: landscape) {
  .hearts-hud {
    top: ${HEARTS_HUD_RIG.layout.compactLandscape.top};
    left: ${HEARTS_HUD_RIG.layout.compactLandscape.left};
    gap: 5px;
  }

  .hearts-hud-row {
    gap: ${HEARTS_HUD_RIG.layout.compactLandscape.rowGap};
    height: ${HEARTS_HUD_RIG.layout.compactLandscape.rowHeight};
  }

  .hearts-hud-heart {
    width: ${HEARTS_HUD_RIG.layout.compactLandscape.heartWidth};
  }

}

@media (prefers-reduced-motion: reduce) {
  .hearts-hud.is-damaged,
  .hearts-hud.is-damaged .hearts-hud-heart.is-full,
  .hearts-hud.is-damaged .hearts-hud-heart.is-half {
    animation: none;
  }
}
`;

const formatHealth = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const createHeartMarkup = (): string => `
<svg viewBox="${HEARTS_HUD_RIG.shape.viewBox}" aria-hidden="true" focusable="false">
  <path class="hearts-hud-heart-shell" d="${HEART_PATH}" />
  <path class="hearts-hud-heart-fill" d="${HEART_PATH}" />
  <path class="hearts-hud-heart-highlight" d="${HEART_HIGHLIGHT_PATH}" />
  <path class="hearts-hud-heart-outline" d="${HEART_PATH}" />
</svg>`;

const ensureHeartsHudStyles = () => {
  if (document.getElementById(HEARTS_HUD_STYLE_ID)) {
    return;
  }

  const style = document.createElement('style');
  style.id = HEARTS_HUD_STYLE_ID;
  style.textContent = HEARTS_HUD_STYLES;
  document.head.append(style);
};

export class HeartsHud {
  private readonly root = document.createElement('div');
  private readonly heartsRow = document.createElement('div');
  private readonly hearts: HTMLDivElement[] = [];
  private damageTimeout?: number;

  constructor(parent: HTMLElement, state: PlayerHealthState) {
    ensureHeartsHudStyles();

    this.root.className = 'hearts-hud';
    this.heartsRow.className = 'hearts-hud-row';
    this.root.append(this.heartsRow);
    parent.append(this.root);
    this.update(state);
  }

  update(state: PlayerHealthState) {
    const heartCount = Math.ceil(state.max);

    while (this.hearts.length < heartCount) {
      const heart = document.createElement('div');

      heart.className = 'hearts-hud-heart';
      heart.innerHTML = createHeartMarkup();
      this.heartsRow.append(heart);
      this.hearts.push(heart);
    }

    while (this.hearts.length > heartCount) {
      this.hearts.pop()?.remove();
    }

    this.root.setAttribute('aria-label', `Health: ${formatHealth(state.current)} of ${formatHealth(state.max)}`);

    for (let index = 0; index < this.hearts.length; index += 1) {
      const heart = this.hearts[index];
      const fill = Math.max(0, Math.min(1, state.current - index));

      heart.classList.toggle('is-full', fill >= 1);
      heart.classList.toggle('is-half', fill > 0 && fill < 1);
      heart.classList.toggle('is-empty', fill <= 0);
    }
  }

  flashDamage() {
    window.clearTimeout(this.damageTimeout);
    this.root.classList.remove('is-damaged');
    void this.root.offsetHeight;
    this.root.classList.add('is-damaged');
    this.damageTimeout = window.setTimeout(() => {
      this.root.classList.remove('is-damaged');
      this.damageTimeout = undefined;
    }, DAMAGE_CLASS_MS);
  }

  dispose() {
    window.clearTimeout(this.damageTimeout);
    this.root.remove();
    this.hearts.length = 0;
  }
}
