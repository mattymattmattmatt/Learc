/* hud.js — persistent top-bar: location · Combo · Gold % · Heat clock.
   Shown only during gameplay scenes. */

import { state, subscribe, heatStatus, HEAT_CAP } from './state.js';
import { getCountry, TOTAL_COUNTRIES } from './engine.js';

let el = null;

function build() {
  el = document.getElementById('hud');
  if (!el) return;
  el.innerHTML = `
    <div class="hud-inner">
      <div class="hud-loc" id="hudLoc"></div>
      <div class="hud-combo" id="hudCombo"></div>
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
  const hs = heatStatus();

  const set = (id, fn) => { const n = el.querySelector(id); if (n) fn(n); };
  set('#hudGoldFill', n => n.style.width = state.gold + '%');
  set('#hudGoldVal',  n => n.textContent = state.gold + '%');
  set('#hudHeatFill', n => n.style.width = Math.min(100, (state.heat / HEAT_CAP) * 100) + '%');
  set('#hudHeatVal',  n => n.textContent = state.heat + '/' + HEAT_CAP);
  el.dataset.heat = hs.level;

  set('#hudCombo', n => {
    if (state.combo >= 2) { n.textContent = `🔥 ×${state.combo}`; n.classList.add('on'); }
    else { n.textContent = ''; n.classList.remove('on'); }
  });

  set('#hudLoc', n => {
    const i = state.countryIndex;
    if (i < TOTAL_COUNTRIES()) {
      const c = getCountry(i);
      n.textContent = c ? `${c.emoji} ${c.name} ${i + 1}/${TOTAL_COUNTRIES()}` : '';
    } else n.textContent = '';
  });
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
