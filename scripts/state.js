/* state.js — runtime game state + persistence for King's Gold
   ----------------------------------------------------------------
   Persistence is localStorage-first so the core loop works with NO
   backend.  Firebase, if configured, is written to in a best-effort
   fire-and-forget manner and NEVER blocks or breaks gameplay.
*/

import { TOTAL_COUNTRIES } from './engine.js';
import { navigate } from './router.js';

const LS_PREFIX = 'kingsgold:save:';
const LS_LAST   = 'kingsgold:last';

/* ── live state ─────────────────────────────────────────────────── */
export const state = {
  name: '',
  gold: 0,          // 0–100 (%)
  heat: 0,          // 0+
  consecutiveBad: 0,
  countryIndex: 0,  // 0-based chapter
  slotIndex: 0      // 0–4 puzzle slot
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach(fn => fn(state)); }

/* ── mutators ───────────────────────────────────────────────────── */
export function addGold(p) { state.gold = Math.max(0, Math.min(100, state.gold + p)); notify(); }
export function addHeat(v) { state.heat = Math.max(0, state.heat + v);                notify(); }
export function resetBad()  { state.consecutiveBad = 0;        notify(); }
export function incBad()    { state.consecutiveBad += 1;       notify(); }

/* ── lifecycle ──────────────────────────────────────────────────── */
export function newGame(name) {
  state.name = name;
  state.gold = 0;
  state.heat = 0;
  state.consecutiveBad = 0;
  state.countryIndex = 0;
  state.slotIndex = 0;
  save();
  notify();
}

/* Heat status label per GDD thresholds. */
export function heatStatus() {
  if (state.heat <= 10) return { label: 'Safe',      level: 'safe'   };
  if (state.heat <= 25) return { label: 'Suspicious', level: 'rising' };
  return { label: 'High Danger', level: 'danger' };
}

/* ── navigation helpers (single source of truth for the loop) ───── */
export function routeForState() {
  const total = TOTAL_COUNTRIES();
  if (total && state.countryIndex >= total) return 'ending';
  return state.slotIndex === 0 ? 'map' : 'puzzle';
}

/* Advance one slot; if a country is finished, route to its summary. */
export function stepForward() {
  if (state.slotIndex < 4) {
    state.slotIndex += 1;
    save();
    navigate('puzzle');
  } else {
    // country complete — summary screen handles the country++ step
    navigate('summary');
  }
}

/* Called by the summary screen to move on to the next country. */
export function advanceCountry() {
  state.countryIndex += 1;
  state.slotIndex = 0;
  save();
  navigate(routeForState());
}

/* ── persistence ────────────────────────────────────────────────── */
function snapshot() {
  return {
    name: state.name,
    gold: state.gold,
    heat: state.heat,
    consecutiveBad: state.consecutiveBad,
    countryIndex: state.countryIndex,
    slotIndex: state.slotIndex,
    updatedAt: Date.now()
  };
}

export function save() {
  if (!state.name) return;
  const data = snapshot();
  try {
    localStorage.setItem(LS_PREFIX + state.name.toLowerCase(), JSON.stringify(data));
    localStorage.setItem(LS_LAST, state.name.toLowerCase());
  } catch { /* storage unavailable — game still runs in-memory */ }
  // best-effort cloud save (never awaited, never throws)
  cloudSave(data);
}

export function loadByName(name) {
  const key = LS_PREFIX + name.trim().toLowerCase();
  let raw;
  try { raw = localStorage.getItem(key); } catch { raw = null; }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    Object.assign(state, {
      name: data.name || name,
      gold: data.gold | 0,
      heat: data.heat | 0,
      consecutiveBad: data.consecutiveBad | 0,
      countryIndex: data.countryIndex | 0,
      slotIndex: data.slotIndex | 0
    });
    notify();
    return data;
  } catch { return null; }
}

export function hasAnySave() {
  try { return !!localStorage.getItem(LS_LAST); } catch { return false; }
}
export function lastSaveName() {
  try { return localStorage.getItem(LS_LAST) || ''; } catch { return ''; }
}

/* Optional Firebase write — imported lazily so a missing/broken
   Firebase config can never stop the game from running. */
function cloudSave(data) {
  import('./save.js')
    .then(m => m.saveProgress?.(data.name, data))
    .catch(() => { /* offline / no backend — fine */ });
}
