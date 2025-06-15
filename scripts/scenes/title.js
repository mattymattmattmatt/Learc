/* scripts/scenes/title.js
   Title / character-select scene for Learc
   --------------------------------------- */

import { registerRoute } from '../router.js';
import { loadSave, saveProgress } from '../save.js';

/* ─── load + cache hero data ─────────────────────────── */
let heroesCache = null;
async function getHeroes() {
  if (heroesCache) return heroesCache;
  const res = await fetch('scripts/data/characters.json');
  if (!res.ok) throw new Error('Failed to load characters.json');
  heroesCache = await res.json();
  return heroesCache;
}

/* ─── build 2×4 gallery for a habitat ────────────────── */
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

/* ─── auto-scale card to always fit viewport ─────────── */
function fitCard() {
  const card = document.querySelector('.title-card');
  if (!card) return;

  const DESIGN_W = 500;   /* same as CSS max-width  */
  const DESIGN_H = 350;   /* same as CSS max-height */

  const scaleW = (innerWidth  * 0.97) / DESIGN_W;
  const scaleH = (innerHeight * 0.97) / DESIGN_H;
  const scale  = Math.min(scaleW, scaleH, 1);

  card.style.transformOrigin = 'center center';
  card.style.transform       = `scale(${scale})`;
}

/* ─── main scene renderer ────────────────────────────── */
async function render(container) {
  const heroes = await getHeroes();

  container.innerHTML = `
    <div class="title-card">
      <h1>Learc</h1>
      <button id="fsBtn" class="fs-btn" title="Toggle full-screen">🔲</button>

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

  /* scale now that DOM exists */
  fitCard();
  addEventListener('resize',           fitCard);
  addEventListener('orientationchange',fitCard);

  /* ─── tab switching ─────────────────────────── */
  container.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      container.querySelector('.tab.active')?.classList.remove('active');
      btn.classList.add('active');
      container.querySelector('#gallery').innerHTML =
        gridFor(heroes, btn.dataset.tab);

      selectedHero = null;
      playBtn.disabled = true;
      heroInfo.textContent = '';
    };
  });

  /* ─── hero selection ────────────────────────── */
  let selectedHero = null;
  const playBtn  = container.querySelector('#playBtn');
  const heroInfo = container.querySelector('#heroInfo');

  container.querySelector('#gallery').addEventListener('click', e => {
    const img = e.target.closest('.hero-thumb');
    if (!img) return;

    container
      .querySelectorAll('.hero-thumb.selected')
      .forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');

    selectedHero = img.dataset.id;
    playBtn.disabled = false;

    const hero = heroes.find(h => h.id === selectedHero);
    heroInfo.textContent = `${hero.name} — ${hero.power}`;
  });

  /* ─── start button ───────────────────────────── */
  playBtn.onclick = async () => {
    const username = container.querySelector('#nameBox').value.trim();
    if (!username) return container.querySelector('#nameBox').focus();
    await loadSave(username);
    await saveProgress(username, { hero: selectedHero });
    location.hash = 'AU-01';
  };

  container.querySelector('#nameBox').focus();

  /* ─── Full-screen toggle ─────────────────────── */
  const fsBtn = container.querySelector('#fsBtn');
  if (!document.fullscreenEnabled) fsBtn.style.display = 'none';

  fsBtn.onclick = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('Fullscreen not available:', err);
    }
  };
  document.addEventListener('fullscreenchange', () => {
    fsBtn.textContent = document.fullscreenElement ? '⤢' : '🔲';
  });
}

/* register route */
registerRoute('title', render);
export default render;
