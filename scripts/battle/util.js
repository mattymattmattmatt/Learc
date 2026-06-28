/* util.js — shared helpers for Battle of the Realm
   Pure helpers + a tiny audio layer. Everything fails soft. */

export const SPRITE = p => `assets/img/characters/${encodeURIComponent(p)}`;
export const AUDIO  = f => `assets/audio/${f}`;
export const MUSIC  = f => `assets/Music/${encodeURIComponent(f)}`;
export const ANIM   = f => `assets/Char_Anim/${encodeURIComponent(f)}`;
export const KING_GIF = 'assets/img/king_intro.gif';
/* the character-select / story animation clip for a creature (derived from its
   sprite filename, e.g. char_roger-dodger.webp → roger-dodger_Anim.mp4) */
export const petAnim = pet => (pet && pet.anim)
  ? ANIM(pet.anim)
  : (pet && pet.sprite) ? ANIM(pet.sprite.replace(/^char_/, '').replace(/\.webp$/, '') + '_Anim.mp4') : '';
/* image URL for a combatant (creatures, henchmen or the King) */
export const petImg = pet => (pet && pet.img) ? SPRITE(pet.img) : (pet && pet.king ? KING_GIF : SPRITE(pet.sprite));

/* an autoplaying, looping, muted clip with a still-image poster fallback.
   Used on the select screen and battle intros so champions & bosses move. */
export function animTag(cls, animUrl, posterUrl, alt = '') {
  return `<video class="${cls}" playsinline autoplay loop muted preload="auto"
    poster="${posterUrl}" aria-label="${alt}"
    onerror="this.replaceWith(Object.assign(new Image(),{src:this.poster,className:this.className}))"
    ><source src="${animUrl}" type="video/mp4"></video>`;
}

/* ── math / rng ───────────────────────────────────────────────── */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rand  = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = (Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]]; } return b; }
export const starsByRatio = r => (r >= 0.95 ? 3 : r >= 0.6 ? 2 : 1);

/* ── audio: WebAudio SFX synth + music (unlocked on first gesture) ─ */
let audioOn = false, musicVol = 0.28;
let curEl = null, curName = '';          // the audio element currently playing
const pool = {};                         // track name → its (reused) audio element;
                                         // a paused element keeps its position, so
                                         // returning to a track resumes mid-song
let muted = false;
try { muted = localStorage.getItem('realm:mute') === '1'; } catch {}

let _ac = null;
function ac() {
  if (!_ac) { try { _ac = new (window.AudioContext || window.webkitAudioContext)(); } catch {} }
  if (_ac && _ac.state === 'suspended') _ac.resume().catch(() => {});
  return _ac;
}

export function unlockAudio() {
  ac();
  if (audioOn) return; audioOn = true;
}
document.addEventListener('pointerdown', unlockAudio);

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem('realm:mute', muted ? '1' : '0'); } catch {}
  if (curEl) fade(curEl, muted ? 0 : musicVol, 200);
}
export function toggleMute() { setMuted(!muted); return muted; }

/* smoothly ramp an element's volume; cancels any fade already on it */
function fade(a, to, ms, done) {
  if (!a) return;
  if (a._ft) { clearInterval(a._ft); a._ft = null; }
  const from = a.volume, steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  a._ft = setInterval(() => {
    i++;
    a.volume = Math.max(0, Math.min(1, from + (to - from) * (i / steps)));
    if (i >= steps) { clearInterval(a._ft); a._ft = null; if (done) done(); }
  }, 40);
}

/* one (reused) audio element per track, so its playback position survives */
function track(name) {
  let a = pool[name];
  if (!a) {
    a = new Audio();
    a.loop = true; a.preload = 'auto';
    a.addEventListener('error', () => {});
    a.src = MUSIC(name);
    a.volume = 0;
    pool[name] = a;
  }
  return a;
}

/* crossfade to a track. If it's already playing we leave it be (no restart);
   otherwise the new track fades in while the old one fades out. Because each
   track keeps its own paused element, returning to one resumes mid-song. */
