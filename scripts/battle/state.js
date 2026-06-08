/* state.js — adventure progress, lives, and save
   ----------------------------------------------------------------
   Lives are checkpoints: you start a region with MAX_LIVES; losing a
   battle costs a life and you retry it. Run out → game over and the
   whole CURRENT REGION restarts (earlier regions stay cleared).
*/

import { buildAdventure } from './data.js';

export const MAX_LIVES = 3;
const LS = 'realm:save';
const MODE_LS = 'realm:mode';

/* difficulty mode: 'story' (gentler, more hearts) or 'normal' */
export function getMode() { try { return localStorage.getItem(MODE_LS) === 'story' ? 'story' : 'normal'; } catch { return 'normal'; } }
export function setMode(m) { try { localStorage.setItem(MODE_LS, m === 'story' ? 'story' : 'normal'); } catch {} }
export function livesFor(mode) { return mode === 'story' ? 5 : 3; }
/* scale a foe's base difficulty (1..10) by the chosen mode */
export function effDiff(d) { return state.mode === 'story' ? Math.max(1, Math.round(d * 0.62)) : d; }

export const state = {
  heroId: null,
  adventure: null,     // built from hero
  mode: 'normal',
  maxLives: MAX_LIVES,
  region: 0,           // 0..2 = regions, 3 = King
  idx: 0,              // foe index within current region
  lives: MAX_LIVES,
  stars: {},           // foeId → 1..3 (includes 'king')
  continues: 0,        // times the player has used a game-over continue
  done: false
};

/* ── scoring / leaderboard helpers ────────────────────────────── */
export function maxStars() { return (state.adventure ? totalFoes() : 24) * 3; }   // 24 battles × 3 = 72
/* a clean run (no continues) earns a perfect-run bonus */
export function finalScore() { return totalStars() + (state.continues === 0 && state.done ? 6 : 0); }
const NAME_LS = 'realm:name';
export function getName() { try { return localStorage.getItem(NAME_LS) || ''; } catch { return ''; } }
export function setName(n) { try { localStorage.setItem(NAME_LS, (n || '').slice(0, 14)); } catch {} }

export function startAdventure(heroId) {
  state.heroId = heroId;
  state.adventure = buildAdventure(heroId);
  state.mode = getMode();
  state.maxLives = livesFor(state.mode);
  state.region = 0;
  state.idx = 0;
  state.lives = state.maxLives;
  state.stars = {};
  state.continues = 0;
  state.done = false;
  save();
}

/* current foe entry, or null when it's time for the King */
export function currentRegion() { return state.adventure.regions[state.region] || null; }
export function currentFoe() {
  if (state.region >= 3) return state.adventure.king;     // King
  const r = currentRegion();
  return r ? r.foes[state.idx] : null;
}
export function isKingNext() { return state.region >= 3; }

export function totalFoes() {
  return state.adventure.regions.reduce((n, r) => n + r.foes.length, 0) + 1;
}
export function clearedCount() {
  let n = 0;
  for (let r = 0; r < state.region; r++) n += state.adventure.regions[r].foes.length;
  if (state.region < 3) n += state.idx; else n += state.adventure.regions.reduce((a, x) => a + x.foes.length, 0);
  return n;
}

/* ── outcomes ─────────────────────────────────────────────────── */
/* returns one of: 'next-foe' | 'region-clear' | 'king' | 'win' */
export function recordWin(foeId, stars) {
  state.stars[foeId] = Math.max(state.stars[foeId] || 0, stars);   // includes 'king'

  if (state.region >= 3) { state.done = true; save(); return 'win'; }

  state.idx++;
  const r = currentRegion();
  if (state.idx >= r.foes.length) {
    state.region++;
    state.idx = 0;
    state.lives = state.maxLives;            // refill at each new region
    save();
    return state.region >= 3 ? 'king' : 'region-clear';
  }
  save();
  return 'next-foe';
}

/* returns 'retry' (lives remain) or 'gameover' */
export function recordLoss() {
  state.lives--;
  if (state.lives <= 0) {
    // restart current region from the top with full lives
    state.idx = 0;
    state.lives = state.maxLives;
    state.continues = (state.continues || 0) + 1;
    save();
    return 'gameover';
  }
  save();
  return 'retry';
}

/* ── persistence (localStorage; never throws) ─────────────────── */
export function save() {
  try {
    localStorage.setItem(LS, JSON.stringify({
      heroId: state.heroId, mode: state.mode, maxLives: state.maxLives,
      region: state.region, idx: state.idx, continues: state.continues,
      lives: state.lives, stars: state.stars, done: state.done
    }));
  } catch {}
}
export function hasSave() { try { return !!localStorage.getItem(LS); } catch { return false; } }
export function loadSave() {
  let raw; try { raw = localStorage.getItem(LS); } catch { return false; }
  if (!raw) return false;
  try {
    const d = JSON.parse(raw);
    if (!d.heroId) return false;
    state.heroId = d.heroId;
    state.adventure = buildAdventure(d.heroId);
    state.mode = d.mode === 'story' ? 'story' : 'normal';
    state.maxLives = d.maxLives || livesFor(state.mode);
    state.region = d.region | 0;
    state.idx = d.idx | 0;
    state.lives = d.lives ?? state.maxLives;
    state.stars = d.stars || {};
    state.continues = d.continues | 0;
    state.done = !!d.done;
    return true;
  } catch { return false; }
}
export function totalStars() { return Object.values(state.stars).reduce((a, b) => a + b, 0); }
