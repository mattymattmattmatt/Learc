/* hud.js — persistent top-bar showing Gold % and Heat.
   Mounted once; shown only during gameplay scenes. */

import { state, subscribe, heatStatus } from './state.js';
import { getCountry, TOTAL_COUNTRIES } from './engine.js';

let el = null;

function build() {
  el = document.getElementById('hud');
  if (!el) return;
  el.innerHTML = `
    <div class="hud-inner">
      <div class="hud-loc" id="hudLoc"></div>
      <div class="hud-stats">
        <div class="hud-stat">
          <span class="hud-icon">🪙</span>
          <div class="hud-bar"><div class="hud-fill hud-gold" id="hudGoldFill"></div></div>
          <span class="hud-val" id="hudGoldVal">0%</span>
        </div>
        <div class="hud-stat">
          <span class="hud-icon">🔥</span>
          <div class="hud-bar"><div class="hud-fill hud-heat" id="hudHeatFill"></div></div>
          <span class="hud-val" id="hudHeatVal">0</span>
        </div>
      </div>
    </div>`;
  subscribe(update);
  update();
}

function update() {
  if (!el) return;
  const gold = state.gold;
  const heat = state.heat;
  const hs   = heatStatus();

  const goldFill = el.querySelector('#hudGoldFill');
  const goldVal  = el.querySelector('#hudGoldVal');
  const heatFill = el.querySelector('#hudHeatFill');
  const heatVal  = el.querySelector('#hudHeatVal');
  const loc      = el.querySelector('#hudLoc');

  if (goldFill) goldFill.style.width = gold + '%';
  if (goldVal)  goldVal.textContent  = gold + '%';
  // heat bar saturates visually at 30 (the GDD "high danger" floor)
  if (heatFill) heatFill.style.width = Math.min(100, (heat / 30) * 100) + '%';
  if (heatVal)  heatVal.textContent  = heat + ' · ' + hs.label;
  if (el.dataset) el.dataset.heat = hs.level;

  if (loc) {
    const i = state.countryIndex;
    if (i < TOTAL_COUNTRIES()) {
      const c = getCountry(i);
      loc.textContent = `${c.emoji} ${c.name} — ${i + 1}/${TOTAL_COUNTRIES()}`;
    } else {
      loc.textContent = '';
    }
  }
}

export function mountHUD() { if (!el) build(); }
export function showHUD()  {
  mountHUD();
  document.getElementById('hud')?.classList.add('show');
  document.body.classList.add('has-hud');
  update();
}
export function hideHUD()  {
  document.getElementById('hud')?.classList.remove('show');
  document.body.classList.remove('has-hud');
}
