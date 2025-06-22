import { registerRoute } from '../router.js';
import { playBGM }       from '../bgm.js';
import { pickPet }       from '../petGrid.js';
import { addGold, addHeat, resetBad, incBad } from '../stats.js';

const PUZZ_ID = 'AU01_S1';

/* helper – fetch JSON only the first time */
let puzzlesCache = null;
async function getPuzzles() {
  if (puzzlesCache) return puzzlesCache;
  const res = await fetch('scripts/data/puzzles.json');
  puzzlesCache = await res.json();
  return puzzlesCache;
}

async function render(container) {
  const puzzles = await getPuzzles();
  const cfg = puzzles[PUZZ_ID];
  if (!cfg) {
    container.innerHTML = '<p style="color:#fff">Puzzle config missing.</p>';
    return;
  }

  playBGM('puzzle');   // loops fire_crackle.mp3 in bgm.js

  container.innerHTML = `
    <div class="title-card" style="padding:0">
      <img src="assets/img/${cfg.background}" class="full-bg">
      <div class="overlay">
        <p class="body-text" id="txt">
          Flaming embers block the track!  Choose a companion:
        </p>
        <div id="grid" class="btn-group"></div>
      </div>
    </div>
  `;

  /* build thumbnails */
  const pets = await (await fetch('scripts/data/pets.json')).json();
  document.getElementById('grid').innerHTML = pets
    .map(p => `<img src="assets/img/characters/${p.sprite}"
                    data-id="${p.id}" class="hero-thumb">`)
    .join('');

  /* wait for pick */
  pickPet(document.getElementById('grid')).then(id => resolve(id, cfg, container));
}

/* outcome handler */
function resolve(petId, cfg, container) {
  const tier = cfg.good.includes(petId)  ? 'good'
            : cfg.bad .includes(petId)  ? 'bad'
            : 'normal';

  let effect = '';
  if (tier === 'good') { addGold(3); resetBad(); effect = '+3 % Gold'; }
  if (tier === 'normal'){ addGold(1); effect = '+1 % Gold'; }
  if (tier === 'bad')  { addHeat(4); incBad();  effect = '+4 Heat'; }

  container.querySelector('.overlay').innerHTML = `
    <p class="body-text"><b>${tier.toUpperCase()}!</b>  ${effect}</p>
    <button class="big-btn" id="next">Continue</button>
  `;
  document.getElementById('next').onclick = () => { location.hash = 'AU-01-S2'; };
}

registerRoute('AU-01', render);
export default render;
