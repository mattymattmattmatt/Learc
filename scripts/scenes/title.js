/* scripts/scenes/title.js
   ----------------------------------------------------------
   Title / character-select scene for Learc
   --------------------------------------------------------*/

import { registerRoute } from '../router.js';
import { loadSave, saveProgress } from '../save.js';

/* ─── fetch & cache hero data ───────────────────────────── */
let heroesCache = null;
async function getHeroes() {
  if (heroesCache) return heroesCache;
  const res = await fetch('scripts/data/characters.json');
  if (!res.ok) throw new Error('Failed to load characters.json');
  heroesCache = await res.json();
  return heroesCache;
}

/* ─── build 2×4 gallery for a given habitat ─────────────── */
function gridFor(list, habitat) {
  return list
    .filter(h => h.habitat === habitat)
    .map(
      h => `<img src="assets/img/characters/${h.sprite}"
                alt="${h.name}"
                title="${h.power}"
                data-id="${h.id}"
                class="hero-thumb">`
    )
    .join('');
}

/* ─── auto-scale so the card always fits 100 % viewport ── */
function fitCard() {
  const card = document.querySelector('.title-card');
  if (!card) return;

  const DESIGN_W = 500;  // must match CSS max-width
  const DESIGN_H = 350;  // must match CSS max-height

  const scaleW = (window.innerWidth  * 0.97) / DESIGN_W;
  const scaleH = (window.innerHeight * 0.97) / DESIGN_H;
  const scale  = Math.min(scaleW, scaleH, 1);   // never upscale >1

  card.style.transformOrigin = 'center center';
  card.style.transform = `scale(${scale})`;
}

/* ─── main render fn ────────────────────────────────────── */
async function render(container) {
  const heroes = await getHeroes();

  container.innerHTML = `
    <div class="title-card">
      <h1>Learc</h1>

      <div class="tabs">
        <button data-tab="land" class="tab active">Land</button>
        <button data-tab="sea"  class="tab">Sea</button>
        <button data-tab="sky"  class="tab">Sky</button>
      </div>

      <div class="gallery" id="gallery">
        ${gridFor(heroes, 'land')}
      </div>

      <div id="heroInfo"></div>

      <input id="nameBox" type="text"
             maxlength="16" placeholder="Enter adventurer name" />

      <button id="playBtn" disabled>Start Journey</button>
    </div>
  `;

  /* scale once content exists */
  fitCard();

  /* re-scale on resize / orientation change */
  window.addEventListener('resize',           fitCard);
  window.addEventListener('orientationchange',fitCard);

  /* ─── tab switching ─────────────────── */
  container.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      container.querySelector('.tab.active')?.classList.remove('active');
      btn.classList.add('active');

      container.querySelector('#gallery').innerHTML =
        gridFor(heroes, btn.dataset.tab);

      /* reset selection & info */
      selectedHero = null;
      playBtn.disabled = true;
      heroInfo.textContent = '';
    };
  });

  /* ─── hero selection ────────────────── */
  let selectedHero = null;
  const playBtn  = container.querySelector('#playBtn');
  const heroInfo = container.querySelector('#heroInfo');

  container.querySelector('#gallery').addEventListener('click', e => {
    const img = e.target.closest('.hero-thumb');
    if (!img) return;

    /* visual feedback */
    container
      .querySelectorAll('.hero-thumb.selected')
      .forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');

    /* enable button & show info */
    selectedHero = img.dataset.id;
    playBtn.disabled = false;

    const hero = heroes.find(h => h.id === selectedHero);
    heroInfo.textContent = `${hero.name} — ${hero.power}`;
  });

  /* ─── start button ──────────────────── */
  playBtn.onclick = async () => {
    const username = container.querySelector('#nameBox').value.trim();
    if (!username) return container.querySelector('#nameBox').focus();

    await loadSave(username);
    await saveProgress(username, { hero: selectedHero });
    location.hash = 'AU-01';        // first playable episode
  };

  container.querySelector('#nameBox').focus();
}

/* register & export for router */
registerRoute('title', render);
export default render;
