/* meta.js — progress that lives BETWEEN runs: best stars per champion
   (powers the Critterdex), earned badges, and the Gauntlet record.
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
  S.star(); buzz(20);
  setTimeout(() => t.classList.add('out'), 2100);
  setTimeout(() => { t.remove(); nextToast(); }, 2500);
}
