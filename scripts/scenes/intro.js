import { registerRoute } from '../router.js';
import { loadSave, saveProgress } from '../save.js';

/* utility – keeps the card scaled */
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
      <img src="assets/img/king_intro.png" alt="King" style="width:160px;margin:auto">
      <p id="introText">
        “Greetings, traveler! I am the king of far-off Liitokala.
        I’ve journeyed here because I heard you could help…”
      </p>

      <div id="choiceBtns">
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

  const textEl = container.querySelector('#introText');
  const card   = container.querySelector('.title-card');
  container.querySelector('#choiceBtns').remove();

  const story = [
    'Our royal treasury was plundered in the night.',
    'Thirty chest-loads of gold were whisked away across the globe.',
    'Will you embark on a quest to restore our realm’s honor?'
  ];
  let idx = 0;

  const nextBtn = document.createElement('button');
  nextBtn.className = 'big-btn';
  nextBtn.textContent = 'Next';
  card.appendChild(nextBtn);

  nextBtn.onclick = () => {
    idx++;
    if (idx < story.length) {
      textEl.textContent = story[idx];
      return;
    }
    /* story finished → ask player name */
    nextBtn.remove();
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
      await saveProgress(name, { hero: null });   // no pet yet

      /* King thanks the player personally */
      card.innerHTML = `
        <img src="assets/img/king_intro.png" alt="King" style="width:160px;margin:auto">
        <p style="margin-top:1rem">
          “Wonderful, <b>${name}</b>! Your courage brings me hope. Let us begin!”
        </p>
        <button id="toPuzzle" class="big-btn" style="margin-top:1rem">Next ➔</button>
      `;
      fitCard();

      card.querySelector('#toPuzzle').onclick = () => {
        location.hash = 'AU-01';   // first map-puzzle scene (placeholder)
      };
    };
  };
}

registerRoute('intro', render);
export default render;
