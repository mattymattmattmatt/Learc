import { registerRoute } from '../router.js';
import { stopBGM, playSfx } from '../bgm.js';
import { pickPet }        from '../petGrid.js';
import { loadData, getPets, getPetArray, petSfx, getBaddies } from '../engine.js';
import { state, addGold, addHeat, resetBad, stepForward } from '../state.js';
import { showHUD }        from '../hud.js';

function sample(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function render(container) {
  stopBGM();
  await loadData();

  const enemyId = state.pendingEnemy;
  if (!enemyId) { stepForward(); return; }     // nothing to confront
  const enemy = getBaddies()[enemyId];
  showHUD();

  // 3 choices: guarantee one valid counter + two others
  const goodId  = sample(enemy.good, 1)[0];
  const others  = sample(getPetArray().filter(p => p.id !== goodId), 2).map(p => p.id);
  const choices = sample([goodId, ...others], 3);

  container.innerHTML = `
    <div class="puzzle-scene arch-boss encounter-scene">
      <div class="puzzle-overlay">
        <div class="puzzle-head">
          <span class="slot-tag enemy-tag">⚔️ Enemy Encounter</span>
          <span class="puzzle-label">${enemy.emoji} ${enemy.name}</span>
        </div>
        <p class="puzzle-prompt">${enemy.intro}</p>
        <div id="grid" class="pet-grid encounter-grid"></div>
      </div>
    </div>`;

  const grid = container.querySelector('#grid');
  const pets = getPets();
  grid.innerHTML = choices.map(id => {
    const p = pets[id];
    return `
      <button class="pet-thumb" data-id="${p.id}" title="${p.name} — ${p.power}">
        <img src="assets/img/characters/${p.sprite}" alt="${p.name}">
        <span class="pet-name">${p.name}</span>
      </button>`;
  }).join('');

  pickPet(grid).then(id => {
    const pet = pets[id];
    playSfx(petSfx(pet), 0.7);
    resolve(pet, enemy, container);
  });
}

function resolve(pet, enemy, container) {
  const win = enemy.good.includes(pet.id);

  if (win) {
    addHeat(enemy.rewardHeat);     // negative → cools heat
    addGold(enemy.rewardGold);
    resetBad();                    // a victory breaks the bad streak
  } else {
    addHeat(enemy.penaltyHeat);
  }
  state.pendingEnemy = null;

  const overlay = container.querySelector('.puzzle-overlay');
  overlay.innerHTML = `
    <div class="result result-${win ? 'good' : 'bad'}">
      <img src="assets/img/characters/${pet.sprite}" class="result-pet" alt="${pet.name}">
      <h2 class="result-tier">${win ? 'VICTORY!' : 'TROUBLE!'}</h2>
      <p class="body-text">${win ? enemy.winText : enemy.loseText}</p>
      <p class="result-effect">
        ${win
          ? `Heat ${enemy.rewardHeat} · +${enemy.rewardGold}% Gold`
          : `+${enemy.penaltyHeat} Heat`}
      </p>
      <button class="big-btn" id="next">Continue ➔</button>
    </div>`;
  overlay.querySelector('#next').onclick = () => stepForward();
}

registerRoute('encounter', render);
export default render;
