/*  AU-01.js  – Country 1, Puzzle Slot 1 (Arrival Hazard: bush-fire)  */

import { registerRoute } from '../router.js';
import { playBGM }       from '../bgm.js';
import { pickPet }       from '../petGrid.js';
import { addGold, addHeat, resetBad, incBad } from '../stats.js';

const PUZZ_ID = 'AU01_S1';

/* ─── helpers to fetch JSON once and cache ────────────────────────── */
let puzzlesCache = null;
async function getPuzzles() {
  if (puzzlesCache) return puzzlesCache;
  const res = await fetch('scripts/data/puzzles.json');
  puzzlesCache = await res.json();
  return puzzlesCache;
}

let petsCache = null;
async function getPets() {
  if (petsCache) return petsCache;
  const res = await fetch('scripts/data/pets.json');
  petsCache = await res.json();
  return petsCache;
}

/* ─── main render function ────────────────────────────────────────── */
async function render(container) {
  const puzzles = await getPuzzles();
  const cfg     = puzzles[PUZZ_ID];

  if (!cfg) {
    container.innerHTML = '<p style="color:#fff">Puzzle config missing.</p>';
    return;
  }

  playBGM('puzzle');                                    // fire ambience loop

  container.innerHTML = `
    <div class="title-card" style="padding:0">
      <img src="assets/img/${cfg.background}" class="full-bg">
      <div class="overlay">
        <p class="body-text" id="prompt">
          Flaming embers block the track!  Choose a companion:
        </p>
        <div id="grid" class="btn-group"></div>
      </div>
    </div>
  `;

  /* inject 24 thumbnails */
  const petsObj = await getPets();          // object keyed by id
  const petArr  = Object.values(petsObj);   // → array we can map

  document.getElementById('grid').innerHTML = petArr
    .map(p =>
      `<img src="assets/img/characters/${p.sprite}"
            data-id="${p.id}" class="hero-thumb">`)
    .join('');

  /* wait for user to select a pet */
  pickPet(document.getElementById('grid'))
    .then(id => resolveOutcome(id, cfg, container));
}

/* ─── outcome evaluator ───────────────────────────────────────────── */
function resolveOutcome(petId, cfg, container) {
  const tier = cfg.good.includes(petId)  ? 'good'
            : cfg.bad .includes(petId)  ? 'bad'
            : 'normal';

  let effect = '';
  if (tier === 'good')   { addGold(3); resetBad(); effect = '+3 % Gold'; }
  if (tier === 'normal') { addGold(1);            effect = '+1 % Gold'; }
  if (tier === 'bad')    { addHeat(4); incBad();  effect = '+4 Heat';   }

  container.querySelector('.overlay').innerHTML = `
    <p class="body-text"><b>${tier.toUpperCase()}!</b>  ${effect}</p>
    <button class="big-btn" id="next">Continue</button>
  `;
  document.getElementById('next').onclick = () => {
    location.hash = 'AU-01-S2';      // stub the next slot later
  };
}

/* ─── route registration ──────────────────────────────────────────── */
registerRoute('AU-01', render);
export default render;
