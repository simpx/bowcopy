const RUN_SCREEN_STYLE_ID = 'bowbert-run-screen-styles';

const RUN_SCREEN_STYLES = `
.run-screen {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  background: radial-gradient(ellipse at center, rgb(16 26 19 / 96%), rgb(5 8 6 / 98%));
  font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
  color: #d8e8dc;
  transition: opacity 350ms ease;
}

.run-screen.hidden { opacity: 0; pointer-events: none; }

.run-title {
  color: #f0e4ff;
  font-size: clamp(38px, 8vw, 72px);
  font-weight: 900;
  letter-spacing: 0.32em;
  text-shadow: 0 4px 0 rgb(10 5 20 / 90%), 0 0 34px rgb(198 93 240 / 55%);
}

.run-sub {
  color: #8faa96;
  font-size: 13px;
  letter-spacing: 0.4em;
  text-transform: uppercase;
}

.run-controls {
  display: flex;
  gap: 26px;
  margin: 8px 0;
  color: #9db8a4;
  font-size: 13px;
  text-align: center;
}

.run-controls b { display: block; color: #ffd75d; font-size: 15px; margin-bottom: 3px; letter-spacing: 0.1em; }

.run-seed-row { display: flex; gap: 8px; align-items: center; }

.run-seed-row input {
  width: 150px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid #1e3324;
  background: #0d1610;
  color: #d8e8dc;
  font-size: 13px;
  letter-spacing: 0.12em;
  text-align: center;
}

.run-seed-row label { color: #6f8a77; font-size: 12px; letter-spacing: 0.2em; }

.run-button {
  padding: 13px 44px;
  border: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, #ffd75d, #c68a2a);
  color: #201a05;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: 0.3em;
  cursor: pointer;
  box-shadow: 0 4px 0 rgb(10 5 20 / 60%);
}

.run-button:active { transform: translateY(2px); box-shadow: 0 2px 0 rgb(10 5 20 / 60%); }

/* --- result card (built to be screenshotted) --- */
.run-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 26px 44px 22px;
  border-radius: 18px;
  border: 2px solid #2b4433;
  background: linear-gradient(165deg, rgb(20 32 24 / 96%), rgb(10 16 12 / 96%));
  box-shadow: 0 12px 40px rgb(0 0 0 / 55%), inset 0 1px 0 rgb(255 255 255 / 6%);
}

.run-card.victory { border-color: #ffd75d; box-shadow: 0 12px 46px rgb(198 141 42 / 25%), inset 0 1px 0 rgb(255 255 255 / 8%); }

.run-card .run-title { font-size: clamp(30px, 6vw, 54px); }

.run-time {
  font-variant-numeric: tabular-nums;
  color: #ffd75d;
  font-size: clamp(44px, 9vw, 76px);
  font-weight: 900;
  letter-spacing: 0.06em;
  text-shadow: 0 3px 0 rgb(10 5 20 / 80%);
  line-height: 1;
}

.run-time.new-record { animation: record-glow 1.1s ease-in-out infinite alternate; }

@keyframes record-glow {
  from { text-shadow: 0 3px 0 rgb(10 5 20 / 80%), 0 0 18px rgb(255 215 93 / 40%); }
  to { text-shadow: 0 3px 0 rgb(10 5 20 / 80%), 0 0 42px rgb(255 215 93 / 90%); }
}

.run-record-tag {
  color: #0d1610;
  background: #ffd75d;
  border-radius: 999px;
  padding: 3px 14px;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.3em;
}

.run-stats { display: flex; gap: 30px; margin-top: 6px; }

.run-stat { text-align: center; }

.run-stat b { display: block; color: #f0e4ff; font-size: 22px; font-variant-numeric: tabular-nums; }

.run-stat span { color: #6f8a77; font-size: 11px; letter-spacing: 0.25em; }

.run-hearts { font-size: 20px; letter-spacing: 0.2em; }

.run-footer { color: #4d6355; font-size: 11px; letter-spacing: 0.25em; margin-top: 4px; }

.run-menu { display: flex; flex-direction: column; gap: 12px; align-items: stretch; min-width: 220px; }

.run-menu-row { display: flex; gap: 12px; }

.run-button.secondary {
  background: linear-gradient(180deg, #2b4433, #16241a);
  color: #d8e8dc;
  font-size: 14px;
  letter-spacing: 0.18em;
}

.run-menu-fab {
  position: absolute;
  top: 10px;
  right: 46px;
  z-index: 55;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid #2b4433;
  background: rgb(13 22 16 / 82%);
  color: #8faa96;
  font-size: 17px;
  line-height: 1;
  cursor: pointer;
}

.run-menu-fab.hidden { display: none; }

.run-vignette {
  position: absolute;
  inset: 0;
  z-index: 40;
  pointer-events: none;
  box-shadow: inset 0 0 90px 24px rgb(214 40 57 / 55%);
  animation: vignette-pulse 0.9s ease-in-out infinite alternate;
}

.run-vignette.hidden { display: none; }

@keyframes vignette-pulse {
  from { opacity: 0.35; }
  to { opacity: 0.9; }
}

@media (orientation: portrait) {
  .portrait-hint { display: flex !important; }
}

.portrait-hint {
  position: fixed;
  inset: 0;
  z-index: 98;
  display: none;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgb(5 8 6 / 96%);
  color: #d8e8dc;
  font-size: 16px;
  letter-spacing: 0.2em;
}

.portrait-hint span { font-size: 44px; animation: rotate-hint 1.6s ease-in-out infinite; }

@keyframes rotate-hint { 0%, 20% { transform: rotate(0); } 60%, 100% { transform: rotate(90deg); } }
`;

