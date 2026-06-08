/* main.js — Battle of the Realm: screen flow & glue */
import {
  byId, el, petImg, SPRITE, KING_GIF, playMusic, sfx, buzz, countdown,
  S, confetti, isMuted, toggleMute
} from './util.js';
import { loadPets, getPet, allPets, flavor, REGIONS, KING_INTRO, KING_DEFEAT } from './data.js';
import {
  state, startAdventure, currentFoe, currentRegion, recordWin, recordLoss,
  hasSave, loadSave, totalFoes, clearedCount, totalStars,
  effDiff, getMode, setMode, livesFor, maxStars, finalScore, getName, setName
} from './state.js';
import { getGame } from './minigames/index.js';
import { submitScore, topScores } from './leaderboard.js';

const APP = byId('app');
const show = html => { APP.innerHTML = html; };

boot();
async function boot() {
  installChrome();
  try {
    await loadPets();
    screenTitle();
  } catch (err) {
    // never leave the player staring at a blank screen
    show(`<div class="screen"><div class="menu-card">
      <h2 class="res-title" style="color:var(--bad)">Couldn't start the game</h2>
      <p class="res-line">${err && err.message ? err.message : err}</p>
      <button class="btn btn-go" onclick="location.reload()">Try again</button>
    </div></div>`);
    console.error('boot failed', err);
  }
}

/* persistent UI: mute toggle + click sounds */
function installChrome() {
  const m = el('button', 'mute-btn', isMuted() ? '🔇' : '🔊');
  m.setAttribute('aria-label', 'Toggle sound');
  m.addEventListener('pointerdown', e => { e.preventDefault(); const muted = toggleMute(); m.textContent = muted ? '🔇' : '🔊'; if (!muted) S.ui(); });
  document.body.appendChild(m);
  // soft click on navigation buttons
  document.addEventListener('pointerdown', e => {
    const b = e.target.closest && e.target.closest('.btn, .btn-link');
    if (b) S.ui();
  });
}

/* ════════ TITLE ════════ */
function screenTitle() {
  playMusic('bgm_intro.mp3');
  const cont = hasSave();
  const mode = getMode();
  show(`
    <div class="screen menu">
      <div class="bg-drift" id="drift"></div>
      <div class="menu-card">
        <h1 class="title">Battle of<br>the Realm</h1>
        <p class="subtitle">A heart-and-courage adventure</p>
        <button class="btn btn-go" id="new">⚔ New Adventure</button>
        ${cont ? '<button class="btn btn-2" id="cont">▸ Continue</button>' : ''}
        <button class="btn btn-2" id="board">🏆 Leaderboard</button>
        <div class="mode-pick">
          <span class="mode-label">Difficulty</span>
          <div class="seg">
            <button class="seg-btn ${mode === 'story' ? 'on' : ''}" data-mode="story">😊 Story</button>
            <button class="seg-btn ${mode === 'normal' ? 'on' : ''}" data-mode="normal">⚔️ Normal</button>
          </div>
          <span class="mode-hint" id="modeHint">${mode === 'story' ? '5 hearts, gentler challenges — great for younger players.' : '3 hearts, the full challenge.'}</span>
        </div>
        <p class="foot">Free the realm from the Tarnished Crown.</p>
      </div>
    </div>`);
  drift(byId('drift'));
  byId('new').onclick = () => screenIntro();
  if (cont) byId('cont').onclick = () => { if (loadSave()) routeFromSave(); };
  byId('board').onclick = () => screenLeaderboard();
  APP.querySelectorAll('.seg-btn').forEach(b => b.onclick = () => {
    const m = b.dataset.mode; setMode(m); S.ui();
    APP.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('on', x === b));
    byId('modeHint').textContent = m === 'story'
      ? '5 hearts, gentler challenges — great for younger players.'
      : '3 hearts, the full challenge.';
  });
}
function routeFromSave() {
  if (state.done) return screenEnding();
  if (state.region >= 3) return screenMap();
  screenMap();
}
function drift(box) {
  if (!box) return;
  const ps = allPets().sort(() => Math.random() - 0.5).slice(0, 6);
  box.innerHTML = ps.map(p => {
    const left = 5 + Math.random() * 85, dur = 7 + Math.random() * 5, del = -Math.random() * 7, size = 52 + Math.random() * 40;
    return `<img src="${SPRITE(p.sprite)}" class="drifter" style="left:${left}%;width:${size}px;animation-duration:${dur}s;animation-delay:${del}s">`;
  }).join('');
}

