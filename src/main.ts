import './styles.css';

// Mobile Safari ignores user-scalable=no: block pinch/double-tap zoom and
// the long-press context menu at the event level (game page only — the
// workbench and audition pages keep normal text behavior).
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
}

document.addEventListener('dblclick', (event) => event.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (event) => event.preventDefault());

let lastTouchEndMs = 0;

document.addEventListener(
  'touchend',
  (event) => {
    const now = Date.now();

    if (now - lastTouchEndMs < 320) {
      event.preventDefault();
    }

    lastTouchEndMs = now;
  },
  { passive: false }
);

import { GAME_PARENT_ID } from './game/constants';
import { createGame } from './game/createGame';

const mount = document.querySelector<HTMLDivElement>(`#${GAME_PARENT_ID}`);

if (!mount) {
  throw new Error(`Missing #${GAME_PARENT_ID} mount element.`);
}

const game = createGame();
const preventGameBrowserGesture = (event: Event) => {
  event.preventDefault();
};

mount.addEventListener('selectstart', preventGameBrowserGesture);
mount.addEventListener('dragstart', preventGameBrowserGesture);
mount.addEventListener('contextmenu', preventGameBrowserGesture);

const destroyGame = () => {
  mount.removeEventListener('selectstart', preventGameBrowserGesture);
  mount.removeEventListener('dragstart', preventGameBrowserGesture);
  mount.removeEventListener('contextmenu', preventGameBrowserGesture);
  game.destroy(true);
  window.removeEventListener('beforeunload', destroyGame);
};

window.addEventListener('beforeunload', destroyGame);
