import { registerRoute } from '../router.js';
import { loadSave } from '../save.js';  // no saveProgress needed here
import { stopBGM }       from '../bgm.js';

/* scale helper (480 px design height) */
function fitCard() {
  const card = document.querySelector('.title-card');
  if (!card) return;
  const s = Math.min((innerWidth * 0.95) / 500,
                     (innerHeight * 0.95) / 480, 1);
  card.style.transform = `scale(${s})`;
  card.style.transformOrigin = 'center';
}

function render(container) {
  stopBGM();                 // menu is silent
  container.innerHTML = `
    <div class="title-card title-only">
      <button id="startBtn"    class="big-btn">Start Game</button>
      <button id="contBtn"     class="big-btn">Continue</button>
    </div>
  `;

  fitCard();
  addEventListener('resize', fitCard);
  addEventListener('orientationchange', fitCard);

  /* Start = go to intro */
  container.querySelector('#startBtn').onclick = () => {
    location.hash = 'intro';
  };

  /* Continue flow */
  container.querySelector('#contBtn').onclick = () => {
    showContinuePrompt(container);
  };
}

async function showContinuePrompt(container) {
  const card = container.querySelector('.title-card');
  card.innerHTML = `
    <h1>Continue</h1>
    <input id="nameBox" type="text" maxlength="16"
           placeholder="Enter your explorer name" />
    <button id="tryLoad" class="big-btn">Load Save</button>
    <button id="backBtn" class="big-btn">Back</button>
    <p id="msg" class="body-text" style="min-height:1.2rem"></p>
  `;
  fitCard();

  card.querySelector('#backBtn').onclick = render.bind(null, container);

  card.querySelector('#tryLoad').onclick = async () => {
    const name = card.querySelector('#nameBox').value.trim();
    if (!name) return;

    const doc = await loadSave(name);
    if (!doc) {
      card.querySelector('#msg').textContent =
        'No save for that name. Start a new game?';
      return;
    }

    /* resume at stored hash or default to AU-01 */
    const next = doc?.lastScene || 'AU-01';
    location.hash = next;
  };
}

registerRoute('title', render);
export default render;