/* ════════ INTRO STORY ════════ */
const INTRO = [
  'Long ago, the realm of Liitokala was a place of song — creatures of Land, Sea and Sky, living free.',
  'Its guardian was the Gilded King: wise, and kind… until a slow Tarnish crept into his golden crown.',
  'The Tarnish whispered fear. “Only strength can keep them safe,” it said. So the King bound every champion to endless Trials.',
  'Yet one old law still stands: a creature who bests every champion of Land, Sea and Sky may challenge the King — and free the realm.',
  'Today, that brave creature is you. Choose your hero…'
];
function screenIntro() {
  dialogue({ portrait: KING_GIF, name: 'The Tale of the Realm', lines: INTRO, cls: 'intro', onDone: screenSelect });
}

/* ════════ HERO SELECT ════════ */
let chosen = null;
function screenSelect() {
  chosen = null;
  show(`
    <div class="screen select">
      <h2 class="screen-title">Choose your Hero</h2>
      <div class="sel-grid" id="grid">
        ${allPets().map(p => `
          <button class="sel-cell" data-id="${p.id}">
            <img src="${SPRITE(p.sprite)}" alt="${p.name}">
            <span class="sel-name">${p.name}</span>
          </button>`).join('')}
      </div>
      <div class="sel-bar" id="bar">
        <div class="sel-info" id="info">Tap a creature to meet them.</div>
        <button class="btn btn-go" id="begin" disabled>Begin Adventure ⚔</button>
      </div>
    </div>`);
  const grid = byId('grid'), info = byId('info'), begin = byId('begin');
  grid.querySelectorAll('.sel-cell').forEach(c => {
    c.onclick = () => {
      grid.querySelectorAll('.sel-cell').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      chosen = c.dataset.id;
      const p = getPet(chosen);
      info.innerHTML = `<b>${p.name}</b> <i>${flavor(p.id).epithet}</i><br><small>${p.power}</small>`;
      begin.disabled = false;
      sfx(p.sfx, 0.6);
    };
  });
  begin.onclick = () => {
    if (!chosen) return;
    startAdventure(chosen);
    screenRegionIntro(0);
  };
}

/* ════════ REGION INTRO ════════ */
function screenRegionIntro(ri) {
  const r = REGIONS[ri];
  show(`
    <div class="screen region-intro theme-${r.theme}">
      <div class="ri-card">
        <div class="ri-num">Region ${ri + 1} / 3</div>
        <h1 class="ri-name">${r.name}</h1>
        <p class="ri-blurb">${r.blurb}</p>
        <button class="btn btn-go" id="go">Enter ▸</button>
      </div>
    </div>`);
  byId('go').onclick = () => screenMap();
}

/* ════════ MAP ════════ */
function screenMap() {
  playMusic('bgm_intro.mp3');
  const hero = getPet(state.heroId);
  const king = state.region >= 3;
  const r = king ? null : currentRegion();
  const foe = currentFoe();

  const lives = '❤'.repeat(state.lives) + '🖤'.repeat(Math.max(0, state.maxLives - state.lives));
  const J = [['🌳', 'Land'], ['🌊', 'Sea'], ['⛰️', 'Sky'], ['👑', 'King']];
  const journey = J.map((j, i) => {
    const st = i < state.region ? 'done' : i === state.region ? 'cur' : 'todo';
    return `<div class="jstep ${st}"><span class="jicon">${st === 'done' ? '✓' : j[0]}</span><span class="jlbl">${j[1]}</span></div>`;
  }).join('<span class="jline"></span>');
  const nodes = king ? '' : r.foes.map((f, i) => {
    const done = i < state.idx, cur = i === state.idx;
    const st = state.stars[f.id] || 0;
    return `<div class="node ${done ? 'done' : cur ? 'cur' : 'todo'}">
      <img src="${SPRITE(getPet(f.id).sprite)}" alt="">
      <span class="node-stars">${done ? '★'.repeat(st) + '☆'.repeat(3 - st) : cur ? 'NEXT' : ''}</span>
    </div>`;
  }).join('');

  show(`
    <div class="screen map theme-${king ? 'king' : r.theme}">
      <div class="map-top">
        <div class="hero-chip"><img src="${SPRITE(hero.sprite)}"><span>${hero.name}</span></div>
        <div class="lives">${lives}</div>
      </div>
      <div class="journey">${journey}</div>
      <div class="map-body">
        <h2 class="region-name">${king ? '👑 The King’s Throne' : r.name}</h2>
        ${king
          ? `<p class="map-blurb">All champions are free. Only the Gilded King remains. This is the final battle.</p>
             <img class="king-throne" src="${KING_GIF}">`
          : `<div class="path">${nodes}</div>
             <p class="map-blurb">${clearedCount()} / ${totalFoes()} freed · ★ ${totalStars()} / ${maxStars()}</p>`}
      </div>
      <div class="map-foot">
        ${king
          ? `<button class="btn btn-king" id="fight">⚔ Challenge the King</button>`
          : `<button class="btn btn-go" id="fight">⚔ Battle ${getPet(foe.id).name}</button>`}
        <button class="btn-link" id="quit">Quit to title</button>
      </div>
    </div>`);
  byId('fight').onclick = () => king ? screenKingIntro() : screenBattleIntro();
  byId('quit').onclick = () => screenTitle();
}