export function playMusic(name, vol = 0.28) {
  musicVol = vol;
  if (curName === name && curEl) {                 // already on this track
    if (curEl.paused) curEl.play().catch(() => {});
    if (!muted) fade(curEl, vol, 300);
    return;
  }
  const out = curEl;
  const next = track(name);
  curEl = next; curName = name;
  next.play().catch(() => {});                     // resumes from where it paused
  if (!muted) fade(next, vol, 500); else next.volume = 0;
  if (out && out !== next) fade(out, 0, 500, () => { try { out.pause(); } catch {} });
}
export function stopMusic() {
  if (curEl) { const out = curEl; fade(out, 0, 350, () => { try { out.pause(); } catch {} }); }
  curEl = null; curName = '';
}

/* play a sampled file (used for the creatures' own entrance roars) */
export function sfx(file, vol = 0.8) {
  if (!file || muted) return;
  try { const a = new Audio(AUDIO(file)); a.volume = vol; a.play().catch(() => {}); } catch {}
}
/* one-shot stinger from the Music folder (e.g. a boss's musical entrance) */
export function sfxMusic(file, vol = 0.8) {
  if (!file || muted) return;
  try { const a = new Audio(MUSIC(file)); a.volume = vol; a.play().catch(() => {}); } catch {}
}
export const buzz = ms => { if (!muted) { try { navigator.vibrate?.(ms); } catch {} } };

/* ── tiny synth: build crisp arcade SFX with no downloads ─────────── */
function tone({ f = 440, f2, dur = 0.12, type = 'sine', vol = 0.3, delay = 0, attack = 0.004, release = 0.07 }) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + release + 0.02);
}
function noise({ dur = 0.14, vol = 0.3, delay = 0, lp = 2200, hp = 200 }) {
  const c = ac(); if (!c || muted) return;
  const t = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource(); src.buffer = buf;
  const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = src;
  if (lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; node.connect(f); node = f; }
  if (hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp; node.connect(f); node = f; }
  node.connect(g).connect(c.destination);
  src.start(t); src.stop(t + dur + 0.02);
}
/* named one-shots */
export const S = {
  tick:  () => tone({ f: 540, dur: 0.05, type: 'square', vol: 0.18 }),
  go:    () => { tone({ f: 660, f2: 990, dur: 0.18, type: 'sawtooth', vol: 0.25 }); tone({ f: 990, dur: 0.18, delay: 0.04, vol: 0.18 }); },
  ui:    () => tone({ f: 480, dur: 0.06, type: 'triangle', vol: 0.16 }),
  hit:   () => { noise({ dur: 0.13, vol: 0.32, lp: 1600 }); tone({ f: 160, f2: 60, dur: 0.12, type: 'square', vol: 0.22 }); },
  good:  () => { tone({ f: 620, dur: 0.07, type: 'square', vol: 0.2 }); tone({ f: 930, dur: 0.09, delay: 0.06, type: 'square', vol: 0.18 }); },
  bad:   () => tone({ f: 200, f2: 90, dur: 0.22, type: 'sawtooth', vol: 0.22 }),
  star:  () => { tone({ f: 1180, dur: 0.07, type: 'triangle', vol: 0.2 }); tone({ f: 1760, dur: 0.1, delay: 0.05, type: 'triangle', vol: 0.16 }); },
  swipe: () => { noise({ dur: 0.16, vol: 0.22, lp: 3500, hp: 600 }); tone({ f: 300, f2: 760, dur: 0.14, type: 'sine', vol: 0.14 }); },
  pad:   i => tone({ f: [330, 440, 554, 660][i % 4], dur: 0.16, type: 'sine', vol: 0.22 }),
  charge:lvl => tone({ f: 200 + lvl * 700, dur: 0.05, type: 'sawtooth', vol: 0.12 }),
  catch: () => tone({ f: 720, f2: 1080, dur: 0.08, type: 'triangle', vol: 0.2 }),
  note:  f => tone({ f, dur: 0.2, type: 'triangle', vol: 0.24, release: 0.12 }),
  splash:() => { noise({ dur: 0.3, vol: 0.3, lp: 1400, hp: 300 }); tone({ f: 380, f2: 120, dur: 0.25, type: 'sine', vol: 0.16 }); },
  win:   () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.16, delay: i * 0.1, type: 'triangle', vol: 0.24 })),
  lose:  () => [392, 330, 262].forEach((f, i) => tone({ f, dur: 0.22, delay: i * 0.12, type: 'sawtooth', vol: 0.22 }))
};

