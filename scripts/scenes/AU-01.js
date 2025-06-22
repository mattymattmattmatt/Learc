import { registerRoute } from '../router.js';
import puzzles           from '../data/puzzles.json' assert { type:'json' };
import pets              from '../data/pets.json'    assert { type:'json' };
import { playBGM }       from '../bgm.js';
import { pickPet }       from '../petGrid.js';   // helper that returns chosen id
import { addGold, addHeat, resetBad, incBad } from '../stats.js';

const PUZZ_ID = 'AU01_S1';

function render(container) {
  const cfg = puzzles[PUZZ_ID];
  playBGM('puzzle');  // loops fire_crackle.mp3 under the hood

  container.innerHTML = `
    <div class="title-card" style="padding:0">
      <img src="assets/img/${cfg.background}" class="full-bg">
      <div class="overlay">
        <p class="body-text" id="txt">
          Flaming embers block the track!  Choose a companion:
        </p>
        <div id="grid"></div>
      </div>
    </div>
  `;

  /* inject pet portraits */
  document.getElementById('grid').innerHTML =
    pets.map(p => `<img src="assets/img/characters/${p.sprite}"
                         data-id="${p.id}" class="hero-thumb">`).join('');

  /* wait for pick */
  pickPet(document.getElementById('grid')).then(petId =>
    resolveOutcome(container, petId, cfg)
  );
}

function resolveOutcome(container, petId, cfg) {
  const tier = cfg.good.includes(petId)  ? 'good' :
               cfg.bad .includes(petId)  ? 'bad'  : 'normal';

  let effectHTML = '';
  if (tier === 'good') { addGold(3); resetBad(); effectHTML = '+3 % Gold'; }
  if (tier === 'normal'){ addGold(1);           effectHTML = '+1 % Gold'; }
  if (tier === 'bad')  { addHeat(4); incBad();  effectHTML = '+4 Heat';   }

  container.querySelector('.overlay').innerHTML = `
    <p class="body-text"><b>${tier.toUpperCase()}!</b> ${effectHTML}</p>
    <button class="big-btn" id="next">Continue</button>
  `;
  document.getElementById('next').onclick = () => { location.hash = 'AU-01-S2'; };
}

registerRoute('AU-01', render);
export default render;