/* ════════ BATTLE INTRO ════════ */
function screenBattleIntro() {
  const entry = currentFoe();
  const foe = getPet(entry.id);
  const fl = flavor(foe.id);
  const game = getGame(entry.game);
  show(`
    <div class="screen battle-intro">
      <div class="bi-card">
        <div class="bi-vs">Champion of ${currentRegion().name}</div>
        <img class="bi-foe" src="${SPRITE(foe.sprite)}" alt="${foe.name}">
        <h2 class="bi-name">${foe.name}</h2>
        <div class="bi-epithet">${fl.epithet}</div>
        <p class="bi-taunt">“${fl.taunt}”</p>
        <div class="bi-attack">${entry.theme ? entry.theme.proj : ''} Attack: <b>${entry.theme ? entry.theme.act : game.name}</b></div>
        <div class="bi-game"><span class="bi-icon">${game.icon}</span>
          <div><b>${game.name}</b><br><small>${game.howto}</small></div></div>
        <div class="bi-diff">Difficulty ${'🔥'.repeat(Math.min(5, Math.ceil(entry.difficulty / 2)))}</div>
        <button class="btn btn-go" id="begin">Begin Battle ▸</button>
      </div>
    </div>`);
  byId('begin').onclick = () => runBattle(entry, foe);
}

/* ════════ RUN A BATTLE (minigame) ════════ */
async function runBattle(entry, foeDisp) {
  const hero = getPet(state.heroId);
  show(`<div class="screen battle"><div class="arena" id="arena"></div></div>`);
  const arena = byId('arena');
  sfx(foeDisp.sfx, 0.7);
  await countdown(arena, 'FIGHT!');
  const game = getGame(entry.game);
  let res;
  try {
    res = await game.play(arena, { difficulty: effDiff(entry.difficulty), hero, foe: foeDisp, theme: entry.theme || {} });
  } catch (e) {
    console.error('minigame error', e);
    res = { win: false, stars: 1 };
  }
  if (res.win) onBattleWon(entry, res, foeDisp);
  else onBattleLost(entry, foeDisp);
}

/* ════════ WIN / LOSE ════════ */
function onBattleWon(entry, res, foeDisp) {
  buzz(40);
  if (entry.id === 'king') { recordWin('king', 3); return screenKingDefeat(); }

  const fl = flavor(entry.id);
  const stars = res.stars || 1;
  show(`
    <div class="screen result win">
      <div class="result-card">
        <div class="res-burst">🎉</div>
        <h2 class="res-title">Champion Freed!</h2>
        <img class="res-foe" src="${SPRITE(foeDisp.sprite)}">
        <div class="res-stars" id="stars">${'<span class="star-slot">☆</span>'.repeat(3)}</div>
        <p class="res-line">“${fl.freed}”</p>
        <button class="btn btn-go" id="next">Continue ▸</button>
      </div>
    </div>`);
  setTimeout(() => sfx(foeDisp.sfx, 0.6), 50);
  S.win();
  confetti(document.querySelector('.screen'), 36);
  // reveal earned stars one at a time, each with a little ding
  const slots = [...document.querySelectorAll('.star-slot')];
  slots.forEach((s, i) => {
    if (i < stars) setTimeout(() => { s.textContent = '★'; s.classList.add('lit'); S.star(); buzz(15); }, 350 + i * 320);
  });
  byId('next').onclick = () => {
    const route = recordWin(entry.id, stars);
    if (route === 'region-clear') screenRegionClear();
    else if (route === 'king') screenRegionClear(true);
    else screenMap();
  };
}

