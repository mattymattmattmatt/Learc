/*══════════════════════════════════════════════════════════════════════
  CRITTER CATCH  🪄
  A one-finger arcade game starring 24 hand-designed creatures.
  Tap the critters as they float up — each one shouts its own name and
  sound! Build combos, snag golden critters, and fill your Collection
  book by finding all 24.  Built mobile-first (touch), no reading needed.
══════════════════════════════════════════════════════════════════════*/

const APP = document.getElementById('app');

const SPRITE = id => `assets/img/characters/${id}`;
const AUDIO  = f  => `assets/audio/${f}`;
const KING   = 'assets/img/king_intro.gif';

const ROUND_TIME   = 45;        // seconds per round
const COMBO_WINDOW = 1300;      // ms to keep a combo alive
const PARTICLES    = ['✨','⭐','🎉','💫','🌟','💛'];

/* ── persistence (kid-proof: never throws) ───────────────────────── */
const LS_BEST   = 'critter:best';
const LS_CAUGHT = 'critter:caught';
const loadBest   = () => { try { return +localStorage.getItem(LS_BEST) || 0; } catch { return 0; } };
const saveBest   = v => { try { localStorage.setItem(LS_BEST, String(v)); } catch {} };
const loadCaught = () => { try { return new Set(JSON.parse(localStorage.getItem(LS_CAUGHT) || '[]')); } catch { return new Set(); } };
const saveCaught = s => { try { localStorage.setItem(LS_CAUGHT, JSON.stringify([...s])); } catch {} };

let PETS = [];
let best = loadBest();
let caught = loadCaught();

/* ── audio (unlocked on first tap, per mobile autoplay rules) ─────── */
let music = null, audioOn = false;
function unlockAudio() {
  if (audioOn) return;
  audioOn = true;
  music = new Audio(AUDIO('bgm_intro.mp3'));
  music.loop = true; music.volume = 0.3;
  music.play().catch(() => {});
}
function sfx(file, vol = 0.9) {
  if (!audioOn) return;
  try { const a = new Audio(AUDIO(file)); a.volume = vol; a.play().catch(() => {}); } catch {}
}
const buzz = ms => { try { navigator.vibrate?.(ms); } catch {} };

/* ── boot ─────────────────────────────────────────────────────────── */
init();
async function init() {
  try {
    const res = await fetch('scripts/data/pets.json');
    const data = await res.json();
    PETS = Object.values(data);
  } catch (e) {
    APP.innerHTML = `<div class="screen"><p style="padding:2rem;text-align:center">
      Couldn't load the creatures. Please run this from a web server 🙂</p></div>`;
    return;
  }
  // unlock audio on the very first interaction anywhere
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  showMenu();
}

/* ══════════════ MENU ══════════════ */
function showMenu() {
  stopMusicSwap('bgm_intro.mp3');
  APP.innerHTML = `
    <div class="screen menu">
      <div class="bg-critters" id="bgCritters"></div>
      <div class="menu-card">
        <h1 class="title">Critter<br>Catch</h1>
        <div class="king-bubble">
          <img src="${KING}" alt="King" class="king">
          <p class="bubble">My creature friends are bouncing everywhere — quick, tap to catch them all! 🎉</p>
        </div>
        <button class="btn btn-play" id="play">▶ PLAY</button>
        <button class="btn btn-2" id="coll">📖 Collection (${caught.size}/${PETS.length})</button>
        <p class="best">🏆 Best score: ${best}</p>
      </div>
    </div>`;
  decorateMenu();
  byId('play').onclick = () => { unlockAudio(); startGame(); };
  byId('coll').onclick = () => { unlockAudio(); showCollection('menu'); };
}

function decorateMenu() {
  const box = byId('bgCritters');
  if (!box) return;
  // a few friendly creatures drifting behind the card
  const picks = shuffle(PETS).slice(0, 7);
  box.innerHTML = picks.map((p, i) => {
    const left = 6 + Math.random() * 84;
    const dur  = 6 + Math.random() * 5;
    const del  = -Math.random() * 6;
    const size = 56 + Math.random() * 40;
    return `<img src="${SPRITE(p.sprite)}" class="float-critter"
      style="left:${left}%;width:${size}px;animation-duration:${dur}s;animation-delay:${del}s">`;
  }).join('');
}

/* ══════════════ GAMEPLAY ══════════════ */
function startGame() {
  APP.innerHTML = `
    <div class="screen play" id="play">
      <div class="hud">
        <div class="hud-score">🪙 <span id="score">0</span></div>
        <div class="hud-combo" id="combo"></div>
        <div class="hud-time">
          <div class="time-bar"><div class="time-fill" id="timeFill"></div></div>
        </div>
      </div>
      <div class="field" id="field"></div>
      <div class="countdown" id="cd">3</div>
    </div>`;

  const field = byId('field');
  const state = {
    score: 0, combo: 0, lastCatch: 0,
    timeLeft: ROUND_TIME, elapsed: 0,
    critters: [], spawnAcc: 0, running: false,
    caughtThisRound: new Set(),
    W: 0, H: 0
  };
  measure(field, state);
  window.addEventListener('resize', () => measure(field, state));

  // tap anywhere in the field (event delegation = snappy on mobile)
  field.addEventListener('pointerdown', e => {
    const el = e.target.closest('.critter');
    if (el && state.running) {
      e.preventDefault();
      catchCritter(el, state, field);
    }
  });

  countdown(state, field);
}

