const BOSS_HUD_STYLE_ID = 'bowbert-boss-hud-styles';

const BOSS_HUD_STYLES = `
.boss-hud {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 30;
  width: min(46vw, 460px);
  pointer-events: none;
  display: none;
  flex-direction: column;
  gap: 4px;
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
}

.boss-hud.visible {
  display: flex;
}

.boss-hud-name {
  align-self: center;
  color: #f0e4ff;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.24em;
  text-shadow: 0 2px 0 rgb(10 5 20 / 80%);
}

.boss-hud-bar {
  height: 14px;
  border: 2px solid #0a0512;
  border-radius: 999px;
  background: rgb(10 5 20 / 78%);
  overflow: hidden;
  box-shadow: 0 2px 0 rgb(10 5 20 / 50%);
}

.boss-hud-fill {
  height: 100%;
  width: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, #c65df0, #6a3bb8);
  transition: width 180ms ease;
}

.boss-hud-cast {
  height: 6px;
  border: 2px solid #0a0512;
  border-radius: 999px;
  background: rgb(10 5 20 / 78%);
  overflow: hidden;
  opacity: 0;
  transition: opacity 150ms ease;
}

.boss-hud-cast.active {
  opacity: 1;
}

.boss-hud-cast-fill {
  height: 100%;
  width: 0%;
  border-radius: 999px;
  background: linear-gradient(180deg, #b8f07a, #4a8a2a);
}

.boss-intro {
  position: absolute;
  inset: 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  pointer-events: none;
  opacity: 0;
}


.boss-intro-name {
  color: #f0e4ff;
  font-size: clamp(34px, 7vw, 64px);
  font-weight: 900;
  letter-spacing: 0.3em;
  text-shadow:
    0 4px 0 rgb(10 5 20 / 90%),
    0 0 34px rgb(198 93 240 / 70%);
}

.boss-intro-subtitle {
  color: #c9b3e8;
  font-size: clamp(13px, 2vw, 18px);
  font-weight: 700;
  letter-spacing: 0.5em;
  text-transform: uppercase;
  text-shadow: 0 2px 0 rgb(10 5 20 / 80%);
}
`;

export interface BossStatus {
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
  /** 0..1 while the boss is channeling (renders the cast bar). */
  readonly castProgress?: number;
}

/** Top-center boss name + health bar, shown while a boss kit reports one. */
export class BossHud {
  private readonly root: HTMLDivElement;
  private readonly name: HTMLDivElement;
  private readonly fill: HTMLDivElement;
  private readonly cast: HTMLDivElement;
  private readonly castFill: HTMLDivElement;
  private readonly intro: HTMLDivElement;
  private readonly introName: HTMLDivElement;
  private readonly introSubtitle: HTMLDivElement;

  constructor(parent: HTMLElement) {
    if (!document.getElementById(BOSS_HUD_STYLE_ID)) {
      const style = document.createElement('style');

      style.id = BOSS_HUD_STYLE_ID;
      style.textContent = BOSS_HUD_STYLES;
      document.head.append(style);
    }

    this.root = document.createElement('div');
    this.root.className = 'boss-hud';
    this.name = document.createElement('div');
    this.name.className = 'boss-hud-name';

    const bar = document.createElement('div');

    bar.className = 'boss-hud-bar';
    this.fill = document.createElement('div');
    this.fill.className = 'boss-hud-fill';
    bar.append(this.fill);

    this.cast = document.createElement('div');
    this.cast.className = 'boss-hud-cast';
    this.castFill = document.createElement('div');
    this.castFill.className = 'boss-hud-cast-fill';
    this.cast.append(this.castFill);

    this.root.append(this.name, bar, this.cast);

    this.intro = document.createElement('div');
    this.intro.className = 'boss-intro';
    this.introName = document.createElement('div');
    this.introName.className = 'boss-intro-name';
    this.introSubtitle = document.createElement('div');
    this.introSubtitle.className = 'boss-intro-subtitle';
    this.intro.append(this.introName, this.introSubtitle);

    parent.append(this.root, this.intro);
  }

  /** Title card: plays once when the boss enters (WAAPI so it runs even
   *  where prefers-reduced-motion skips CSS animations). */
  showIntro(name: string, subtitle: string) {
    this.introName.textContent = name;
    this.introSubtitle.textContent = subtitle;
    this.intro.animate(
      [
        { opacity: 0, transform: 'scale(1.25)' },
        { opacity: 1, transform: 'scale(1)', offset: 0.12 },
        { opacity: 1, transform: 'scale(1)', offset: 0.78 },
        { opacity: 0, transform: 'scale(0.96)' }
      ],
      { duration: 2400, easing: 'ease' }
    );
  }

  update(status: BossStatus | null | undefined) {
    if (!status || status.hp <= 0) {
      this.root.classList.remove('visible');
      return;
    }

    this.root.classList.add('visible');
    this.name.textContent = status.name;
    this.fill.style.width = `${Math.max(0, Math.min(1, status.hp / status.maxHp)) * 100}%`;

    const casting = (status.castProgress ?? 0) > 0;

    this.cast.classList.toggle('active', casting);
    this.castFill.style.width = casting ? `${Math.min(1, status.castProgress ?? 0) * 100}%` : '0%';
  }

  destroy() {
    this.root.remove();
    this.intro.remove();
  }
}
