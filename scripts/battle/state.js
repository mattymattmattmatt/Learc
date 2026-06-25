/* state.js — adventure progress & save
   ----------------------------------------------------------------
   No more lives! You play your chosen champion until you win — lose a
   battle and you simply try that same battle again (no going back to the
   start). Difficulty modes only change how hard the minigames play.
   Each region ends with one of Glob's henchmen; clear all three to face
   Glob himself.
*/

import { buildAdventure } from './data.js';

const LS = 'realm:save';
const MODE_LS = 'realm:mode';

/* difficulty mode: 'story' (gentle), 'normal', or 'hard' (brutal minigames).
   All modes now have infinite retries — the mode only scales the challenge. */
const MODES = ['story', 'normal', 'hard'];
export function getMode() { try { const m = localStorage.getItem(MODE_LS); return MODES.includes(m) ? m : 'normal'; } catch { return 'normal'; } }
export function setMode(m) { try { localStorage.setItem(MODE_LS, MODES.includes(m) ? m : 'normal'); } catch {} }
/* the Gauntlet (a separate, optional mode) still uses lives */
export function livesFor(mode) { return mode === 'story' ? 5 : 3; }
/* scale a foe's base difficulty (1..11) by the chosen mode */
export function effDiff(d) {
  if (state.mode === 'story') return Math.max(1, Math.round(d * 0.62));
  if (state.mode === 'hard')  return Math.min(15, d + 5);   // every battle plays ~5 tiers up
  return d;
}

export const state = {
  heroId: null,
  adventure: null,     // built from hero
  mode: 'normal',
  region: 0,           // 0..2 = regions, 3 = Glob
  idx: 0,              // foe index within current region (== foes.length → henchman)
  stars: {},           // foeId → 1..3 (includes the bosses + 'glob')
  continues: 0,        // how many battles you've lost (for the clean-run bonus)
  done: false
};

/* ── scoring / leaderboard helpers ────────────────────────────── */
export function totalBattles() {
  if (!state.adventure) return 27;
  return state.adventure.regions.reduce((n, r) => n + r.foes.length + 1, 0) + 1; // +1 henchman each, +1 Glob
}
export function maxStars() { return totalBattles() * 3; }
/* a clean run (never lost a battle) earns a perfect-run bonus */
export function finalScore() { return totalStars() + (state.continues === 0 && state.done ? 6 : 0); }
const NAME_LS = 'realm:name';
export function getName() { try { return localStorage.getItem(NAME_LS) || ''; } catch { return ''; } }
export function setName(n) { try { localStorage.setItem(NAME_LS, (n || '').slice(0, 14)); } catch {} }

export function startAdventure(heroId) {
  state.heroId = heroId;
  state.adventure = buildAdventure(heroId);
  state.mode = getMode();
  state.region = 0;
  state.idx = 0;
  state.stars = {};
  state.continues = 0;
  state.done = false;
  save();
}

/* current region (null once we're at Glob) */
export function currentRegion() { return state.region < 3 ? state.adventure.regions[state.region] : null; }
/* current foe entry: a champion, then the region's henchman, then Glob */
export function currentFoe() {
  if (state.region >= 3) return state.adventure.glob;
  const r = currentRegion();
  if (!r) return null;
  return state.idx < r.foes.length ? r.foes[state.idx] : r.boss;
}
export function isBossNext() { const r = currentRegion(); return !!r && state.idx === r.foes.length; }
export function isGlobNext() { return state.region >= 3; }

/* number of captured champions (the things you "free") */
export function championCount() {
  return state.adventure.regions.reduce((n, r) => n + r.foes.length, 0);
}
export const totalFoes = championCount;   // kept for older call sites
export function clearedCount() {
  let n = 0;
  for (let r = 0; r < Math.min(state.region, 3); r++) n += state.adventure.regions[r].foes.length;
  if (state.region < 3) n += Math.min(state.idx, currentRegion().foes.length);
  return n;
}

/* ── outcomes ─────────────────────────────────────────────────── */
/* returns: 'next-foe' | 'region-boss' | 'region-clear' | 'glob' | 'win' */
export function recordWin(foeId, stars) {
  state.stars[foeId] = Math.max(state.stars[foeId] || 0, stars);

  if (state.region >= 3) { state.done = true; save(); return 'win'; }  // beat Glob

  const r = currentRegion();
  if (state.idx < r.foes.length) {
    state.idx++;                              // freed a champion
    save();
    return state.idx >= r.foes.length ? 'region-boss' : 'next-foe';
  }
  // beat the region's henchman
  state.region++;
  state.idx = 0;
  save();
  return state.region >= 3 ? 'glob' : 'region-clear';
}

/* friendly rematch of an already-freed champion: can only improve stars */
export function recordRematch(foeId, stars) {
  state.stars[foeId] = Math.max(state.stars[foeId] || 0, stars);
  save();
}

/* no lives any more — a loss just means "try the same battle again" */
export function recordLoss() {
  state.continues = (state.continues || 0) + 1;
  save();
  return 'retry';
}

/* ── persistence (localStorage; never throws) ─────────────────── */
export function save() {
  try {
    localStorage.setItem(LS, JSON.stringify({
      heroId: state.heroId, mode: state.mode,
      region: state.region, idx: state.idx, continues: state.continues,
      stars: state.stars, done: state.done
    }));
  } catch {}
}
export function hasSave() { try { return !!localStorage.getItem(LS); } catch { return false; } }
/* peek the saved adventure's hero without loading the save (used by practice mode) */
export function savedHeroId() {
  try { const d = JSON.parse(localStorage.getItem(LS) || 'null'); return (d && d.heroId) || null; } catch { return null; }
}
export function loadSave() {
  let raw; try { raw = localStorage.getItem(LS); } catch { return false; }
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    if (!d.heroId) return false;
    state.heroId = d.heroId;
    state.adventure = buildAdventure(d.heroId);
    state.mode = MODES.includes(d.mode) ? d.mode : 'normal';
    state.region = d.region | 0;
    state.idx = d.idx | 0;
    state.stars = d.stars || {};
    state.continues = d.continues | 0;
    state.done = !!d.done;
    return true;
  } catch { return false; }
}
export function totalStars() { return Object.values(state.stars).reduce((a, b) => a + b, 0); }
