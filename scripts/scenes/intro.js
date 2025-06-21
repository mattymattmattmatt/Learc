import { registerRoute } from '../router.js';
import { loadSave, saveProgress } from '../save.js';

/* scale helper (same math as before) */
function fitCard() {
  const card = document.querySelector('.title-card');
  if (!card) return;
  const s = Math.min((innerWidth * 0.95) / 500,
                     (innerHeight * 0.95) / 350, 1);
  card.style.transform = `scale(${s})`;
  card.style.transformOrigin = 'center center';
}

function render(container) {
  container.innerHTML = `
    <div class="title-card">
      <img src="assets/img/king_intro.png" alt="King"
           style="width:160px;margin:0 auto 0.6rem">

      <p id="introText" class="body-text">
        “Greetings, traveller! I am the King of distant Liitokala.
        I have heard tales of your skill…”
      </p>

      <div id="choiceBtns" class="btn-group">
        <button class="big-btn" data-ans="yes">Yes, I’ll help</button>
        <button class="big-btn" data-ans="no">No, sorry</button>
      </div>
    </div>
  `;

  fitCard();
  addEventListener('resize', fitCard);
  addEventListener('orientationchange', fitCard);

  container.querySelectorAll('button[data-ans]').forEach(btn => {
    btn.onclick = () => handleChoice(btn.dataset.ans, container);
  });
}

function handleChoice(ans, container) {
  if (ans === 'no') {
    location.hash = 'gameover';
    return;
  }

  /* build the 'thank you + story + name?' prompt */
  const card   = container.querySelector('.title-card');
  const textEl = container.querySelector('#introText');
  container.querySelector('#choiceBtns').remove();

  const script = [
    '“Thank you, brave soul! Your aid means the world to me.”',
    '“Last night, our treasury was plundered and thirty chests of gold were scattered across the globe.”',
    '“Before you set out to reclaim them… what shall I call you?”'
  ];
  let line = 0;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'big-btn';
  nextBtn.textContent = 'Next ➔';
  card.appendChild(nextBtn);

  nextBtn.onclick = () => {
    line++;
    if (line < script.length) {
      textEl.textContent = script[line];
      return;
    }
    /* reached name prompt */
    nextBtn.remove();
    showNamePrompt(card);
  };
}

function showNamePrompt(card) {
  card.innerHTML += `
    <input id="nameBox" type="text" maxlength="16"
           placeholder="Enter your explorer name">
    <button id="saveName" class="big-btn">Begin the Adventure</button>
  `;
  fitCard();

  card.querySelector('#saveName').onclick = async () => {
    const name = card.querySelector('#nameBox').value.trim();
    if (!name) return;

    await loadSave(name);
    await saveProgress(name, { hero: null });

    /* personalised send-off */
    card.innerHTML = `
      <img src="assets/img/king_intro.png" alt="King"
           style="width:160px;margin:0 auto 0.6rem">
      <p class="body-text">
        “Wonderful, <b>${name}</b>! May fortune guide you.”</p>
      <button id="toPuzzle" class="big-btn">Next ➔</button>
    `;
    fitCard();

    card.querySelector('#toPuzzle').onclick = () => {
      location.hash = 'AU-01';   // first map/puzzle
    };
  };
}

registerRoute('intro', render);
export default render;
