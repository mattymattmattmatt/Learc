import { registerRoute } from '../router.js';
import { playBGM }       from '../bgm.js';
import { newGame }       from '../state.js';
import { hideHUD }       from '../hud.js';

const KING = 'assets/img/king_intro.gif';

function render(container) {
  hideHUD();
  playBGM('intro');
  container.innerHTML = `
    <div class="card">
      <img src="${KING}" alt="The King" class="king-img">
      <p id="text" class="body-text">
        “Greetings, traveller! I am the King of distant Liitokala.
        Will you help me in a matter of great urgency?”
      </p>
      <div class="btn-group" id="choice">
        <button class="big-btn" data-a="yes">Yes, I will help</button>
        <button class="big-btn ghost" data-a="no">No, I'm sorry</button>
      </div>
    </div>`;
  container.querySelectorAll('[data-a]').forEach(b => {
    b.onclick = () => choice(b.dataset.a, container);
  });
}

function choice(ans, container) {
  if (ans === 'no') { location.hash = 'gameover'; return; }

  const card = container.querySelector('.card');
  const text = container.querySelector('#text');
  card.querySelector('#choice').remove();

  const pages = [
    '“Thank you, noble friend! Your courage gives me hope.”',
    '“Last night our royal treasury was robbed — thirty chests of gold, scattered across the world.”',
    '“You can command mystical animal companions. Choose them wisely: the right creature turns danger into triumph.”',
    '“But beware — every misstep raises Suspicion, and the thieves have allies everywhere.”',
    '“Before you set out on this adventure… what shall I call you, my World Tracker?”'
  ];
  let i = 0;
  const next = document.createElement('button');
  next.className = 'big-btn';
  next.textContent = 'Next ➔';
  card.appendChild(next);
  next.onclick = () => {
    i++;
    if (i < pages.length) { text.textContent = pages[i]; return; }
    next.remove();
    askName(card, text);
  };
}

function askName(card, text) {
  text.textContent = '“What shall I call you, brave one?”';
  const wrap = document.createElement('div');
  wrap.className = 'btn-group';
  wrap.innerHTML = `
    <input id="nameBox" type="text" maxlength="16" placeholder="Enter your explorer name">
    <button id="begin" class="big-btn">Begin the Adventure</button>
    <p id="warn" class="warn"></p>`;
  card.appendChild(wrap);

  const box = wrap.querySelector('#nameBox');
  box.focus();
  const start = () => {
    const name = box.value.trim();
    if (!name) { wrap.querySelector('#warn').textContent = 'Please enter a name.'; return; }
    newGame(name);
    card.innerHTML = `
      <img src="${KING}" alt="The King" class="king-img">
      <p class="body-text">“Wonderful, <b>${escapeHTML(name)}</b>! May fortune guide your every step. Go — recover my gold!”</p>
      <button class="big-btn" id="toMap">Set Off ➔</button>`;
    card.querySelector('#toMap').onclick = () => { location.hash = 'map'; };
  };
  wrap.querySelector('#begin').onclick = start;
  box.addEventListener('keydown', e => { if (e.key === 'Enter') start(); });
}

function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

registerRoute('intro', render);
export default render;
