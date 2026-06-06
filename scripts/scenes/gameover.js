import { registerRoute } from '../router.js';
import { playBGM, stopBGM } from '../bgm.js';
import { hideHUD }       from '../hud.js';

function render(container) {
  stopBGM();
  hideHUD();
  playBGM('gameover');
  container.innerHTML = `
    <div class="card title-card-shell">
      <h1 class="game-title small" style="color:#e11d48">The Quest Ends</h1>
      <p class="body-text">Without a World Tracker, the King's gold is lost forever to the thieves of the world…</p>
      <button id="restart" class="big-btn">Back to Title</button>
    </div>`;
  container.querySelector('#restart').onclick = () => { location.hash = 'title'; };
}

registerRoute('gameover', render);
export default render;
