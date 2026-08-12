/* meta.js — progress that lives BETWEEN runs: best stars per champion
   (powers the Critterdex), earned badges, the Gauntlet record, and the
   Mystery Box collection (spins + owned 3D models).
   Stored in localStorage; everything fails soft. */

import { el, S, buzz } from './util.js';

const KEY = 'realm:meta';
let meta = null;
function load() {
  if (meta) return meta;
  try { meta = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { meta = {}; }
  meta.bestStars = meta.bestStars || {};
  meta.badges = meta.badges || {};
  meta.gauntletBest = meta.gauntletBest | 0;
  meta.spins = meta.spins | 0;         // Mystery Box spins in the bank
  meta.models = meta.models || {};     // modelId → times pulled (≥1 = owned)
  return meta;
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(meta)); } catch {} }

/* ── badges ──────────────────────────────────────────────────── */
export const BADGES = [
  { id: 'first-win',   icon: '🗡️', name: 'First Victory',   desc: 'Win your very first battle.' },
  { id: 'flawless',    icon: '🌟', name: 'Flawless',         desc: 'Earn 3 stars in a single battle.' },
  { id: 'land-free',   icon: '🌳', name: 'Land Liberator',   desc: 'Free every champion of the Verdant Reach.' },
  { id: 'sea-free',    icon: '🌊', name: 'Tide Turner',      desc: 'Free every champion of the Sunken Tides.' },
  { id: 'sky-free',    icon: '⛰️', name: 'Storm Breaker',    desc: 'Free every champion of the Stormcrown Peaks.' },
  { id: 'crown',       icon: '👑', name: 'Crown Breaker',    desc: 'Defeat Evil King Glob and free the realm.' },
  { id: 'unbroken',    icon: '🛡️', name: 'Unbroken',         desc: 'Finish an adventure without losing a single battle.' },
  { id: 'star-master', icon: '💫', name: 'Star Master',      desc: 'Finish an adventure with every star.' },
  { id: 'gauntlet-5',  icon: '🔥', name: 'Gauntlet Hero',    desc: 'Clear 5 rounds in one Gauntlet run.' },
  { id: 'gauntlet-12', icon: '⚡', name: 'Gauntlet Legend',  desc: 'Clear 12 rounds in one Gauntlet run.' },
  // ── Hard-mode feats ──
  { id: 'hard-flawless', icon: '🔱', name: 'Hardcore Ace',   desc: 'Earn 3 stars in a battle on Hard mode.' },
  { id: 'hard-crown',    icon: '😈', name: 'Tyrant Tamer',   desc: 'Defeat Evil King Glob on Hard mode.' },
  { id: 'hard-unbroken', icon: '💎', name: 'Untouchable',    desc: 'Finish a Hard-mode adventure without losing a battle.' },
  { id: 'hard-master',   icon: '🏆', name: 'Realm Legend',   desc: 'Finish a Hard-mode adventure with every star.' }
];

export function hasBadge(id) { return !!load().badges[id]; }
export function badgeCount() { return Object.keys(load().badges).length; }

/* ── best-ever stars per champion (Critterdex) ───────────────── */
export function bestStarsFor(foeId) { return load().bestStars[foeId] | 0; }
export function recordBestStars(foeId, stars) {
  const m = load();
  if ((m.bestStars[foeId] | 0) < stars) { m.bestStars[foeId] = stars; save(); }
}

/* ── gauntlet record ─────────────────────────────────────────── */
export function gauntletBest() { return load().gauntletBest | 0; }
export function recordGauntlet(score) {
  const m = load();
  if (score > m.gauntletBest) { m.gauntletBest = score; save(); }
}

/* ── Mystery Box: spins + the 3D model collection ────────────────
   Spins are awarded ONLY at the moment Glob falls (never on the ending
   screen itself, which can be revisited via Continue), so they can't be
   farmed by re-opening a finished save. The balance banks across runs. */
export function spinsLeft() { return load().spins | 0; }
export function addSpins(n) { const m = load(); m.spins = Math.max(0, (m.spins | 0) + (n | 0)); save(); return m.spins; }
/* spend one spin; returns false if the bank is empty (nothing spent) */
export function useSpin() {
  const m = load();
  if ((m.spins | 0) <= 0) return false;
  m.spins--; save(); return true;
}
export function modelCount(id) { return load().models[id] | 0; }
export function ownedModelCount() { return Object.keys(load().models).length; }
/* record a pull; returns true when it's a brand-new unlock */
export function grantModel(id) {
  const m = load();
  const isNew = !m.models[id];
  m.models[id] = (m.models[id] | 0) + 1;
  save();
  return isNew;
}

/* ── award a badge (once) + celebratory toast ────────────────── */
export function award(id) {
  const m = load();
  if (m.badges[id]) return false;
  const def = BADGES.find(b => b.id === id);
  if (!def) return false;
  m.badges[id] = Date.now(); save();
  queueToast(def);
  return true;
}

/* toasts queue so several badges earned together show one-by-one */
const q = [];
let showing = false;
function queueToast(def) { q.push(def); if (!showing) nextToast(); }
function nextToast() {
  const def = q.shift();
  if (!def) { showing = false; return; }
  showing = true;
  const t = el('div', 'badge-toast',
    `<span class="bt-icon">${def.icon}</span><span class="bt-txt"><b>Badge earned!</b><br>${def.name}</span>`);
  document.body.appendChild(t);
  S.badge(); buzz(20);
  setTimeout(() => t.classList.add('out'), 2100);
  setTimeout(() => { t.remove(); nextToast(); }, 2500);
}
