import { registerRoute } from '../router.js';
import { loadSave, saveProgress } from '../save.js';

/* ─── auto-scale helper ─────────────────────────────── */
function fitCard() {
  const card = document.querySelector('.title-card');
  if (!card) return;
  const s = Math.min((innerWidth * 0.95) / 500,
                     (innerHeight * 0.95) / 350, 1);
  card.style.transform = `scale(${s})`;
  card.style.transformOrigin = 'center';
}

/* ─── main render ───────────────────────────────────── */
function render(container) {
  container.innerHTML = `
    <div class="title-card">
      <img src="assets/img/king_intro.png" alt="King"
           style="width:160px;margin:0 auto 0.6rem" />

      <p id="text" class="body-text">
        “Greetings, traveller! I am the King of distant Liitokala.
        Will you help me in a matter of great urgency?”
      </p>

      <div class="btn-group" id="choiceBtns">
        <button class="big-btn" data-ans="yes">Yes, I will help</button>
        <button class="big-btn" data-ans="no">No, I’m sorry</button>
      </div>
    </div>
  `;

  fitCard();
  addEventListener('resize', fitCard);
  addEventListener('orientationchange', fitCard);

  container.querySelectorAll('button[data-ans]').forEach(btn =>
    btn.onclick = () => handleChoice(btn.dataset.ans, container)
  );
}

/* ─── handle Yes / No ───────────────────────────────── */
function handleChoice(ans, container) {
  if (ans === 'no') {
    location.hash = 'gameover';
    return;
  }

  const card  = container.querySelector('.title-card');
  const text  = container.querySelector('#text');
  const group = container.querySelector('#choiceBtns');
  group.remove();

  /* story pages after player agrees */
  const story = [
    '“Thank you, noble friend! Your courage gives me hope.”',
    '“Last night our treasury was robbed—thirty chests of gold scattered across the world.”',
    '“Before you set out on this adventure… what shall I call you?”'
  ];
  let page = 0;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'big-btn';
  nextBtn.textContent = 'Next ➔';
  card.appendChild(nextBtn);

  nextBtn.onclick = () => {
    page++;
    if (page < story.length) {
      text.textContent = story[page];
      return;
    }
    /* name prompt */
    nextBtn.remove();
    showNamePrompt(card);
  };
}

/* ─── name entry & save ─────────────────────────────── */
function showNamePrompt(card) {
  card.innerHTML += `
    <input id="nameBox" type="text" maxlength="16"
           placeholder="Enter your explorer name" />
    <button id="beginBtn" class="big-btn">Begin the Adventure</button>
  `;
  fitCard();

  card.querySelector('#beginBtn').onclick = async () => {
    const name = card.querySelector('#nameBox').value.trim();
    if (!name) return;

    await loadSave(name);
    await saveProgress(name, { hero: null });

    /* personalised send-off */
    card.innerHTML = `
      <img src="assets/img/king_intro.png" alt="King"
           style="width:160px;margin:0 auto 0.6rem" />
      <p class="body-text">
        “Wonderful, <b>${name}</b>! May fortune guide you.”</p>
      <button id="toPuzzle" class="big-btn" style="margin-top:0.6rem">
        Next ➔
      </button>
    `;
    fitCard();

    card.querySelector('#toPuzzle').onclick = () => {
      location.hash = 'AU-01';   /* first map/puzzle scene */
    };
  };
}

registerRoute('intro', render);
export default render;