function measure(field, state) {
  const r = field.getBoundingClientRect();
  state.W = r.width; state.H = r.height;
  state.size = Math.max(58, Math.min(118, Math.min(state.W, state.H) * 0.19));
}

function countdown(state, field) {
  const cd = byId('cd');
  let n = 3;
  cd.textContent = n;
  const t = setInterval(() => {
    n--;
    if (n > 0) { cd.textContent = n; cd.classList.remove('go'); void cd.offsetWidth; cd.classList.add('pulse'); }
    else if (n === 0) { cd.textContent = 'GO!'; cd.classList.add('go'); }
    else { clearInterval(t); cd.remove(); runLoop(state, field); }
  }, 700);
}

function runLoop(state, field) {
  state.running = true;
  let last = performance.now();
  function frame(now) {
    if (!state.running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(state, field, dt, now);
    state._raf = requestAnimationFrame(frame);
  }
  state._raf = requestAnimationFrame(frame);
}

function update(state, field, dt, now) {
  // timer
  state.elapsed += dt;
  state.timeLeft = Math.max(0, ROUND_TIME - state.elapsed);
  const tf = byId('timeFill');
  if (tf) {
    const pct = (state.timeLeft / ROUND_TIME) * 100;
    tf.style.width = pct + '%';
    tf.classList.toggle('low', state.timeLeft <= 10);
  }
  if (state.timeLeft <= 0) { endGame(state); return; }

  // difficulty ramps over the round
  const prog = state.elapsed / ROUND_TIME;                 // 0→1
  const spawnEvery = 0.95 - prog * 0.6;                    // 0.95s → 0.35s
  const rise = 70 + prog * 90;                             // 70 → 160 px/s

  state.spawnAcc += dt;
  if (state.spawnAcc >= spawnEvery && state.critters.length < 9) {
    state.spawnAcc = 0;
    spawnCritter(state, field, rise);
  }

  // combo decay
  if (state.combo > 0 && now - state.lastCatch > COMBO_WINDOW) {
    state.combo = 0; renderCombo(state);
  }

  // move critters
  for (const c of state.critters) {
    if (!c.alive) continue;
    c.y -= c.vy * dt;
    const bob = Math.sin(now / 380 + c.phase) * c.wob;
    c.el.style.transform = `translate(${c.x + bob}px, ${c.y}px)`;
    if (c.y < -c.size - 10) { escapeCritter(c, state); }
  }
}

function spawnCritter(state, field, rise) {
  const pet = PETS[(Math.random() * PETS.length) | 0];
  const golden = state.elapsed > 4 && Math.random() < 0.08;
  const size = state.size * (golden ? 1.12 : 1);
  const x = Math.random() * (state.W - size);
  const y = state.H + size;

  const el = document.createElement('img');
  el.src = SPRITE(pet.sprite);
  el.alt = pet.name;
  el.className = 'critter' + (golden ? ' golden' : '');
  el.draggable = false;
  el.style.width = size + 'px';
  el.style.transform = `translate(${x}px, ${y}px)`;

  const c = {
    el, pet, golden, size,
    x, y,
    vy: rise * (0.85 + Math.random() * 0.4),
    phase: Math.random() * 6.28,
    wob: 8 + Math.random() * 16,
    alive: true
  };
  state.critters.push(c);
  field.appendChild(el);
}

function catchCritter(el, state, field) {
  const c = state.critters.find(c => c.el === el && c.alive);
  if (!c) return;
  c.alive = false;

  // combo
  const now = performance.now();
  state.combo = (now - state.lastCatch <= COMBO_WINDOW) ? state.combo + 1 : 1;
  state.lastCatch = now;

  const mult = Math.min(5, state.combo);
  const base = c.golden ? 50 : 10;
  const gain = base * mult;
  state.score += gain;
  if (c.golden) state.timeLeft = Math.min(ROUND_TIME, state.timeLeft + 2); // golden = +2s
  state.elapsed = ROUND_TIME - state.timeLeft;

  state.caughtThisRound.add(c.pet.id);
  caught.add(c.pet.id);

  // feedback: its own voice + name + sparkles + buzz
  sfx(c.pet.sfx, 0.85);
  buzz(c.golden ? 45 : 18);
  popName(field, c, c.golden);
  particles(field, c.x + c.size / 2, c.y + c.size / 2, c.golden);
  floatScore(field, c.x + c.size / 2, c.y, '+' + gain, c.golden);

  el.classList.add('pop');
  setTimeout(() => removeCritter(c, state), 280);

  byId('score').textContent = state.score;
  renderCombo(state);
  if (c.golden) flashGold();
}

function escapeCritter(c, state) { removeCritter(c, state); }

function removeCritter(c, state) {
  c.alive = false;
  c.el.remove();
  const i = state.critters.indexOf(c);
  if (i >= 0) state.critters.splice(i, 1);
}

function renderCombo(state) {
  const el = byId('combo');
  if (!el) return;
  if (state.combo >= 2) {
    el.textContent = `COMBO ×${Math.min(5, state.combo)}`;
    el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump', 'on');
  } else {
    el.textContent = ''; el.classList.remove('on');
  }
}

/* ── tiny juice helpers ───────────────────────────────────────────── */
function popName(field, c, golden) {
  const n = document.createElement('div');
  n.className = 'pop-name' + (golden ? ' gold' : '');
  n.textContent = (golden ? '👑 ' : '') + c.pet.name + '!';
  n.style.left = (c.x + c.size / 2) + 'px';
  n.style.top  = (c.y) + 'px';
  field.appendChild(n);
  setTimeout(() => n.remove(), 850);
}
function floatScore(field, x, y, txt, golden) {
  const s = document.createElement('div');
  s.className = 'float-score' + (golden ? ' gold' : '');
  s.textContent = txt;
  s.style.left = x + 'px'; s.style.top = y + 'px';
  field.appendChild(s);
  setTimeout(() => s.remove(), 800);
}
function particles(field, x, y, golden) {
  const n = golden ? 12 : 7;
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'particle';
    p.textContent = PARTICLES[(Math.random() * PARTICLES.length) | 0];
    const ang = Math.random() * 6.28, dist = 30 + Math.random() * 60;
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * dist + 'px');
    field.appendChild(p);
    setTimeout(() => p.remove(), 720);
  }
}
function flashGold() {
  const f = byId('field'); if (!f) return;
  f.classList.add('goldflash');
  setTimeout(() => f.classList.remove('goldflash'), 260);
}