function onBattleLost(entry, foeDisp) {
  buzz(70); S.lose();
  const route = recordLoss();
  const lives = '❤'.repeat(state.lives) + '🖤'.repeat(Math.max(0, state.maxLives - state.lives));
  if (route === 'gameover') return screenGameOver();
  show(`
    <div class="screen result lose">
      <div class="result-card">
        <div class="res-burst">💫</div>
        <h2 class="res-title">Defeated…</h2>
        <img class="res-foe dim" src="${petImg(foeDisp)}">
        <p class="res-line">You lost a heart. Lives left: <b>${lives}</b></p>
        <button class="btn btn-go" id="retry">Try Again ▸</button>
        <button class="btn-link" id="map">Back to map</button>
      </div>
    </div>`);
  byId('retry').onclick = () => entry.id === 'king' ? runBattle(entry, foeDisp) : screenBattleIntro();
  byId('map').onclick = () => screenMap();
}

/* ════════ REGION CLEAR ════════ */
function screenRegionClear(toKing = false) {
  const ri = state.region - 1;
  const cleared = REGIONS[ri] || REGIONS[REGIONS.length - 1];
  const nextTxt = toKing ? 'The path to the King’s Throne lies open.' : `Next: <b>${REGIONS[state.region].name}</b>`;
  const foes = (state.adventure.regions[ri] || { foes: [] }).foes;
  const roster = foes.map(f => `<img src="${SPRITE(getPet(f.id).sprite)}" title="${getPet(f.id).name}">`).join('');
  const cheerer = foes.length ? getPet(foes[foes.length - 1].id) : null;
  const cheer = cheerer ? `“We stand with you, friend.” — <b>${cheerer.name}</b>` : '';
  show(`
    <div class="screen region-clear theme-${cleared.theme}">
      <div class="ri-card">
        <div class="rc-shine">✨</div>
        <h1 class="ri-name">${cleared.name} is Free!</h1>
        <div class="rc-roster">${roster}</div>
        <p class="rc-cheer">${cheer}</p>
        <p class="ri-blurb">Every champion here stands with you now. ${nextTxt}</p>
        <button class="btn btn-go" id="go">${toKing ? 'To the Throne ▸' : 'Onward ▸'}</button>
      </div>
    </div>`);
  S.win();
  confetti(document.querySelector('.screen'), 50);
  byId('go').onclick = () => toKing ? screenMap() : screenRegionIntro(state.region);
}

/* ════════ KING ════════ */
function screenKingIntro() {
  playMusic('bgm_gameover.mp3', 0.3);
  dialogue({
    portrait: KING_GIF, name: 'The Gilded King', lines: KING_INTRO, cls: 'king-dlg',
    onDone: () => {
      const entry = currentFoe();    // king entry
      runBattle(entry, { id: 'king', name: 'The Gilded King', king: true });   // no entrance voice for the King yet
    }
  });
}
function screenKingDefeat() {
  dialogue({
    portrait: KING_GIF, name: 'The Gilded King', lines: KING_DEFEAT, cls: 'king-dlg',
    onDone: screenEnding
  });
}

/* ════════ ENDING ════════ */
function screenEnding() {
  playMusic('bgm_intro.mp3');
  const hero = getPet(state.heroId);
  const score = finalScore(), max = maxStars();
  const clean = state.continues === 0;
  show(`
    <div class="screen ending">
      <div class="end-card">
        <div class="end-fire">🎆</div>
        <h1 class="title small">The Realm is Free!</h1>
        <img class="end-hero" src="${SPRITE(hero.sprite)}">
        <p class="end-text">
          The Tarnish lifts from the crown, and color floods back into Liitokala.
          The freed champions raise <b>${hero.name}</b> high — the realm’s new guardian.
        </p>
        <div class="end-stars">Final Score: ★ ${score} / ${max}</div>
        <div class="end-sub">${state.mode === 'story' ? '😊 Story' : '⚔️ Normal'} mode${clean ? ' · clean run bonus +6 ✨' : ` · ${state.continues} continue${state.continues > 1 ? 's' : ''}`}</div>
        <input class="name-input" id="name" maxlength="14" placeholder="Your name" value="${escapeHtml(getName())}">
        <button class="btn btn-go" id="submit">Submit to Leaderboard 🏆</button>
        <button class="btn-link" id="again">Play Again</button>
      </div>
    </div>`);
  S.win();
  const scr = document.querySelector('.screen');
  confetti(scr, 70);
  setTimeout(() => confetti(scr, 50), 900);
  setTimeout(() => { S.win(); confetti(scr, 50); }, 1800);
  byId('submit').onclick = async () => {
    const name = (byId('name').value || 'Hero').trim() || 'Hero';
    setName(name);
    const btn = byId('submit'); btn.disabled = true; btn.textContent = 'Submitting…';
    const entry = { name, score, mode: state.mode, ms: Date.now() };
    await submitScore(entry);
    screenLeaderboard(entry);
  };
  byId('again').onclick = () => screenTitle();
}

