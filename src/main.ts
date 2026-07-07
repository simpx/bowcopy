import './styles.css';

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