export interface RunResult {
  readonly victory: boolean;
  readonly timeMs: number;
  readonly roomsCleared: number;
  readonly totalRooms: number;
  readonly heartsLeft: number;
  readonly maxHearts: number;
  readonly seed: string;
  readonly bestTimeMs: number | null;
  readonly newRecord: boolean;
}

const ensureStyles = () => {
  if (!document.getElementById(RUN_SCREEN_STYLE_ID)) {
    const style = document.createElement('style');

    style.id = RUN_SCREEN_STYLE_ID;
    style.textContent = RUN_SCREEN_STYLES;
    document.head.append(style);
  }
};

export const formatRunTime = (timeMs: number): string => {
  const totalSeconds = timeMs / 1000;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const tenths = Math.floor((timeMs % 1000) / 100);

  return `${minutes}:${String(seconds).padStart(2, '0')}.${tenths}`;
};

/** Title screen: controls, optional seed, and the start button (whose click
 *  doubles as the user gesture that unlocks audio). */
export class TitleScreen {
  private readonly root: HTMLDivElement;
  private readonly seedInput: HTMLInputElement;

  constructor(parent: HTMLElement, initialSeed: string, onStart: (seed: string) => void) {
    ensureStyles();
    this.root = document.createElement('div');
    this.root.className = 'run-screen';
    this.root.innerHTML = `
      <div class="run-title">BOWBERT</div>
      <div class="run-sub">a tiny doodle roguelike</div>
      <div class="run-controls">
        <div><b>WASD</b>移动</div>
        <div><b>鼠标</b>瞄准 · 按住射击</div>
        <div><b>空格</b>翻滚(无敌帧)</div>
        <div><b>手机</b>双摇杆 + 翻滚键</div>
      </div>
      <div class="run-seed-row">
        <label>SEED</label>
        <input type="text" maxlength="24" spellcheck="false" placeholder="留空随机" />
      </div>
      <button class="run-button">开 始</button>
    `;
    this.seedInput = this.root.querySelector('input') as HTMLInputElement;
    this.seedInput.value = initialSeed;

    const button = this.root.querySelector('button') as HTMLButtonElement;

    button.addEventListener('click', () => {
      this.hide();
      onStart(this.seedInput.value.trim());
    });
    parent.append(this.root);
  }

  hide() {
    this.root.classList.add('hidden');
  }

  show() {
    this.root.classList.remove('hidden');
  }

  destroy() {
    this.root.remove();
  }
}

/** End-of-run card: built to be screenshot-worthy — big time, records, seed. */
export class ResultScreen {
  private readonly root: HTMLDivElement;
  private onRestart?: () => void;
  private onBackToTitle?: () => void;

  constructor(parent: HTMLElement) {
    ensureStyles();
    this.root = document.createElement('div');
    this.root.className = 'run-screen hidden';
    parent.append(this.root);
  }

