/* state.js — runtime game state, tactics economy & persistence
   ----------------------------------------------------------------
   localStorage is the source of truth; Firebase (if present) is
   mirrored best-effort and never blocks play.
*/

import { TOTAL_COUNTRIES, heatScale } from './engine.js';
import { navigate } from './router.js';

const LS_PREFIX = 'kingsgold:save:';
const LS_LAST   = 'kingsgold:last';
const LS_BEST   = 'kingsgold:best';

export const HEAT_CAP    = 100;   // reach this → CAUGHT, run ends
export const COOLDOWN     = 2;    // a used companion rests this many puzzles

/* ── live state ─────────────────────────────────────────────────── */
export const state = {
  name: '',
  gold: 0,            // 0–100 (% treasure recovered)
  heat: 0,            // 0–100 (suspicion / capture clock)
  combo: 0,           // current streak of perfect picks
  maxCombo: 0,
  consecutiveBad: 0,
  countryIndex: 0,
  slotIndex: 0,
  captured: false,    // transient — set when Heat hits the cap
  cooldowns: {}       // transient — petId → puzzles remaining
};

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function notify() { listeners.forEach(fn => fn(state)); }

/* ── cooldowns ──────────────────────────────────────────────────── */
export function isResting(id)  { return (state.cooldowns[id] || 0) > 0; }
export function restingTurns(id){ return state.cooldowns[id] || 0; }
export function restCompanion(id) { state.cooldowns[id] = COOLDOWN; }
function tickCooldowns() {
  for (const id of Object.keys(state.cooldowns)) {
    state.cooldowns[id] -= 1;
    if (state.cooldowns[id] <= 0) delete state.cooldowns[id];
  }
}

/* ── outcome economy (the heart of the tactics loop) ────────────── */
function goldGain(combo) {
  if (combo >= 9) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

/* Apply a resolved tier. Returns { goldDelta, heatDelta, captured }. */
export function applyOutcome(tier, act) {
  let goldDelta = 0, heatDelta = 0;

  if (tier === 'good') {
    state.combo += 1;
    state.maxCombo = Math.max(state.maxCombo, state.combo);
    state.consecutiveBad = 0;
    goldDelta = goldGain(state.combo);
    if (state.combo >= 4) heatDelta = -3;          // a hot streak cools the trail
  } else if (tier === 'normal') {
    state.combo = 0;
    heatDelta = 2 + act;                            // sloppy: suspicion creeps
  } else { // bad
    state.combo = 0;
    state.consecutiveBad += 1;
    heatDelta = heatScale(act);                     // a blunder spikes Heat
  }

  state.gold = Math.max(0, Math.min(100, state.gold + goldDelta));
  state.heat = Math.max(0, Math.min(HEAT_CAP, state.heat + heatDelta));
  if (state.heat >= HEAT_CAP) state.captured = true;

  save();
  notify();
  return { goldDelta, heatDelta, captured: state.captured };
}

/* enemy-encounter helpers (still mutate Heat directly) */
export function addHeat(v)  { state.heat = Math.max(0, Math.min(HEAT_CAP, state.heat + v));
                             if (state.heat >= HEAT_CAP) state.captured = true; notify(); }
export function addGold(p)  { state.gold = Math.max(0, Math.min(100, state.gold + p)); notify(); }
export function resetBad()  { state.consecutiveBad = 0; notify(); }

/* ── lifecycle ──────────────────────────────────────────────────── */
export function newGame(name) {
  Object.assign(state, {
    name, gold: 0, heat: 0, combo: 0, maxCombo: 0, consecutiveBad: 0,
    countryIndex: 0, slotIndex: 0, captured: false, cooldowns: {}
  });
  save();
  notify();
}

export function heatStatus() {
  const pct = state.heat / HEAT_CAP;
  if (pct >= 0.75) return { label: 'CRITICAL',  level: 'danger' };
  if (pct >= 0.40) return { label: 'Suspicious', level: 'rising' };
  return { label: 'Cold', level: 'safe' };
}

/* ── navigation (single source of truth for the loop) ───────────── */
export function routeForState() {
  const total = TOTAL_COUNTRIES();
  if (state.captured) return 'ending';
  if (total && state.countryIndex >= total) return 'ending';
  return state.slotIndex === 0 ? 'map' : 'puzzle';
}

export function stepForward() {
  if (state.captured) { navigate('ending'); return; }
  tickCooldowns();
  if (state.slotIndex < 4) {
    state.slotIndex += 1;
    save();
    navigate('puzzle');
  } else {
    navigate('summary');
  }
}

export function advanceCountry() {
  state.countryIndex += 1;
  state.slotIndex = 0;
  save();
  navigate(routeForState());
}

/* ── scoring ────────────────────────────────────────────────────── */
export function computeScore() {
  const cleared = state.captured ? state.countryIndex : Math.min(state.countryIndex, TOTAL_COUNTRIES());
  return Math.max(0,
    state.gold * 100 + state.maxCombo * 40 + cleared * 25 - state.heat * 3);
}
export function bestScore() {
  try { return parseInt(localStorage.getItem(LS_BEST) || '0', 10) || 0; } catch { return 0; }
}
export function recordScore(score) {
  try {
    if (score > bestScore()) { localStorage.setItem(LS_BEST, String(score)); return true; }
  } catch {}
  return false;
}

/* ── persistence ────────────────────────────────────────────────── */
function snapshot() {
  return {
    name: state.name, gold: state.gold, heat: state.heat,
    combo: state.combo, maxCombo: state.maxCombo,
    consecutiveBad: state.consecutiveBad,
    countryIndex: state.countryIndex, slotIndex: state.slotIndex,
    updatedAt: Date.now()
  };
}

export function save() {
  if (!state.name) return;
  const data = snapshot();
  try {
    localStorage.setItem(LS_PREFIX + state.name.toLowerCase(), JSON.stringify(data));
    localStorage.setItem(LS_LAST, state.name.toLowerCase());
  } catch {}
  cloudSave(data);
}

export function loadByName(name) {
  const key = LS_PREFIX + name.trim().toLowerCase();
  let raw;
  try { raw = localStorage.getItem(key); } catch { raw = null; }
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    Object.assign(state, {
      name: d.name || name,
      gold: d.gold | 0, heat: d.heat | 0,
      combo: d.combo | 0, maxCombo: d.maxCombo | 0,
      consecutiveBad: d.consecutiveBad | 0,
      countryIndex: d.countryIndex | 0, slotIndex: d.slotIndex | 0,
      captured: false, cooldowns: {}
    });
    notify();
    return d;
  } catch { return null; }
}

export function hasAnySave() { try { return !!localStorage.getItem(LS_LAST); } catch { return false; } }
export function lastSaveName(){ try { return localStorage.getItem(LS_LAST) || ''; } catch { return ''; } }

function cloudSave(data) {
  import('./save.js').then(m => m.saveProgress?.(data.name, data)).catch(() => {});
}
