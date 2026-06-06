import { registerRoute } from '../router.js';
import { stopBGM }       from '../bgm.js';
import { loadByName, hasAnySave, lastSaveName, routeForState } from '../state.js';
import { hideHUD }       from '../hud.js';

function render(container) {
  stopBGM();
  hideHUD();
  container.innerHTML = `
    <div class="card title-card-shell">
      <h1 class="game-title">KING'S<br>GOLD</h1>
      <p class="subtitle">Recover the stolen royal treasure across 30 nations.</p>
      <div class="btn-group">
        <button id="startBtn" class="big-btn">New Game</button>
        <button id="contBtn" class="big-btn ghost"${hasAnySave() ? '' : ' disabled'}>Continue</button>
      </div>
    </div>`;

  container.querySelector('#startBtn').onclick = () => { location.hash = 'intro'; };
  container.querySelector('#contBtn').onclick  = () => showContinue(container);
}

function showContinue(container) {
  const card = container.querySelector('.card');
  card.innerHTML = `
    <h1 class="game-title small">Continue</h1>
    <input id="nameBox" type="text" maxlength="16"
           placeholder="Enter your explorer name" value="${lastSaveName()}">
    <div class="btn-group">
      <button id="tryLoad" class="big-btn">Load Save</button>
      <button id="backBtn" class="big-btn ghost">Back</button>
    </div>
    <p id="msg" class="warn"></p>`;

  const box = card.querySelector('#nameBox');
  box.focus();
  card.querySelector('#backBtn').onclick = () => render(container);

  const load = () => {
    const name = box.value.trim();
    if (!name) return;
    const data = loadByName(name);
    if (!data) {
      card.querySelector('#msg').textContent = 'No save found for that name.';
      return;
    }
    location.hash = routeForState();
  };
  card.querySelector('#tryLoad').onclick = load;
  box.addEventListener('keydown', e => { if (e.key === 'Enter') load(); });
}

registerRoute('title', render);
export default render;
