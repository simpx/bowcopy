import type { PlayerHealthState } from '../game/PlayerHealth';

const HEARTS_HUD_STYLE_ID = 'bowbert-hearts-hud-styles';
const DAMAGE_CLASS_MS = 360;
const HEARTS_HUD_STYLES = `
.hearts-hud {
  position: absolute;
  top: max(10px, env(safe-area-inset-top));
  left: max(10px, env(safe-area-inset-left));
  z-index: 6;
  display: flex;
  align-items: center;
  gap: 7px;
  pointer-events: none;
}

.hearts-hud-row {
  display: flex;
  align-items: center;
  gap: 7px;
  height: clamp(22px, 4.4vmin, 34px);
}

.hearts-hud-heart {
  position: relative;
  width: clamp(15px, 2.9vmin, 22px);
  aspect-ratio: 1;
  transform: rotate(-45deg);
  opacity: 0.38;
  filter:
    drop-shadow(2px 0 0 #050805)
    drop-shadow(-2px 0 0 #050805)
    drop-shadow(0 2px 0 #050805)
    drop-shadow(0 -2px 0 #050805)
    drop-shadow(0 3px 2px rgb(0 0 0 / 34%));
}

.hearts-hud-heart,
.hearts-hud-heart::before,
.hearts-hud-heart::after {
  background: #40272c;
  transition:
    background 140ms ease,
    opacity 140ms ease,
    transform 140ms ease;
}

.hearts-hud-heart::before,
.hearts-hud-heart::after {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  content: "";
}

.hearts-hud-heart::before {
  top: -50%;
  left: 0;
}

.hearts-hud-heart::after {
  top: 0;
  left: 50%;
}

.hearts-hud-heart.is-full {
  opacity: 1;
}

.hearts-hud-heart.is-full,
.hearts-hud-heart.is-full::before,
.hearts-hud-heart.is-full::after {
  background: #e85e5d;
}

.hearts-hud.is-damaged {
  animation: hearts-hud-wiggle 320ms ease-out;
}

.hearts-hud.is-damaged .hearts-hud-heart.is-full {
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
    filter: drop-shadow(0 2px 3px rgb(0 0 0 / 28%));
  }

  35% {
    filter:
      drop-shadow(0 0 8px rgb(255 240 212 / 82%))
      drop-shadow(0 2px 3px rgb(0 0 0 / 24%));
  }
}

@media (max-height: 430px) and (orientation: landscape) {
  .hearts-hud {
    top: max(10px, env(safe-area-inset-top));
    left: max(10px, env(safe-area-inset-left));
    gap: 5px;
  }

  .hearts-hud-row {
    gap: 6px;
    height: clamp(16px, 4.6vh, 20px);
  }

  .hearts-hud-heart {
    width: clamp(13px, 4vh, 17px);
  }

}

@media (prefers-reduced-motion: reduce) {
  .hearts-hud.is-damaged,
  .hearts-hud.is-damaged .hearts-hud-heart.is-full {
    animation: none;
  }
}
`;

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
    while (this.hearts.length < state.max) {
      const heart = document.createElement('div');

      heart.className = 'hearts-hud-heart';
      this.heartsRow.append(heart);
      this.hearts.push(heart);
    }

    while (this.hearts.length > state.max) {
      this.hearts.pop()?.remove();
    }

    this.root.setAttribute('aria-label', `Health: ${state.current} of ${state.max}`);

    for (let index = 0; index < this.hearts.length; index += 1) {
      this.hearts[index].classList.toggle('is-full', index < state.current);
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
