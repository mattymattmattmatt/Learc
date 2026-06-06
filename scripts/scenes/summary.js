import { registerRoute } from '../router.js';
import { stopBGM }       from '../bgm.js';
import { loadData, getCountry, TOTAL_COUNTRIES } from '../engine.js';
import { state, advanceCountry, heatStatus } from '../state.js';
import { showHUD }       from '../hud.js';

async function render(container) {
  stopBGM();
  await loadData();
  const i = state.countryIndex;
  const c = getCountry(i);
  showHUD();

  const last = i + 1 >= TOTAL_COUNTRIES();
  const hs   = heatStatus();

  const note = hs.level === 'danger'
    ? 'The thieves are closing in — tread carefully from here.'
    : hs.level === 'rising'
      ? 'Word of your hunt is spreading. Keep your head down.'
      : 'Clean and quiet — the trail is still cold. Excellent work.';

  container.innerHTML = `
    <div class="card summary-card biome-${c.biome}">
      <div class="map-emoji">${c.emoji}</div>
      <h1 class="game-title small">${c.name} Cleared!</h1>
      <p class="body-text">You've searched every trial near <b>${c.landmark}</b>.</p>
      <div class="summary-stats">
        <div><span class="hud-icon">🪙</span><b>${state.gold}%</b><small>Gold recovered</small></div>
        <div><span class="hud-icon">🔥</span><b>${state.heat}</b><small>Heat · ${hs.label}</small></div>
      </div>
      <p class="act-note">${note}</p>
      <button id="next" class="big-btn">
        ${last ? 'Return to the King ➔' : `Travel onward ➔`}
      </button>
    </div>`;

  container.querySelector('#next').onclick = () => advanceCountry();
}

registerRoute('summary', render);
export default render;
