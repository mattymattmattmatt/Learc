import { registerRoute } from '../router.js';
import { stopBGM }       from '../bgm.js';
import { loadData, getCountry, TOTAL_COUNTRIES } from '../engine.js';
import { state }         from '../state.js';
import { showHUD }       from '../hud.js';

const ACT_NOTE = i => {
  if (i === 0)  return 'Act I — Your journey begins.';
  if (i < 9)    return 'Act II — The trail widens across the world.';
  if (i < 22)   return 'Act III — The thieves grow desperate. Suspicion runs high.';
  return 'Act IV — The final reckoning approaches.';
};

async function render(container) {
  stopBGM();
  await loadData();
  const i = state.countryIndex;
  if (i >= TOTAL_COUNTRIES()) { location.hash = 'ending'; return; }
  const c = getCountry(i);
  showHUD();

  container.innerHTML = `
    <div class="card map-card biome-${c.biome}">
      <div class="map-emoji">${c.emoji}</div>
      <h1 class="game-title small">Chapter ${i + 1}</h1>
      <h2 class="country-name">${c.name}</h2>
      <p class="act-note">${ACT_NOTE(i)}</p>
      <p class="body-text">
        A chest of stolen gold is hidden somewhere near <b>${c.landmark}</b>.
        Five trials stand between you and the treasure. Choose your companions well.
      </p>
      <button id="enter" class="big-btn">Enter ${c.name} ➔</button>
    </div>`;

  container.querySelector('#enter').onclick = () => { location.hash = 'puzzle'; };
}

registerRoute('map', render);
export default render;