/* ── DOM helpers ──────────────────────────────────────────────── */
export const el = (tag, cls, html) => { const n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; };
export const byId = id => document.getElementById(id);

/* a fast pointer tap binding (touch + mouse), returns an unbind fn */
export function onTap(node, fn) {
  const h = e => { fn(e); };
  node.addEventListener('pointerdown', h);
  return () => node.removeEventListener('pointerdown', h);
}

/* ── timing ───────────────────────────────────────────────────── */
export const wait = ms => new Promise(r => setTimeout(r, ms));

/* requestAnimationFrame loop helper. fn(dt, now); return false to stop. */
export function loop(fn) {
  let last = performance.now(), raf = 0, alive = true;
  const step = now => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (fn(dt, now) === false) { alive = false; return; }
    raf = requestAnimationFrame(step);
  };
  raf = requestAnimationFrame(step);
  return () => { alive = false; cancelAnimationFrame(raf); };
}

/* big 3-2-1-GO countdown inside an arena. resolves when done. */
export function countdown(area, goWord = 'FIGHT!') {
  return new Promise(resolve => {
    const c = el('div', 'cd');
    area.appendChild(c);
    const seq = ['3', '2', '1', goWord];
    let i = 0;
    const tick = () => {
      c.textContent = seq[i];
      c.classList.toggle('go', i === 3);
      c.classList.remove('cd-pulse'); void c.offsetWidth; c.classList.add('cd-pulse');
      (i === 3 ? S.go : S.tick)();
      i++;
      if (i < seq.length) setTimeout(tick, 650);
      else setTimeout(() => { c.remove(); resolve(); }, 520);
    };
    tick();
  });
}

/* small sparkle burst at x,y inside a container */
export function sparkle(container, x, y, n = 8, emojis = ['✨','⭐','💥','💫']) {
  for (let i = 0; i < n; i++) {
    const p = el('span', 'spark', pick(emojis));
    const ang = rand(0, 6.28), d = rand(24, 70);
    p.style.left = x + 'px'; p.style.top = y + 'px';
    p.style.setProperty('--dx', Math.cos(ang) * d + 'px');
    p.style.setProperty('--dy', Math.sin(ang) * d + 'px');
    container.appendChild(p);
    setTimeout(() => p.remove(), 700);
  }
}

/* floating text (damage / messages) */
export function floatText(container, x, y, txt, cls = '') {
  const t = el('div', 'floattext ' + cls, txt);
  t.style.left = x + 'px'; t.style.top = y + 'px';
  container.appendChild(t);
  setTimeout(() => t.remove(), 900);
}

/* confetti shower from the top of a container (celebration) */
export function confetti(container, n = 40) {
  const colors = ['#ffd23f', '#ff5a86', '#5cc6ff', '#5fe39a', '#c08bff', '#ff9a3f'];
  for (let i = 0; i < n; i++) {
    const c = el('span', 'confetti');
    c.style.left = rand(0, 100) + '%';
    c.style.background = pick(colors);
    c.style.setProperty('--rot', rand(-1, 1) + 'turn');
    c.style.setProperty('--xoff', rand(-40, 40) + 'px');
    c.style.animationDelay = rand(0, 0.6) + 's';
    c.style.animationDuration = rand(1.6, 2.8) + 's';
    if (Math.random() < 0.5) c.style.borderRadius = '50%';
    container.appendChild(c);
    setTimeout(() => c.remove(), 3600);
  }
}
