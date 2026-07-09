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
`;

export interface BossStatus {
  readonly name: string;
  readonly hp: number;
  readonly maxHp: number;
}

/** Top-center boss name + health bar, shown while a boss kit reports one. */
export class BossHud {
  private readonly root: HTMLDivElement;
  private readonly name: HTMLDivElement;
  private readonly fill: HTMLDivElement;

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
    this.root.append(this.name, bar);
    parent.append(this.root);
  }

  update(status: BossStatus | null | undefined) {
    if (!status || status.hp <= 0) {
      this.root.classList.remove('visible');
      return;
    }

    this.root.classList.add('visible');
    this.name.textContent = status.name;
    this.fill.style.width = `${Math.max(0, Math.min(1, status.hp / status.maxHp)) * 100}%`;
  }

  destroy() {
    this.root.remove();
  }
}