/* ══════════════ RESULTS ══════════════ */
function endGame(state) {
  state.running = false;
  cancelAnimationFrame(state._raf);
  state.critters.forEach(c => c.el.remove());

  const isBest = state.score > best;
  if (isBest) { best = state.score; saveBest(best); }
  saveCaught(caught);

  const roundPets = [...state.caughtThisRound].map(id => PETS.find(p => p.id === id)).filter(Boolean);
  const total = PETS.length;

  APP.innerHTML = `
    <div class="screen results">
      <div class="menu-card">
        <h1 class="title small">Time's Up!</h1>
        <div class="score-big">${state.score}${isBest ? '<span class="newbest">★ NEW BEST!</span>' : ''}</div>
        <p class="best">🏆 Best: ${best}</p>
        <p class="round-label">You caught ${state.caughtThisRound.size} kinds this round:</p>
        <div class="round-row">
          ${roundPets.map(p => `<img src="${SPRITE(p.sprite)}" title="${p.name}" class="mini">`).join('') || '<span class="dim">—</span>'}
        </div>
        <div class="coll-progress">
          <div class="coll-bar"><div class="coll-fill" style="width:${(caught.size/total)*100}%"></div></div>
          <span>Collection ${caught.size}/${total}</span>
        </div>
        <button class="btn btn-play" id="again">▶ Play Again</button>
        <button class="btn btn-2" id="coll">📖 Collection</button>
        <button class="btn btn-3" id="menu">🏠 Menu</button>
      </div>
    </div>`;

  byId('again').onclick = () => startGame();
  byId('coll').onclick  = () => showCollection('results');
  byId('menu').onclick  = () => showMenu();
}

/* ══════════════ COLLECTION BOOK ══════════════ */
function showCollection(from) {
  const total = PETS.length;
  const done = caught.size === total;
  APP.innerHTML = `
    <div class="screen collection">
      <div class="coll-head">
        <button class="btn-back" id="back">‹ Back</button>
        <h2>Collection ${caught.size}/${total}</h2>
      </div>
      ${done ? `<p class="all-found">🏆 You found them ALL! Amazing! 🏆</p>` : `<p class="hint">Tap a creature you've found to hear it say hi! 🔊</p>`}
      <div class="coll-grid">
        ${PETS.map(p => {
          const have = caught.has(p.id);
          return `<button class="coll-cell ${have ? 'have' : 'locked'}" data-id="${p.id}" ${have ? '' : 'disabled'}>
            <img src="${SPRITE(p.sprite)}" alt="${have ? p.name : '???'}">
            <span>${have ? p.name : '???'}</span>
          </button>`;
        }).join('')}
      </div>
    </div>`;

  byId('back').onclick = () => (from === 'results' ? showMenuFromResults() : showMenu());
  APP.querySelectorAll('.coll-cell.have').forEach(cell => {
    cell.onclick = () => {
      const pet = PETS.find(p => p.id === cell.dataset.id);
      unlockAudio();
      sfx(pet.sfx, 0.9);
      buzz(15);
      cell.classList.remove('boing'); void cell.offsetWidth; cell.classList.add('boing');
    };
  });
}
function showMenuFromResults() { showMenu(); }

/* ── helpers ──────────────────────────────────────────────────────── */
function byId(id) { return document.getElementById(id); }
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = (Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]]; } return b; }
function stopMusicSwap() { /* keep the single looping track; placeholder for future per-screen music */ }