  show(result: RunResult, onRestart: () => void, onBackToTitle?: () => void) {
    this.onRestart = onRestart;
    this.onBackToTitle = onBackToTitle;

    const hearts =
      '❤'.repeat(Math.floor(result.heartsLeft)) +
      (result.heartsLeft % 1 >= 0.5 ? '½' : '') +
      '<span style="opacity:0.25">' +
      '❤'.repeat(Math.max(0, Math.floor(result.maxHearts - result.heartsLeft))) +
      '</span>';

    this.root.innerHTML = `
      <div class="run-card ${result.victory ? 'victory' : ''}">
        <div class="run-title">${result.victory ? 'CHAPTER CLEARED' : 'YOU CAME UNDONE'}</div>
        <div class="run-time ${result.newRecord ? 'new-record' : ''}">${formatRunTime(result.timeMs)}</div>
        ${result.newRecord ? '<div class="run-record-tag">NEW RECORD</div>' : ''}
        <div class="run-stats">
          <div class="run-stat"><b>${result.roomsCleared}/${result.totalRooms}</b><span>房间</span></div>
          <div class="run-stat"><b class="run-hearts">${hearts}</b><span>心</span></div>
          <div class="run-stat"><b>${result.bestTimeMs !== null ? formatRunTime(result.bestTimeMs) : '—'}</b><span>最快通关</span></div>
        </div>
        <div class="run-footer">SEED · ${result.seed.toUpperCase()}</div>
      </div>
      <div class="run-menu-row">
        <button class="run-button" data-action="again">再来一局</button>
        <button class="run-button secondary" data-action="title">回标题 · 换种子</button>
      </div>
    `;

    (this.root.querySelector('[data-action="again"]') as HTMLButtonElement).addEventListener(
      'click',
      () => {
        this.hide();
        this.onRestart?.();
      }
    );
    (this.root.querySelector('[data-action="title"]') as HTMLButtonElement).addEventListener(
      'click',
      () => {
        this.hide();
        this.onBackToTitle?.();
      }
    );
    this.root.classList.remove('hidden');
  }

  hide() {
    this.root.classList.add('hidden');
  }

  destroy() {
    this.root.remove();
  }
}

export interface MenuActions {
  readonly onResume: () => void;
  readonly onAbandon: () => void;
  readonly onToggleMute: () => boolean;
}

/** In-run menu (ESC / gear button): resume, abandon, sound toggle. */
export class MenuScreen {
  private readonly root: HTMLDivElement;
  private readonly muteButton: HTMLButtonElement;

  constructor(parent: HTMLElement, muted: boolean, actions: MenuActions) {
    ensureStyles();
    this.root = document.createElement('div');
    this.root.className = 'run-screen hidden';
    this.root.innerHTML = `
      <div class="run-title" style="font-size:clamp(26px,5vw,44px)">PAUSED</div>
      <div class="run-menu">
        <button class="run-button" data-action="resume">继 续</button>
        <button class="run-button secondary" data-action="mute"></button>
        <button class="run-button secondary" data-action="abandon">放弃本局</button>
      </div>
      <div class="run-sub">ESC 关闭菜单</div>
    `;
    this.muteButton = this.root.querySelector('[data-action="mute"]') as HTMLButtonElement;
    this.setMuted(muted);
    (this.root.querySelector('[data-action="resume"]') as HTMLButtonElement).addEventListener(
      'click',
      () => actions.onResume()
    );
    (this.root.querySelector('[data-action="abandon"]') as HTMLButtonElement).addEventListener(
      'click',
      () => actions.onAbandon()
    );
    this.muteButton.addEventListener('click', () => this.setMuted(actions.onToggleMute()));
    parent.append(this.root);
  }

  private setMuted(muted: boolean) {
    this.muteButton.textContent = muted ? '🔇 声音:关' : '🔊 声音:开';
  }

  setVisible(visible: boolean) {
    this.root.classList.toggle('hidden', !visible);
  }

  destroy() {
    this.root.remove();
  }
}

/** Floating gear button that opens the menu (the mobile ESC). */
export class MenuButton {
  private readonly root: HTMLButtonElement;

  constructor(parent: HTMLElement, onTap: () => void) {
    ensureStyles();
    this.root = document.createElement('button');
    this.root.className = 'run-menu-fab';
    this.root.textContent = '⚙';
    this.root.addEventListener('click', onTap);
    parent.append(this.root);
  }

  setVisible(visible: boolean) {
    this.root.classList.toggle('hidden', !visible);
  }

  destroy() {
    this.root.remove();
  }
}

/** Low-health vignette: pulsing red edges at <=1 heart. */
export class LowHealthVignette {
  private readonly root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    ensureStyles();
    this.root = document.createElement('div');
    this.root.className = 'run-vignette hidden';
    parent.append(this.root);
  }

  setActive(active: boolean) {
    this.root.classList.toggle('hidden', !active);
  }

  destroy() {
    this.root.remove();
  }
}

/** Fullscreen 'rotate your phone' veil, visible only in portrait. */
export const mountPortraitHint = (parent: HTMLElement) => {
  const hint = document.createElement('div');

  hint.className = 'portrait-hint';
  hint.innerHTML = '<span>📱</span><div>横屏体验更佳 · 请旋转设备</div>';
  parent.append(hint);

  return hint;
};