/* ════════ LEADERBOARD ════════ */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function renderBoard(listEl, highlight) {
  listEl.innerHTML = '<div class="lb-empty">Loading…</div>';
  let res; try { res = await topScores(12); } catch { res = { rows: [], source: 'local' }; }
  const rows = res.rows || [];
  if (!rows.length) { listEl.innerHTML = '<div class="lb-empty">No scores yet — be the first to free the realm!</div>'; return; }
  listEl.innerHTML = rows.map((r, i) => {
    const hot = highlight && r.name === highlight.name && r.score === highlight.score && Math.abs((r.ms || 0) - (highlight.ms || 0)) < 8000;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
    return `<div class="lb-row ${hot ? 'me' : ''}">
      <span class="lb-rank">${medal}</span>
      <span class="lb-name">${escapeHtml(r.name)}</span>
      <span class="lb-mode">${r.mode === 'story' ? '😊' : '⚔️'}</span>
      <span class="lb-score">★ ${r.score}</span></div>`;
  }).join('') + (res.source === 'local' ? '<div class="lb-note">Offline — showing scores saved on this device.</div>' : '');
}

function screenLeaderboard(highlight) {
  show(`
    <div class="screen leaderboard">
      <div class="lb-card">
        <h1 class="title small">🏆 Leaderboard</h1>
        <p class="subtitle">Most stars wins! (max ${maxStars()})</p>
        <div class="lb-list" id="list"></div>
        <button class="btn btn-go" id="back">◂ Back to Title</button>
      </div>
    </div>`);
  renderBoard(byId('list'), highlight);
  byId('back').onclick = () => screenTitle();
}

/* ════════ GAME OVER ════════ */
function screenGameOver() {
  playMusic('bgm_gameover.mp3');
  const r = currentRegion() || REGIONS[REGIONS.length - 1];
  show(`
    <div class="screen gameover">
      <div class="result-card">
        <div class="res-burst">😔</div>
        <h2 class="res-title">Your Journey Falters…</h2>
        <p class="res-line">The Tarnish drives you back from <b>${r ? r.name : 'the Throne'}</b>.
          But the champions you freed still believe in you.</p>
        <p class="res-line"><b>${r ? r.name : 'The region'}</b> resets — your hearts are restored.</p>
        <button class="btn btn-go" id="go">Rise Again ▸</button>
        <button class="btn-link" id="quit">Quit to title</button>
      </div>
    </div>`);
  byId('go').onclick = () => screenMap();
  byId('quit').onclick = () => screenTitle();
}

/* ════════ shared dialogue ════════ */
function dialogue({ portrait, name, lines, cls = '', onDone }) {
  let i = 0;
  const render = () => {
    show(`
      <div class="screen story ${cls}">
        <div class="story-card">
          ${portrait ? `<img class="story-portrait" src="${portrait}">` : ''}
          ${name ? `<div class="story-name">${name}</div>` : ''}
          <p class="story-text" id="stext">${lines[i]}</p>
          <button class="btn btn-go" id="next">${i < lines.length - 1 ? 'Next ▸' : 'Continue ▸'}</button>
        </div>
      </div>`);
    byId('next').onclick = () => {
      i++;
      if (i < lines.length) {
        byId('stext').textContent = lines[i];
        byId('next').textContent = i < lines.length - 1 ? 'Next ▸' : 'Continue ▸';
      } else onDone();
    };
  };
  render();
}
