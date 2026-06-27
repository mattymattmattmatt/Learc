/* main.js — Battle of the Realm: screen flow & glue */
import {
  byId, el, petImg, SPRITE, KING_GIF, playMusic, stopMusic, sfx, buzz, countdown,
  S, confetti, isMuted, toggleMute, shuffle, sparkle, petAnim, animTag
} from './util.js';
import {
  loadPets, getPet, allPets, flavor, REGIONS, BATTLES,
  BOSSES, GLOB, getBoss, isVillain, bossIntroLines, bossDefeatLines,
  INTRO, GLOB_INTRO, GLOB_DEFEAT, STORY_CAPTURED, STORY_WIN
} from './data.js';
import {
  state, startAdventure, currentFoe, currentRegion, recordWin, recordLoss, recordRematch,
  hasSave, loadSave, savedHeroId, totalFoes, clearedCount, totalStars,
  isBossNext, isGlobNext, championCount,
  effDiff, getMode, setMode, livesFor, maxStars, finalScore, getName, setName
} from './state.js';
import { getGame } from './minigames/index.js';
import { submitScore, topScores } from './leaderboard.js';
import { BADGES, award, hasBadge, badgeCount, recordBestStars, bestStarsFor, recordGauntlet, gauntletBest } from './meta.js';

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
  stopMusic();   // the realm stays hushed — music begins with the adventure
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
        <button class="btn btn-2" id="gauntlet">🔥 Endless Gauntlet</button>
        <div class="btn-row">
          <button class="btn btn-2" id="board">🏆 Scores</button>
          <button class="btn btn-2" id="dex">📖 Critterdex</button>
        </div>
        <div class="mode-pick">
          <span class="mode-label">Difficulty</span>
          <div class="seg">
            <button class="seg-btn ${mode === 'story' ? 'on' : ''}" data-mode="story">😊 Story</button>
            <button class="seg-btn ${mode === 'normal' ? 'on' : ''}" data-mode="normal">⚔️ Normal</button>
            <button class="seg-btn ${mode === 'hard' ? 'on' : ''}" data-mode="hard">🔥 Hard</button>
          </div>
          <span class="mode-hint" id="modeHint">${MODE_HINTS[mode]}</span>
        </div>
        <p class="foot">Break Evil King Glob's spell and free the realm.</p>
        <button class="btn-link foot-credits" id="credits">✨ made with love — credits</button>
      </div>
    </div>`);
  drift(byId('drift'));
  byId('new').onclick = () => screenIntro();
  if (cont) byId('cont').onclick = () => { if (loadSave()) routeFromSave(); };
  byId('gauntlet').onclick = () => screenGauntletSelect();
  byId('board').onclick = () => screenLeaderboard();
  byId('dex').onclick = () => screenDex();
  byId('credits').onclick = () => screenCredits();
  APP.querySelectorAll('.seg-btn').forEach(b => b.onclick = () => {
    const m = b.dataset.mode; setMode(m); S.ui();
    APP.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('on', x === b));
    byId('modeHint').textContent = MODE_HINTS[m];
  });
}
const MODE_HINTS = {
  story: 'Gentler challenges — great for younger players. No lives: keep trying until you win.',
  normal: 'The full challenge. No lives: lose a duel and just try it again.',
  hard: 'Brutal minigames for experts. No lives — but no mercy either!'
};
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
    return `<img src="${SPRITE(p.sprite)}" data-id="${p.id}" class="drifter" style="left:${left}%;width:${size}px;animation-duration:${dur}s;animation-delay:${del}s">`;
  }).join('');
  // tap a passing creature to hear its roar (a little secret for the designer)
  box.querySelectorAll('.drifter').forEach(img => img.addEventListener('pointerdown', e => {
    const p = getPet(img.dataset.id); if (!p) return;
    sfx(p.sfx, 0.7); buzz(12);
    img.classList.add('boing'); setTimeout(() => img.classList.remove('boing'), 420);
    const rect = box.getBoundingClientRect();
    sparkle(box, e.clientX - rect.left, e.clientY - rect.top, 6);
  }));
}

/* ════════ INTRO STORY ════════ */
function screenIntro() {
  playMusic('bgm_intro.mp3');   // the adventure — and its music — begin here
  // the captured-realm splash appears once Glob throws his net (beats 3+)
  dialogue({ image: STORY_CAPTURED, imageFrom: 2, name: 'The Tale of Liitokala', lines: INTRO, cls: 'intro', onDone: screenSelect });
}

/* ════════ CREDITS ════════ */
function screenCredits() {
  show(`
    <div class="screen menu credits">
      <div class="bg-drift" id="cdrift"></div>
      <div class="menu-card credits-card">
        <div class="cr-spark">✨</div>
        <h1 class="title small">The Makers<br>of the Realm</h1>
        <p class="cr-role">creature designers</p>
        <h2 class="cr-names"><span class="cr-name">Leila</span> &amp; <span class="cr-name">Archie</span></h2>
        <p class="cr-role">with trusty sidekick</p>
        <h3 class="cr-uncle">Uncle Matty</h3>
        <p class="cr-story">All 24 champions of Liitokala were dreamed up together on a
          family adventure in <b>Bali</b> 🌴<br><span class="cr-when">mid 2025</span></p>
        <p class="cr-hint">psst — tap the creatures floating by 👀</p>
        <button class="btn btn-go" id="back">◂ Back</button>
      </div>
    </div>`);
  drift(byId('cdrift'));
  confetti(document.querySelector('.screen'), 24);
  byId('back').onclick = () => screenTitle();
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
        <div class="sel-preview">
          <div class="sel-anim" id="selanim"></div>
          <div class="sel-info" id="info">Tap a creature to meet them — watch them move!</div>
        </div>
        <button class="btn btn-go" id="begin" disabled>Begin Adventure ⚔</button>
        <button class="btn-link" id="selback">◂ Title</button>
      </div>
    </div>`);
  byId('selback').onclick = () => screenTitle();
  const grid = byId('grid'), info = byId('info'), begin = byId('begin'), selanim = byId('selanim');
  grid.querySelectorAll('.sel-cell').forEach(c => {
    c.onclick = () => {
      grid.querySelectorAll('.sel-cell').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      chosen = c.dataset.id;
      const p = getPet(chosen);
      selanim.innerHTML = animTag('sel-anim-vid', petAnim(p), SPRITE(p.sprite), p.name);
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

/* ── display helpers for any foe entry (champion / henchman / Glob) ── */
function entryName(e) {
  if (!e) return '';
  if (e.kind === 'glob') return GLOB.name;
  if (e.kind === 'boss') return getBoss(e.id).name;
  return getPet(e.id).name;
}
function entryImg(e) {
  if (!e) return '';
  if (e.kind === 'glob') return SPRITE(GLOB.img);
  if (e.kind === 'boss') return SPRITE(getBoss(e.id).img);
  return SPRITE(getPet(e.id).sprite);
}

/* ════════ MAP ════════ */
/* viewRi: pass a CLEARED region index to revisit it for friendly rematches;
   the journey strip is the navigation. Default = the live quest. */
function screenMap(viewRi = null) {
  playMusic('bgm_intro.mp3');
  const hero = getPet(state.heroId);
  const glob = isGlobNext();
  const canView = i => i < Math.min(state.region, 3);
  const viewing = viewRi != null && canView(viewRi);
  const r = viewing ? state.adventure.regions[viewRi] : (glob ? null : currentRegion());
  const bossNext = !viewing && !glob && isBossNext();

  const modeBadge = { story: '😊 Story', normal: '⚔️ Normal', hard: '🔥 Hard' }[state.mode] || '⚔️ Normal';
  const J = [['🌳', 'Land'], ['🌊', 'Sea'], ['⛰️', 'Sky'], ['👑', 'Glob']];
  const journey = J.map((j, i) => {
    const st = i < state.region ? 'done' : i === state.region ? 'cur' : 'todo';
    const link = canView(i) || i === state.region;
    const here = viewing ? viewRi === i : i === state.region;
    return `<div class="jstep ${st} ${link ? 'link' : ''} ${here ? 'view' : ''}" data-ri="${i}">
      <span class="jicon">${st === 'done' ? '✓' : j[0]}</span><span class="jlbl">${j[1]}</span></div>`;
  }).join('<span class="jline"></span>');

  let nodes = '';
  if (r) {
    nodes = r.foes.map((f, i) => {
      const done = viewing || i < state.idx, cur = !viewing && i === state.idx;
      const st = state.stars[f.id] || 0;
      return `<div class="node ${done ? 'done link' : cur ? 'cur link' : 'todo'}" data-i="${i}">
        <img src="${SPRITE(getPet(f.id).sprite)}" alt="">
        ${done ? '<span class="node-redo">🤝</span>' : ''}
        <span class="node-stars">${done ? '★'.repeat(st) + '☆'.repeat(3 - st) : cur ? 'NEXT' : ''}</span>
      </div>`;
    }).join('');
    // the henchman who guards this region (a boss gate at the end of the path)
    const bm = getBoss(r.boss.id);
    const bdone = viewing;               // once cleared you've beaten the henchman
    const bcur = bossNext;
    nodes += `<div class="node node-boss ${bdone ? 'done' : bcur ? 'cur boss-cur' : 'todo'}" data-boss="1">
      <img src="${SPRITE(bm.img)}" alt="${bm.name}">
      <span class="node-stars">${bdone ? '✓' : bcur ? 'BOSS' : '🔒'}</span></div>`;
  }

  const blurb = viewing
    ? '🤝 Friendly rematches — tap a freed champion to duel again and improve your ★. No risk!'
    : glob
      ? 'Every champion is awake and Glob\'s henchmen are beaten. Only the King remains.'
      : bossNext
        ? `All ${r.name} champions are free! ${getBoss(r.boss.id).name} the ${getBoss(r.boss.id).epithet} blocks the way.`
        : `${clearedCount()} / ${championCount()} freed · ★ ${totalStars()} / ${maxStars()}${state.idx > 0 || state.region > 0 ? ' · 🤝 tap freed champions to rematch' : ''}`;

  show(`
    <div class="screen map theme-${glob && !viewing ? 'king' : r.theme}">
      <div class="map-top">
        <div class="hero-chip"><img src="${SPRITE(hero.sprite)}"><span>${hero.name}</span></div>
        <div class="lives"><span class="mode-badge">${modeBadge}</span></div>
      </div>
      <div class="journey">${journey}</div>
      <div class="map-body">
        <h2 class="region-name">${glob && !viewing ? '👑 Glob’s Throne' : r.name}</h2>
        ${glob && !viewing
          ? `<p class="map-blurb">All champions are awake. Only Evil King Glob remains. This is the final battle!</p>
             ${animTag('king-throne', petAnim(GLOB), SPRITE(GLOB.img), GLOB.name)}`
          : `<div class="path">${nodes}</div>
             <p class="map-blurb">${blurb}</p>`}
      </div>
      <div class="map-foot">
        ${viewing
          ? `<button class="btn btn-2" id="ret">◂ Back to the quest</button>`
          : glob
            ? `<button class="btn btn-king" id="fight">⚔ Challenge Glob</button>`
            : bossNext
              ? `<button class="btn btn-king" id="fight">💥 Face ${getBoss(r.boss.id).name}</button>`
              : `<button class="btn btn-go" id="fight">⚔ Battle ${entryName(currentFoe())}</button>`}
        <button class="btn-link" id="quit">Quit to title</button>
      </div>
    </div>`);
  if (viewing) byId('ret').onclick = () => screenMap();
  else byId('fight').onclick = () => glob ? screenGlobIntro() : bossNext ? screenBossIntro() : screenBattleIntro();
  byId('quit').onclick = () => screenTitle();
  // journey strip = region navigation (revisit cleared regions to rematch)
  APP.querySelectorAll('.jstep.link').forEach(s => s.onclick = () => {
    const i = +s.dataset.ri; S.ui();
    canView(i) ? screenMap(i) : screenMap();
  });
  // boss gate node → start the henchman fight when it's current
  const bnode = APP.querySelector('.node-boss.cur');
  if (bnode) bnode.onclick = () => screenBossIntro();
  // champion nodes: NEXT starts the battle; freed champions offer a friendly rematch
  APP.querySelectorAll('.node.link').forEach(n => n.onclick = () => {
    const i = +n.dataset.i;
    if (!viewing && i === state.idx) return screenBattleIntro();
    screenRematchIntro(r.foes[i], viewing ? viewRi : state.region);
  });
}

/* the function that restarts the current live battle after a loss (no lives) */
let replay = null;

/* ════════ BATTLE INTRO ════════ */
function screenBattleIntro() {
  replay = screenBattleIntro;
  const entry = currentFoe();
  const foe = getPet(entry.id);
  const fl = flavor(foe.id);
  const game = getGame(entry.game);
  show(`
    <div class="screen battle-intro">
      <div class="bi-card">
        <div class="bi-vs">Spellbound champion of ${currentRegion().name}</div>
        ${animTag('bi-foe', petAnim(foe), SPRITE(foe.sprite), foe.name)}
        <h2 class="bi-name">${foe.name}</h2>
        <div class="bi-epithet">${fl.epithet}</div>
        <p class="bi-taunt">“${fl.taunt}”</p>
        <div class="bi-attack">${entry.theme ? entry.theme.proj : ''} Attack: <b>${entry.theme ? entry.theme.act : game.name}</b></div>
        <div class="bi-game"><span class="bi-icon">${game.icon}</span>
          <div><b>${game.name}</b><br><small>${(entry.theme && entry.theme.howto) || game.howto}</small></div></div>
        <div class="bi-diff">Difficulty ${'🔥'.repeat(Math.min(5, Math.ceil(entry.difficulty / 2)))}</div>
        <button class="btn btn-go" id="begin">Begin Battle ▸</button>
        <button class="btn-link" id="back">◂ Back to map</button>
      </div>
    </div>`);
  byId('begin').onclick = () => runBattle(entry, foe);
  byId('back').onclick = () => screenMap();
}

/* ════════ FRIENDLY REMATCH (improve your stars, zero risk) ════════ */
function screenRematchIntro(entry, ri) {
  const foe = getPet(entry.id);
  const fl = flavor(foe.id);
  const game = getGame(entry.game);
  const backRi = ri < Math.min(state.region, 3) ? ri : null;
  const best = state.stars[entry.id] | 0;
  show(`
    <div class="screen battle-intro">
      <div class="bi-card">
        <div class="bi-rematch">🤝 Friendly Rematch — no hearts at risk</div>
        <img class="bi-foe" src="${SPRITE(foe.sprite)}" alt="${foe.name}">
        <h2 class="bi-name">${foe.name}</h2>
        <div class="bi-epithet">${fl.epithet}</div>
        <p class="bi-taunt">“Again, friend? With joy — show me what you’ve learned!”</p>
        <div class="bi-attack">${entry.theme ? entry.theme.proj : '⭐'} Attack: <b>${entry.theme ? entry.theme.act : game.name}</b></div>
        <div class="bi-game"><span class="bi-icon">${game.icon}</span>
          <div><b>${game.name}</b><br><small>${(entry.theme && entry.theme.howto) || game.howto}</small></div></div>
        <div class="bi-best">Your best: ${best ? '★'.repeat(best) + '☆'.repeat(3 - best) : '—'}</div>
        <button class="btn btn-go" id="begin">Rematch ▸</button>
        <button class="btn-link" id="back">◂ Back to map</button>
      </div>
    </div>`);
  byId('begin').onclick = () => runRematch(entry, backRi);
  byId('back').onclick = () => screenMap(backRi);
}

function runRematch(entry, backRi) {
  const foe = getPet(entry.id);
  const prev = state.stars[entry.id] | 0;
  runBattle(entry, foe, { onResult: res => {
    if (res.win) {
      const stars = res.stars || 1;
      recordRematch(entry.id, stars);
      recordBestStars(entry.id, stars);
      if (stars >= 3) award('flawless');
      buzz(40);
      show(`
        <div class="screen result win">
          <div class="result-card">
            <div class="res-burst">🤝</div>
            <h2 class="res-title">Rematch Won!</h2>
            <img class="res-foe" src="${SPRITE(foe.sprite)}">
            <div class="res-stars" id="stars">${'<span class="star-slot">☆</span>'.repeat(3)}</div>
            <p class="res-line">${stars > prev
              ? `New best — <b>${foe.name}</b>’s stars upgraded! ✨`
              : 'A glorious duel! Your best record still stands.'}</p>
            <button class="btn btn-go" id="next">Back to Map ▸</button>
          </div>
        </div>`);
      setTimeout(() => sfx(foe.sfx, 0.6), 50);
      S.win();
      confetti(document.querySelector('.screen'), 26);
      revealStars(stars);
    } else {
      buzz(30); S.bad();
      show(`
        <div class="screen result win">
          <div class="result-card">
            <div class="res-burst">💫</div>
            <h2 class="res-title">Good Duel!</h2>
            <img class="res-foe" src="${SPRITE(foe.sprite)}">
            <p class="res-line"><b>${foe.name}</b> takes this one — but friendly duels never cost hearts.
              Come back any time!</p>
            <button class="btn btn-go" id="next">Back to Map ▸</button>
          </div>
        </div>`);
    }
    byId('next').onclick = () => screenMap(backRi);
  }});
}

/* ════════ RUN A BATTLE (minigame) ════════ */
async function runBattle(entry, foeDisp, opts = {}) {
  const hero = getPet(opts.heroId || state.heroId);
  show(`<div class="screen battle"><div class="arena" id="arena"></div></div>`);
  const arena = byId('arena');
  sfx(foeDisp.sfx, 0.7);
  await countdown(arena, opts.goWord || 'FIGHT!');
  const game = getGame(entry.game);
  let res;
  try {
    // practice picks an exact level, so it skips the story-mode scaling
    const difficulty = opts.rawDiff ? entry.difficulty : effDiff(entry.difficulty);
    res = await game.play(arena, { difficulty, hero, foe: foeDisp, theme: entry.theme || {}, aspect: opts.aspect });
  } catch (e) {
    console.error('minigame error', e);
    res = { win: false, stars: 1 };
  }
  if (opts.onResult) return opts.onResult(res);   // rematch & gauntlet route themselves
  if (res.win) onBattleWon(entry, res, foeDisp, opts);
  else onBattleLost(entry, foeDisp, opts);
}

/* reveal earned stars one at a time, each with a little ding */
function revealStars(stars) {
  const slots = [...document.querySelectorAll('.star-slot')];
  slots.forEach((s, i) => {
    if (i < stars) setTimeout(() => { s.textContent = '★'; s.classList.add('lit'); S.star(); buzz(15); }, 350 + i * 320);
  });
}

/* ════════ WIN / LOSE ════════ */
function onBattleWon(entry, res, foeDisp, opts = {}) {
  buzz(40);
  if (entry.kind === 'glob') {       // the final victory
    S.win();
    recordWin('glob', res.stars || 3);
    award('crown');
    if (totalStars() >= maxStars()) award('star-master');
    if (state.continues === 0) award('unbroken');
    return screenGlobDefeat();
  }
  if (entry.kind === 'boss') return onBossWon(entry, res);   // a henchman falls

  // a captured champion snaps awake
  const fl = flavor(entry.id);
  const stars = res.stars || 1;
  recordBestStars(entry.id, stars);
  award('first-win');
  if (stars >= 3) award('flawless');
  show(`
    <div class="screen result win">
      <div class="result-card">
        <div class="res-burst">✨</div>
        <h2 class="res-title">Spell Broken!</h2>
        <img class="res-foe" src="${SPRITE(foeDisp.sprite)}">
        <div class="res-stars" id="stars">${'<span class="star-slot">☆</span>'.repeat(3)}</div>
        <p class="res-line">“${fl.freed}”</p>
        <button class="btn btn-go" id="next">Continue ▸</button>
      </div>
    </div>`);
  setTimeout(() => sfx(foeDisp.sfx, 0.6), 50);
  S.win();
  confetti(document.querySelector('.screen'), 36);
  revealStars(stars);
  byId('next').onclick = () => {
    const route = recordWin(entry.id, stars);
    if (route === 'region-boss') award(currentRegion().key + '-free');  // all champions freed
    screenMap();
  };
}

/* a henchman is defeated → they grumble off, then the region is liberated */
function onBossWon(entry, res) {
  const bm = getBoss(entry.id);
  const stars = res.stars || 2;
  recordBestStars(entry.id, stars);
  if (stars >= 3) award('flawless');
  S.win(); buzz(50);
  dialogue({
    video: petAnim(bm), poster: SPRITE(bm.img), name: bm.name,
    lines: bossDefeatLines(entry.id), cls: 'king-dlg boss-dlg',
    onDone: () => {
      const route = recordWin(entry.id, stars);
      screenRegionClear(route === 'glob');
    }
  });
}

/* no lives any more: a loss just lets you try the very same battle again */
function onBattleLost(entry, foeDisp, opts = {}) {
  buzz(70); S.lose();
  recordLoss();
  const boss = entry.kind === 'boss' || entry.kind === 'glob';
  show(`
    <div class="screen result lose">
      <div class="result-card">
        <div class="res-burst">💢</div>
        <h2 class="res-title">${boss ? 'Knocked Down!' : 'So close!'}</h2>
        <img class="res-foe dim" src="${petImg(foeDisp)}">
        <p class="res-line">No lives to lose — dust yourself off and try ${entryName(entry)} again. You stay right here.</p>
        <button class="btn btn-go" id="retry">Try Again ▸</button>
        <button class="btn-link" id="map">Back to map</button>
      </div>
    </div>`);
  byId('retry').onclick = () => (replay || screenMap)();
  byId('map').onclick = () => screenMap();
}

/* ════════ REGION CLEAR ════════ */
function screenRegionClear(toKing = false) {
  const ri = state.region - 1;
  const cleared = REGIONS[ri] || REGIONS[REGIONS.length - 1];
  const nextTxt = toKing ? 'The path to Glob’s Throne lies open.' : `Next: <b>${REGIONS[state.region].name}</b>`;
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

/* ════════ HENCHMAN BOSS ════════ */
function screenBossIntro() {
  replay = screenBossIntro;
  const entry = currentFoe();        // the region's henchman
  const bm = getBoss(entry.id);
  const game = getGame(entry.game);
  show(`
    <div class="screen battle-intro boss-intro" style="--accent:${bm.color}">
      <div class="bi-card boss-card">
        <div class="bi-vs">💥 ${bm.name} — Glob’s Henchman</div>
        ${animTag('bi-foe boss-foe', petAnim(bm), SPRITE(bm.img), bm.name)}
        <h2 class="bi-name">${bm.name}</h2>
        <div class="bi-epithet">${bm.epithet}</div>
        <p class="bi-taunt">“${bm.taunt}”</p>
        <div class="bi-game"><span class="bi-icon">${game.icon}</span>
          <div><b>${game.name}</b><br><small>${game.howto}</small></div></div>
        <div class="bi-diff">Difficulty 🔥🔥🔥🔥${entry.difficulty >= 8 ? '🔥' : ''}</div>
        <button class="btn btn-king" id="begin">Face ${bm.name} 💥</button>
        <button class="btn-link" id="back">◂ Back to map</button>
      </div>
    </div>`);
  setTimeout(() => sfx(bm.sfx, 0.75), 60);   // the henchman's roar (like the champions)
  byId('begin').onclick = () => startBossFight(entry, bm);
  byId('back').onclick = () => screenMap();
}
function startBossFight(entry, bm) {
  replay = () => startBossFight(entry, bm);
  runBattle(entry, bm, { goWord: bm.name.toUpperCase() + '!' });
}

/* ════════ EVIL KING GLOB (final) ════════ */
function screenGlobIntro() {
  playMusic('bgm_gameover.mp3', 0.34);
  setTimeout(() => sfx(GLOB.sfx, 0.8), 120);   // Glob's voice
  dialogue({
    video: petAnim(GLOB), poster: SPRITE(GLOB.img), name: GLOB.name,
    lines: GLOB_INTRO, cls: 'king-dlg glob-dlg', onDone: startGlobFight
  });
}
function startGlobFight() {
  replay = startGlobFight;
  const entry = currentFoe();        // glob entry
  runBattle(entry, GLOB, { goWord: 'FINAL BATTLE!' });
}
function screenGlobDefeat() {
  dialogue({
    video: petAnim(GLOB), poster: SPRITE(GLOB.img), name: GLOB.name,
    lines: GLOB_DEFEAT, cls: 'king-dlg glob-dlg', onDone: screenEnding
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
        <img class="end-scene" src="${STORY_WIN}" alt="The whole realm, free at last">
        <p class="end-text">
          Glob’s crown goes dark, his spell shatters, and every creature wakes at once —
          color and song flood back into Liitokala. The freed champions raise
          <b>${hero.name}</b> high as the realm’s new guardian, the one heart that never knelt.
        </p>
        <div class="end-stars">Final Score: ★ ${score} / ${max}</div>
        <div class="end-sub">${{ story: '😊 Story', normal: '⚔️ Normal', hard: '🔥 Hard' }[state.mode] || '⚔️ Normal'} mode${clean ? ' · clean run bonus +6 ✨' : ` · ${state.continues} retr${state.continues > 1 ? 'ies' : 'y'}`}</div>
        <div class="end-credit">✨ creatures by <b>Leila &amp; Archie</b> ✨</div>
        <input class="name-input" id="name" maxlength="14" placeholder="Your name" value="${escapeHtml(getName())}">
        <button class="btn btn-go" id="submit">Submit to Leaderboard 🏆</button>
        <div class="btn-row">
          <button class="btn btn-2" id="share">📣 Share</button>
          <button class="btn btn-2" id="again">Play Again</button>
        </div>
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
  byId('share').onclick = e => shareOrCopy(e.currentTarget,
    `⚔️ Battle of the Realm — ${hero.name} freed Liitokala! Final score ★ ${score} / ${max + 6}${clean ? ' (clean run!)' : ''}. Can you beat it?`);
  byId('again').onclick = () => screenTitle();
}

/* share via the native sheet when available, else copy to clipboard */
async function shareOrCopy(btn, text) {
  if (navigator.share) {
    try { await navigator.share({ text, url: location.href }); return; } catch {}
  }
  try {
    await navigator.clipboard.writeText(`${text} ${location.href}`);
    const old = btn.textContent; btn.textContent = '✓ Copied!';
    setTimeout(() => { btn.textContent = old; }, 1400);
  } catch {}
}

/* ════════ LEADERBOARD ════════ */
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

async function renderBoard(listEl, highlight, board = 'adventure') {
  listEl.innerHTML = '<div class="lb-empty">Loading…</div>';
  let res; try { res = await topScores(12, board); } catch { res = { rows: [], source: 'local' }; }
  const rows = res.rows || [];
  if (!rows.length) {
    listEl.innerHTML = `<div class="lb-empty">${board === 'gauntlet'
      ? 'No gauntlet runs yet — be the first to brave it!'
      : 'No scores yet — be the first to free the realm!'}</div>`;
    return;
  }
  listEl.innerHTML = rows.map((r, i) => {
    const hot = highlight && r.name === highlight.name && r.score === highlight.score && Math.abs((r.ms || 0) - (highlight.ms || 0)) < 8000;
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`;
    const icon = r.mode === 'gauntlet' ? '🔥' : r.mode === 'story' ? '😊' : '⚔️';
    return `<div class="lb-row ${hot ? 'me' : ''}">
      <span class="lb-rank">${medal}</span>
      <span class="lb-name">${escapeHtml(r.name)}</span>
      <span class="lb-mode">${icon}</span>
      <span class="lb-score">★ ${r.score}</span></div>`;
  }).join('') + (res.source === 'local' ? '<div class="lb-note">Offline — showing scores saved on this device.</div>' : '');
}

function screenLeaderboard(highlight, tab) {
  tab = tab || (highlight && highlight.mode === 'gauntlet' ? 'gauntlet' : 'adventure');
  const sub = tab === 'gauntlet'
    ? 'Endless duels — most ★ before you fall!'
    : `Most stars wins! (max ${maxStars() + 6} with the clean-run bonus)`;
  show(`
    <div class="screen leaderboard">
      <div class="lb-card">
        <h1 class="title small">🏆 Leaderboard</h1>
        <div class="seg lb-tabs">
          <button class="seg-btn ${tab === 'adventure' ? 'on' : ''}" data-t="adventure">🗺 Adventure</button>
          <button class="seg-btn ${tab === 'gauntlet' ? 'on' : ''}" data-t="gauntlet">🔥 Gauntlet</button>
        </div>
        <p class="subtitle">${sub}</p>
        <div class="lb-list" id="list"></div>
        <button class="btn btn-go" id="back">◂ Back to Title</button>
      </div>
    </div>`);
  APP.querySelectorAll('.lb-tabs .seg-btn').forEach(b => b.onclick = () => {
    if (b.dataset.t !== tab) { S.ui(); screenLeaderboard(highlight, b.dataset.t); }
  });
  renderBoard(byId('list'), highlight, tab);
  byId('back').onclick = () => screenTitle();
}

/* (No more Game Over — the adventure has no lives. A lost battle simply
   lets you try that same battle again, so you never lose your progress.) */

/* ════════ GAUNTLET (endless survival) ════════
   Random champions in shuffled order, difficulty climbing every round.
   Score = total ★ earned. Lives follow the chosen difficulty mode.
   Friendly arcade rules: a fallen foe rejoins the queue, the run ends
   when hearts run out (or you retire and bank your score). */
let G = null;

function screenGauntletSelect() {
  playMusic('bgm_intro.mp3');
  const lives = livesFor(getMode());
  const best = gauntletBest();
  let pick = null;
  show(`
    <div class="screen select">
      <h2 class="screen-title">🔥 The Gauntlet</h2>
      <p class="ga-sub">Endless friendly duels! Champions arrive in random order and grow ever stronger.
        You have ${lives} ❤ — earn ★ every round before you fall.${best ? ` Your best: <b>★ ${best}</b>` : ''}</p>
      <div class="sel-grid" id="grid">
        ${allPets().map(p => `
          <button class="sel-cell" data-id="${p.id}">
            <img src="${SPRITE(p.sprite)}" alt="${p.name}">
            <span class="sel-name">${p.name}</span>
          </button>`).join('')}
      </div>
      <div class="sel-bar" id="bar">
        <div class="sel-info" id="info">Pick your champion.</div>
        <button class="btn btn-go" id="begin" disabled>Enter the Gauntlet 🔥</button>
        <button class="btn-link" id="back">◂ Title</button>
      </div>
    </div>`);
  const grid = byId('grid'), info = byId('info'), begin = byId('begin');
  grid.querySelectorAll('.sel-cell').forEach(c => {
    c.onclick = () => {
      grid.querySelectorAll('.sel-cell').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      pick = c.dataset.id;
      const p = getPet(pick);
      info.innerHTML = `<b>${p.name}</b> <i>${flavor(p.id).epithet}</i><br><small>${p.power}</small>`;
      begin.disabled = false;
      sfx(p.sfx, 0.6);
    };
  });
  begin.onclick = () => { if (pick) startGauntlet(pick); };
  byId('back').onclick = () => screenTitle();
}

function startGauntlet(heroId) {
  state.mode = getMode();                    // effDiff scales by mode (story = gentler)
  const lives = livesFor(state.mode);
  G = { heroId, lives, maxLives: lives, round: 0, score: 0, queue: [] };
  screenGauntletRound();
}

function nextGauntletFoe() {
  if (!G.queue.length) G.queue = shuffle(allPets().filter(p => p.id !== G.heroId).map(p => p.id));
  const id = G.queue.shift();
  const b = BATTLES[id] || {};
  return {
    id,
    difficulty: Math.min(10, 2 + Math.floor(G.round * 0.7)),
    game: b.game || 'quickdraw',
    theme: { proj: b.proj || '⭐', color: b.color || '#ffd23f', act: b.act || 'Champion’s Trial', howto: b.howto || null }
  };
}

function gauntletHud() {
  const hearts = '❤'.repeat(G.lives) + '🖤'.repeat(Math.max(0, G.maxLives - G.lives));
  return `<div class="ga-hud"><span>Round <b>${G.round + 1}</b></span><span>${hearts}</span><span>★ <b>${G.score}</b></span></div>`;
}

function screenGauntletRound() {
  G.cur = nextGauntletFoe();
  const foe = getPet(G.cur.id), fl = flavor(foe.id), game = getGame(G.cur.game);
  show(`
    <div class="screen battle-intro">
      <div class="bi-card">
        ${gauntletHud()}
        <img class="bi-foe" src="${SPRITE(foe.sprite)}" alt="${foe.name}">
        <h2 class="bi-name">${foe.name}</h2>
        <div class="bi-epithet">${fl.epithet}</div>
        <div class="bi-attack">${G.cur.theme.proj} Attack: <b>${G.cur.theme.act}</b></div>
        <div class="bi-game"><span class="bi-icon">${game.icon}</span>
          <div><b>${game.name}</b><br><small>${G.cur.theme.howto || game.howto}</small></div></div>
        <div class="bi-diff">Difficulty ${'🔥'.repeat(Math.min(5, Math.ceil(G.cur.difficulty / 2)))}</div>
        <button class="btn btn-go" id="begin">Fight ▸</button>
        <button class="btn-link" id="bail">Retire &amp; bank your score</button>
      </div>
    </div>`);
  byId('begin').onclick = () => runGauntletBattle();
  byId('bail').onclick = () => screenGauntletOver();
}

function runGauntletBattle() {
  const foe = getPet(G.cur.id);
  runBattle(G.cur, foe, { heroId: G.heroId, onResult: res => {
    if (res.win) {
      const stars = res.stars || 1;
      G.round++; G.score += stars;
      recordBestStars(G.cur.id, stars);
      award('first-win');
      if (stars >= 3) award('flawless');
      if (G.round >= 5) award('gauntlet-5');
      if (G.round >= 12) award('gauntlet-12');
      screenGauntletWin(foe, stars);
    } else {
      G.lives--;
      buzz(70); S.lose();
      if (G.lives <= 0) return screenGauntletOver();
      G.queue.push(G.cur.id);          // they'll be waiting for you later…
      screenGauntletLose(foe);
    }
  }});
}

function screenGauntletWin(foe, stars) {
  buzz(40);
  show(`
    <div class="screen result win">
      <div class="result-card">
        <div class="res-burst">🔥</div>
        <h2 class="res-title">Round ${G.round} Cleared!</h2>
        <img class="res-foe" src="${SPRITE(foe.sprite)}">
        <div class="res-stars" id="stars">${'<span class="star-slot">☆</span>'.repeat(3)}</div>
        <p class="res-line">Score <b>★ ${G.score}</b> · ${'❤'.repeat(G.lives)}</p>
        <button class="btn btn-go" id="next">Next Duel ▸</button>
        <button class="btn-link" id="bail">Retire &amp; bank your score</button>
      </div>
    </div>`);
  setTimeout(() => sfx(foe.sfx, 0.6), 50);
  S.win();
  confetti(document.querySelector('.screen'), 26);
  revealStars(stars);
  byId('next').onclick = () => screenGauntletRound();
  byId('bail').onclick = () => screenGauntletOver();
}

function screenGauntletLose(foe) {
  const hearts = '❤'.repeat(G.lives) + '🖤'.repeat(Math.max(0, G.maxLives - G.lives));
  show(`
    <div class="screen result lose">
      <div class="result-card">
        <div class="res-burst">💫</div>
        <h2 class="res-title">Knocked Down…</h2>
        <img class="res-foe dim" src="${SPRITE(foe.sprite)}">
        <p class="res-line"><b>${foe.name}</b> takes the round. Hearts left: <b>${hearts}</b><br>
          A new challenger steps up!</p>
        <button class="btn btn-go" id="next">Keep Fighting ▸</button>
        <button class="btn-link" id="bail">Retire &amp; bank your score</button>
      </div>
    </div>`);
  byId('next').onclick = () => screenGauntletRound();
  byId('bail').onclick = () => screenGauntletOver();
}

function screenGauntletOver() {
  const prevBest = gauntletBest();
  recordGauntlet(G.score);
  const newBest = G.score > 0 && G.score > prevBest;
  const hero = getPet(G.heroId);
  show(`
    <div class="screen ending">
      <div class="end-card">
        <div class="end-fire">🔥</div>
        <h1 class="title small">The Gauntlet Ends</h1>
        <div class="ga-round-big">${G.round}</div>
        <p class="end-text">round${G.round === 1 ? '' : 's'} conquered with <b>${hero.name}</b></p>
        <div class="end-stars">Score: ★ ${G.score}</div>
        ${newBest
          ? '<div class="ga-best">🎉 New personal best!</div>'
          : `<div class="end-sub">Personal best: ★ ${Math.max(prevBest, G.score)}</div>`}
        <input class="name-input" id="name" maxlength="14" placeholder="Your name" value="${escapeHtml(getName())}">
        <button class="btn btn-go" id="submit" ${G.score > 0 ? '' : 'disabled'}>Submit to Leaderboard 🏆</button>
        <div class="btn-row">
          <button class="btn btn-2" id="share">📣 Share</button>
          <button class="btn btn-2" id="again">Run Again</button>
        </div>
        <button class="btn-link" id="title">Quit to title</button>
      </div>
    </div>`);
  if (newBest) { S.win(); confetti(document.querySelector('.screen'), 50); }
  const round = G.round, score = G.score;
  byId('submit').onclick = async () => {
    const name = (byId('name').value || 'Hero').trim() || 'Hero';
    setName(name);
    const btn = byId('submit'); btn.disabled = true; btn.textContent = 'Submitting…';
    const entry = { name, score, mode: 'gauntlet', ms: Date.now() };
    await submitScore(entry);
    screenLeaderboard(entry, 'gauntlet');
  };
  byId('share').onclick = e => shareOrCopy(e.currentTarget,
    `🔥 I survived ${round} round${round === 1 ? '' : 's'} of the Gauntlet (★ ${score}) in Battle of the Realm! Can you beat my run?`);
  byId('again').onclick = () => screenGauntletSelect();
  byId('title').onclick = () => screenTitle();
}

/* ════════ CRITTERDEX (collection + badges) ════════ */
function screenDex() {
  show(`
    <div class="screen dex">
      <h2 class="screen-title">📖 Critterdex</h2>
      <p class="dex-sub">All ${allPets().length} champions of Liitokala. Tap one to meet them and 🎯 practice their minigame — ★ is your best battle ever.</p>
      <div class="dex-grid">
        ${allPets().map(p => {
          const best = bestStarsFor(p.id);
          return `<button class="dex-cell" data-id="${p.id}">
            <img src="${SPRITE(p.sprite)}" alt="${p.name}">
            <span class="dex-name">${p.name}</span>
            <span class="dex-best">${best ? '★'.repeat(best) : '·'}</span>
          </button>`;
        }).join('')}
      </div>
      <h3 class="dex-badges-title">🏅 Badges <span>${badgeCount()} / ${BADGES.length}</span></h3>
      <div class="badge-grid">
        ${BADGES.map(b => `
          <div class="badge-item ${hasBadge(b.id) ? 'earned' : 'locked'}">
            <span class="bi2-icon">${hasBadge(b.id) ? b.icon : '🔒'}</span>
            <span><span class="bi2-name">${b.name}</span><br><span class="bi2-desc">${b.desc}</span></span>
          </div>`).join('')}
      </div>
      <div class="dex-foot"><button class="btn btn-go" id="back">◂ Back to Title</button></div>
    </div>`);
  byId('back').onclick = () => screenTitle();
  APP.querySelectorAll('.dex-cell').forEach(c => c.onclick = () => dexDetail(c.dataset.id));
}

function dexDetail(id) {
  const p = getPet(id); if (!p) return;
  const fl = flavor(id);
  const b = BATTLES[id] || {};
  const game = getGame(b.game);
  const best = bestStarsFor(id);
  const hab = { land: '🌳 Land', sea: '🌊 Sea', sky: '⛰️ Sky' }[p.habitat] || '';
  const pop = el('div', 'dex-pop', `
    <div class="dex-card">
      <button class="dex-close" aria-label="Close">✕</button>
      <img class="dex-art" src="${SPRITE(p.sprite)}" alt="${p.name}">
      <h2 class="bi-name">${p.name}</h2>
      <div class="bi-epithet">${fl.epithet}</div>
      <div class="dex-hab">${hab}</div>
      <p class="dex-power">${p.power}</p>
      <div class="dex-row"><span class="ic">${b.proj || '⭐'}</span>
        <span><b>${b.act || 'Champion’s Trial'}</b><br><small>signature attack</small></span></div>
      <div class="dex-row"><span class="ic">${game.icon}</span>
        <span><b>${game.name}</b><br><small>${b.howto || game.howto}</small></span></div>
      <div class="dex-prac-row">
        <span class="dex-prac-label">🎯 Practice</span>
        <button class="prac-btn" data-d="2">😊 Easy</button>
        <button class="prac-btn" data-d="5">⚔️ Medium</button>
        <button class="prac-btn" data-d="8">🔥 Hard</button>
      </div>
      <div class="dex-stars">${best ? 'Your best: ' + '★'.repeat(best) + '☆'.repeat(3 - best) : 'Not yet bested in battle…'}</div>
    </div>`);
  document.querySelector('.screen').appendChild(pop);
  sfx(p.sfx, 0.8);
  pop.querySelectorAll('.prac-btn').forEach(b => b.onclick = () => {
    S.ui(); pop.remove(); startPractice(id, +b.dataset.d);
  });
  pop.querySelector('.dex-close').onclick = () => pop.remove();
  pop.addEventListener('pointerdown', e => {
    if (e.target === pop || e.target.closest('.dex-close')) pop.remove();
  });
}

/* ════════ PRACTICE MODE (from the Critterdex) ════════
   Friendly training against any champion at a chosen level. Nothing is
   recorded — no stars, badges or hearts — it's pure rehearsal. */
const PRAC_LABEL = { 2: '😊 Easy', 5: '⚔️ Medium', 8: '🔥 Hard' };
const PRAC_NEXT = { 2: 5, 5: 8 };

function startPractice(foeId, diff) {
  const foe = getPet(foeId); if (!foe) return screenDex();
  const b = BATTLES[foeId] || {};
  const entry = {
    id: foeId, difficulty: diff, game: b.game || 'quickdraw',
    theme: { proj: b.proj || '⭐', color: b.color || '#ffd23f', act: b.act || 'Champion’s Trial' }
  };
  // spar as your adventure hero when one is saved, else a random friend steps in
  const saved = savedHeroId();
  const heroId = (saved && saved !== foeId) ? saved
    : pickOther(foeId);
  runBattle(entry, foe, {
    heroId, rawDiff: true, goWord: 'PRACTICE!',
    onResult: res => screenPracticeResult(foeId, diff, res)
  });
}
function pickOther(foeId) {
  const others = allPets().filter(p => p.id !== foeId);
  return others[(Math.random() * others.length) | 0].id;
}

function screenPracticeResult(foeId, diff, res) {
  const foe = getPet(foeId);
  const stars = res.stars || 1;
  const next = PRAC_NEXT[diff];
  const mastered = res.win && !next;
  show(`
    <div class="screen result ${res.win ? 'win' : 'lose'}">
      <div class="result-card">
        <div class="res-burst">🎯</div>
        <h2 class="res-title">${res.win ? 'Practice Cleared!' : 'Good Practice!'}</h2>
        <img class="res-foe ${res.win ? '' : 'dim'}" src="${SPRITE(foe.sprite)}">
        ${res.win ? `<div class="res-stars" id="stars">${'<span class="star-slot">☆</span>'.repeat(3)}</div>` : ''}
        <p class="res-line">${PRAC_LABEL[diff] || diff} · <b>${foe.name}</b><br>
          ${mastered ? 'Mastered! Now show the realm ⚔️' : res.win ? 'Nicely done — fancy a tougher round?' : 'No harm done — practice never counts. Try again!'}</p>
        <p class="end-sub">Just practice — no stars or records changed.</p>
        <button class="btn btn-go" id="again">${res.win ? 'Once More ▸' : 'Try Again ▸'}</button>
        ${res.win && next ? `<button class="btn btn-2" id="harder">Level Up: ${PRAC_LABEL[next]} ▸</button>` : ''}
        <button class="btn-link" id="back">◂ Back to Critterdex</button>
      </div>
    </div>`);
  if (res.win) { buzz(40); S.win(); confetti(document.querySelector('.screen'), 26); revealStars(stars); }
  else S.bad();
  byId('again').onclick = () => startPractice(foeId, diff);
  const h = byId('harder'); if (h) h.onclick = () => startPractice(foeId, next);
  byId('back').onclick = () => { screenDex(); dexDetail(foeId); };
}

/* ════════ shared dialogue ════════
   portrait: a small bobbing image · video: an autoplay clip (boss anim) ·
   image: a big scene splash (shown from beat `imageFrom` onward) */
function dialogue({ portrait, video, poster, image, imageFrom = 0, name, lines, cls = '', onDone }) {
  let i = 0;
  const showScene = idx => image && idx >= imageFrom;
  const render = () => {
    show(`
      <div class="screen story ${cls}">
        <div class="story-card">
          ${video ? animTag('story-portrait', video, poster || '', name || '') : ''}
          ${portrait && !video ? `<img class="story-portrait" src="${portrait}">` : ''}
          ${image ? `<img class="story-scene ${showScene(i) ? '' : 'hide'}" id="sscene" src="${image}">` : ''}
          ${name ? `<div class="story-name">${name}</div>` : ''}
          <p class="story-text" id="stext">${lines[i]}</p>
          <button class="btn btn-go" id="next">${i < lines.length - 1 ? 'Next ▸' : 'Continue ▸'}</button>
          ${lines.length > 1 ? '<button class="btn-link" id="skip">Skip ▸▸</button>' : ''}
        </div>
      </div>`);
    byId('next').onclick = () => {
      i++;
      if (i < lines.length) {
        byId('stext').textContent = lines[i];
        byId('next').textContent = i < lines.length - 1 ? 'Next ▸' : 'Continue ▸';
        const sc = byId('sscene'); if (sc) sc.classList.toggle('hide', !showScene(i));
        if (i === lines.length - 1) { const sk = byId('skip'); if (sk) sk.remove(); }
      } else onDone();
    };
    const sk = byId('skip');
    if (sk) sk.onclick = () => onDone();
  };
  render();
}
