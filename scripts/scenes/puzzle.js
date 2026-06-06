import { registerRoute } from '../router.js';
import { stopBGM, playSfx } from '../bgm.js';
import { pickPet }        from '../petGrid.js';
import {
  loadData, buildPuzzle, classify, resultText,
  getPets, getPetArray, petSfx, getBaddies, getCountry, TOTAL_COUNTRIES
} from '../engine.js';
import {
  state, addGold, addHeat, resetBad, incBad, stepForward
} from '../state.js';
import { showHUD }        from '../hud.js';

/* Special-case background image we actually have an asset for. */
const BG_IMAGE = { 'AU-S1': 'assets/img/bg_au01_fire.png' };

async function render(container) {
  stopBGM();
  await loadData();

  if (state.countryIndex >= TOTAL_COUNTRIES()) { location.hash = 'ending'; return; }

  const puzzle = buildPuzzle(state.countryIndex, state.slotIndex);
  showHUD();

  const bgImg = BG_IMAGE[puzzle.id];
  const bgStyle = bgImg
    ? `background-image:url('${bgImg}')`
    : '';

  container.innerHTML = `
    <div class="puzzle-scene arch-${puzzle.archetype}" ${bgImg ? `style="${bgStyle}"` : ''}>
      <div class="puzzle-overlay">
        <div class="puzzle-head">
          <span class="slot-tag">Slot ${puzzle.slotIndex + 1}/5 · ${puzzle.role}</span>
          <span class="puzzle-label">${puzzle.country.emoji} ${puzzle.label}</span>
        </div>
        <p class="puzzle-prompt" id="prompt">${puzzle.prompt}</p>
        <div class="pet-filters" id="filters">
          <button class="chip active" data-f="all">All</button>
          <button class="chip" data-f="land">🐾 Land</button>
          <button class="chip" data-f="sea">🌊 Sea</button>
          <button class="chip" data-f="sky">🕊️ Sky</button>
        </div>
        <div id="grid" class="pet-grid"></div>
      </div>
    </div>`;

  const grid = container.querySelector('#grid');
  drawGrid(grid, 'all');

  // habitat filters
  container.querySelectorAll('#filters .chip').forEach(chip => {
    chip.onclick = () => {
      container.querySelectorAll('#filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      drawGrid(grid, chip.dataset.f);
    };
  });

  // wait for selection
  pickPet(grid).then(id => {
    const pet = getPets()[id];
    playSfx(petSfx(pet), 0.7);
    resolveOutcome(pet, puzzle, container);
  });
}

function drawGrid(grid, filter) {
  const pets = getPetArray().filter(p => filter === 'all' || p.habitat === filter);
  grid.innerHTML = pets.map(p => `
    <button class="pet-thumb" data-id="${p.id}" title="${p.name} — ${p.power}">
      <img src="assets/img/characters/${p.sprite}" alt="${p.name}">
      <span class="pet-name">${p.name}</span>
    </button>`).join('');
}

function resolveOutcome(pet, puzzle, container) {
  const tier = classify(pet.id, puzzle);

  let effect = '', goldDelta = 0;
  if (tier === 'good')   { addGold(3); resetBad(); effect = '+3% Gold'; goldDelta = 3; }
  if (tier === 'normal') { addGold(1);             effect = '+1% Gold'; goldDelta = 1; }
  if (tier === 'bad')    { addHeat(4); incBad();   effect = '+4 Heat';  }

  // enemy trigger from the bad streak (GDD: 2→brigand, 3→turncoat, 4+→vizier)
  let pendingEnemy = null;
  if (tier === 'bad') {
    const cb = state.consecutiveBad;
    if (cb === 2)      pendingEnemy = 'street_brigand';
    else if (cb === 3) pendingEnemy = 'royal_turncoat';
    else if (cb >= 4)  pendingEnemy = 'false_vizier';
  }
  state.pendingEnemy = pendingEnemy;

  const overlay = container.querySelector('.puzzle-overlay');
  const enemyNote = pendingEnemy
    ? `<p class="enemy-warn">⚠️ Your blunders have drawn the ${getBaddies()[pendingEnemy].name}!</p>`
    : '';

  overlay.innerHTML = `
    <div class="result result-${tier}">
      <img src="assets/img/characters/${pet.sprite}" class="result-pet" alt="${pet.name}">
      <h2 class="result-tier">${tier.toUpperCase()}!</h2>
      <p class="result-pet-name"><b>${pet.name}</b> — <i>${pet.power}</i></p>
      <p class="body-text">${resultText(tier, puzzle)}</p>
      <p class="result-effect">${effect}</p>
      ${enemyNote}
      <button class="big-btn" id="next">${pendingEnemy ? 'Confront them ➔' : 'Continue ➔'}</button>
    </div>`;

  overlay.querySelector('#next').onclick = () => {
    if (state.pendingEnemy) { location.hash = 'encounter'; }
    else stepForward();
  };
}

registerRoute('puzzle', render);
export default render;
