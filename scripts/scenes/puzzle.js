import { registerRoute } from '../router.js';
import { stopBGM, playSfx } from '../bgm.js';
import { pickPet }        from '../petGrid.js';
import {
  loadData, buildPuzzle, classify, resultText,
  getPets, getPetArray, petSfx, petBadges, traitIcon,
  getBaddies, TOTAL_COUNTRIES
} from '../engine.js';
import {
  state, applyOutcome, restCompanion, isResting, restingTurns, stepForward
} from '../state.js';
import { showHUD }        from '../hud.js';

const BG_IMAGE = { 'AU-S1': 'assets/img/bg_au01_fire.png' };
const TUT_KEY  = 'kingsgold:tut';

async function render(container) {
  stopBGM();
  await loadData();
  if (state.captured || state.countryIndex >= TOTAL_COUNTRIES()) { location.hash = 'ending'; return; }

  const puzzle = buildPuzzle(state.countryIndex, state.slotIndex);
  showHUD();

  const bgImg = BG_IMAGE[puzzle.id];

  container.innerHTML = `
    <div class="puzzle-scene hz-${puzzle.hazard} ${puzzle.isBoss ? 'is-boss' : ''}"
         ${bgImg ? `style="background-image:url('${bgImg}')"` : ''}>
      <div class="puzzle-overlay">
        <div class="puzzle-head">
          <span class="slot-tag ${puzzle.isBoss ? 'boss-tag' : ''}">
            ${puzzle.isBoss ? '👑 BOSS · ' : ''}Slot ${puzzle.slotIndex + 1}/5 · ${puzzle.role}
          </span>
          <span class="puzzle-label">${puzzle.label}</span>
        </div>
        <p class="puzzle-prompt">${puzzle.prompt}</p>
        ${hintHTML(puzzle)}
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

  container.querySelectorAll('#filters .chip').forEach(chip => {
    chip.onclick = () => {
      container.querySelectorAll('#filters .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      drawGrid(grid, chip.dataset.f);
    };
  });

  maybeShowTutorial(container);

  pickPet(grid).then(id => {
    const pet = getPets()[id];
    playSfx(petSfx(pet), 0.7);
    resolveOutcome(pet, puzzle, container);
  });
}

/* hazard hint, revealed according to act disclosure level */
function hintHTML(p) {
  if (p.disclosure >= 2) {
    return `<div class="hazard-hint cryptic"><span class="hint-label">Whispers:</span>
              <i>${p.clue}</i></div>`;
  }
  const need = p.need.map(traitIcon).join(' ');
  const back = p.backfire.map(traitIcon).join(' ');
  return `<div class="hazard-hint">
      <span class="counter">Counter with ${need}</span>
      ${p.disclosure === 0
        ? `<span class="backfire">Backfires on ${back}</span>`
        : `<span class="backfire muted">Backfire: unknown</span>`}
    </div>`;
}

function drawGrid(grid, filter) {
  const pets = getPetArray().filter(p => filter === 'all' || p.habitat === filter);
  grid.innerHTML = pets.map(p => {
    const resting = isResting(p.id);
    return `
      <button class="pet-thumb${resting ? ' resting' : ''}" data-id="${p.id}"
              ${resting ? 'disabled' : ''}
              title="${p.name} — ${p.power}">
        <img src="assets/img/characters/${p.sprite}" alt="${p.name}">
        <span class="pet-badges">${petBadges(p)}</span>
        <span class="pet-name">${p.name}</span>
        ${resting ? `<span class="rest-overlay">💤 ${restingTurns(p.id)}</span>` : ''}
      </button>`;
  }).join('');
}

function resolveOutcome(pet, puzzle, container) {
  const tier = classify(pet.id, puzzle);
  restCompanion(pet.id);
  const out = applyOutcome(tier, puzzle.act);

  // enemy trigger from a bad streak (unless the run just ended)
  let pendingEnemy = null;
  if (tier === 'bad' && !out.captured) {
    const cb = state.consecutiveBad;
    if (cb === 2)      pendingEnemy = 'street_brigand';
    else if (cb === 3) pendingEnemy = 'royal_turncoat';
    else if (cb >= 4)  pendingEnemy = 'false_vizier';
  }
  state.pendingEnemy = pendingEnemy;

  // juice
  const scene = container.querySelector('.puzzle-scene');
  if (tier === 'good')      scene.classList.add('flash-good');
  else if (tier === 'bad')  scene.classList.add('flash-bad', 'shake');
  else                      scene.classList.add('flash-normal');

  const goldStr = out.goldDelta ? `+${out.goldDelta}% Gold` : 'No gold';
  const heatStr = out.heatDelta > 0 ? `+${out.heatDelta} Heat`
                : out.heatDelta < 0 ? `${out.heatDelta} Heat` : '';
  const comboStr = (tier === 'good' && state.combo >= 2)
    ? `<div class="combo-pop">COMBO ×${state.combo}! <small>gold ×${goldMult(state.combo)}</small></div>` : '';

  const overlay = container.querySelector('.puzzle-overlay');

  if (out.captured) {
    overlay.innerHTML = `
      <div class="result result-bad caught">
        <h2 class="result-tier">🚨 CAUGHT!</h2>
        <p class="body-text">Your Heat hit ${state.heat}. The thieves' allies close in and drag you before the court.
          Your hunt ends here.</p>
        <p class="result-effect">${heatStr}</p>
        <button class="big-btn" id="next">See your fate ➔</button>
      </div>`;
    overlay.querySelector('#next').onclick = () => { location.hash = 'ending'; };
    return;
  }

  const enemyNote = pendingEnemy
    ? `<p class="enemy-warn">⚠️ Your blunders have drawn the ${getBaddies()[pendingEnemy].name}!</p>` : '';

  overlay.innerHTML = `
    <div class="result result-${tier}">
      ${comboStr}
      <img src="assets/img/characters/${pet.sprite}" class="result-pet" alt="${pet.name}">
      <h2 class="result-tier">${tier === 'good' ? 'PERFECT!' : tier === 'normal' ? 'SLOPPY…' : 'BLUNDER!'}</h2>
      <p class="result-pet-name"><b>${pet.name}</b> — <i>${pet.power}</i></p>
      <p class="body-text">${resultText(tier, puzzle)}</p>
      <p class="result-effect">${goldStr}${heatStr ? ` · ${heatStr}` : ''}</p>
      ${enemyNote}
      <button class="big-btn" id="next">${pendingEnemy ? 'Confront them ➔' : 'Continue ➔'}</button>
    </div>`;

  overlay.querySelector('#next').onclick = () => {
    if (state.pendingEnemy) location.hash = 'encounter';
    else stepForward();
  };
}

function goldMult(c) { return c >= 9 ? 4 : c >= 6 ? 3 : c >= 3 ? 2 : 1; }

function maybeShowTutorial(container) {
  let seen = false;
  try { seen = !!localStorage.getItem(TUT_KEY); } catch {}
  if (seen) return;
  const tip = document.createElement('div');
  tip.className = 'tutorial';
  tip.innerHTML = `
    <div class="tut-card">
      <h3>How to recover the gold</h3>
      <ul>
        <li>🎯 Each companion shows its <b>traits</b>. Match them to what the hazard needs.</li>
        <li>✅ A <b>perfect counter</b> earns gold and builds a <b>combo</b> (bigger gold, cooler Heat).</li>
        <li>💥 A <b>backfire</b> spikes your <b>Heat</b> — fill the bar and you're <b>caught</b>.</li>
        <li>💤 A used companion <b>rests</b> for 2 turns, so learn several counters!</li>
        <li>🔍 Later, the hints fade — you'll have to <b>deduce</b> the counter yourself.</li>
      </ul>
      <button class="big-btn" id="tutOk">Got it — let's go</button>
    </div>`;
  container.appendChild(tip);
  tip.querySelector('#tutOk').onclick = () => {
    try { localStorage.setItem(TUT_KEY, '1'); } catch {}
    tip.remove();
  };
}

registerRoute('puzzle', render);
export default render;
