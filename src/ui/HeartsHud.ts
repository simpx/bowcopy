import type { PlayerHealthState } from '../game/PlayerHealth';

const HEARTS_HUD_STYLE_ID = 'bowbert-hearts-hud-styles';
const DAMAGE_CLASS_MS = 360;
const HEART_PATH =
  'M22 36.5C17.3 32.9 12.4 29.2 8.9 25.3C5.4 21.4 3.8 17.3 4.6 13.1C5.4 8 9.5 4.3 14.5 4.5C18.3 4.6 20.6 6.3 22 9.1C23.8 6.2 26.8 4.3 30.7 4.5C36.4 4.8 40.4 8.9 40.2 14.4C40 23.1 30.8 30.2 22 36.5Z';
const HEART_HIGHLIGHT_PATH = 'M11.2 11.1C12.7 8.8 15.9 7.6 18.4 8.9';
const HEARTS_HUD_STYLES = `
.hearts-hud {
  position: absolute;
  top: max(9px, env(safe-area-inset-top));
  left: max(11px, env(safe-area-inset-left));
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.hearts-hud-row {
  display: flex;
  align-items: center;
  gap: clamp(5px, 0.85vmin, 9px);
  height: clamp(28px, 5.1vmin, 40px);
}

.hearts-hud-heart {
  position: relative;
  width: clamp(27px, 4.9vmin, 38px);
  aspect-ratio: 44 / 40;
  transform: translateY(0) rotate(-3deg);
  filter:
    drop-shadow(0 2px 0 #050805)
    drop-shadow(0 4px 3px rgb(0 0 0 / 34%));
  transition:
    opacity 140ms ease,
    transform 140ms ease;
}

.hearts-hud-heart:nth-child(2n) {
  transform: translateY(1px) rotate(2deg);
}

.hearts-hud-heart::after {
  position: absolute;
  left: 50%;
  bottom: -4px;
  width: 4px;
  height: 9px;
  border-radius: 999px;
  background: #050805;
  content: "";
  transform: translateX(-50%) rotate(4deg);
  z-index: -1;
}

.hearts-hud-heart svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.hearts-hud-heart-shell {
  fill: #4a3538;
  opacity: 0.72;
}

.hearts-hud-heart-fill {
  fill: #ff3f68;
  clip-path: inset(0 100% 0 0);
  transition: clip-path 140ms ease;
}

.hearts-hud-heart-highlight {
  fill: none;
  stroke: #fff3ee;
  stroke-width: 3.5;
  stroke-linecap: round;
  opacity: 0;
}

.hearts-hud-heart-outline {
  fill: none;
  stroke: #030604;
  stroke-width: 5.1;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.hearts-hud-heart.is-full .hearts-hud-heart-fill {
  clip-path: inset(0 0 0 0);
}

.hearts-hud-heart.is-half .hearts-hud-heart-fill {
  clip-path: inset(0 50% 0 0);
}

.hearts-hud-heart.is-full .hearts-hud-heart-highlight,
.hearts-hud-heart.is-half .hearts-hud-heart-highlight {
  opacity: 0.86;
}

.hearts-hud-heart.is-empty {
  opacity: 0.64;
  transform: translateY(2px) scale(0.94) rotate(-3deg);
}

.hearts-hud.is-damaged {
  animation: hearts-hud-wiggle 320ms ease-out;
}

.hearts-hud.is-damaged .hearts-hud-heart.is-full,
.hearts-hud.is-damaged .hearts-hud-heart.is-half {
  animation: hearts-hud-flash 320ms ease-out;
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
    filter:
      drop-shadow(0 2px 0 #050805)
      drop-shadow(0 4px 3px rgb(0 0 0 / 34%));
  }

  35% {
    filter:
      drop-shadow(0 0 8px rgb(255 240 212 / 82%))
      drop-shadow(0 2px 0 #050805)
      drop-shadow(0 4px 3px rgb(0 0 0 / 28%));
  }
}

@media (max-height: 430px) and (orientation: landscape) {
  .hearts-hud {
    top: max(10px, env(safe-area-inset-top));
    left: max(10px, env(safe-area-inset-left));
    gap: 5px;
  }

  .hearts-hud-row {
    gap: 5px;
    height: clamp(20px, 5.4vh, 26px);
  }

  .hearts-hud-heart {
    width: clamp(20px, 5.2vh, 26px);
  }

}

@media (prefers-reduced-motion: reduce) {
  .hearts-hud.is-damaged,
  .hearts-hud.is-damaged .hearts-hud-heart.is-full {
    animation: none;
  }
}
`;

const formatHealth = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(1);

const createHeartMarkup = (): string => `
<svg viewBox="0 0 44 40" aria-hidden="true" focusable="false">
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
