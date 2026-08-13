/* util.js — shared helpers for Battle of the Realm
   Pure helpers + a tiny audio layer. Everything fails soft. */

export const SPRITE = p => `assets/img/characters/${encodeURIComponent(p)}`;
export const AUDIO  = f => `assets/audio/${f}`;
export const MUSIC  = f => `assets/Music/${encodeURIComponent(f)}`;
export const VOICE  = id => `assets/audio/voice/${encodeURIComponent(id)}.mp3`;
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
  // autoplay policies block music that starts before the first gesture
  // (e.g. the title theme on a fresh load) — resume it on the first tap
  if (curEl && curEl.paused && !muted) {
    curEl.play().then(() => fade(curEl, musicVol, 300)).catch(() => {});
  }
  if (audioOn) return; audioOn = true;
  preloadSamples();                       // decoding needs a live AudioContext
}
document.addEventListener('pointerdown', unlockAudio);

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = !!v;
  try { localStorage.setItem('realm:mute', muted ? '1' : '0'); } catch {}
  if (muted) stopNarration();
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
    a.addEventListener('error', () => { a._dead = true; });   // not on disk (yet)
    a.src = MUSIC(name);
    a.volume = 0;
    pool[name] = a;
  }
  return a;
}

/* crossfade to a track. If it's already playing we leave it be (no restart);
   otherwise the new track fades in while the old one fades out. Because each
   track keeps its own paused element, returning to one resumes mid-song.

   `fallback` names a track to use instead when this one isn't in the build —
   the screens wired to music from tools/generate-music.js name one that
   already ships, so an ungenerated track is never a silent screen. */
export function playMusic(name, vol = 0.28, fallback = null) {
  const next = track(name);
  if (next._dead) return fallback ? playMusic(fallback, vol) : undefined;
  musicVol = vol;
  if (curName === name && curEl) {                 // already on this track
    if (curEl.paused) curEl.play().catch(() => {});
    if (!muted) fade(curEl, vol, 300);
    return;
  }
  if (fallback && !next._fbk) {                    // first time we've asked for it
    next._fbk = true;
    next.addEventListener('error', () => {
      if (curName !== name) return;                // we've since moved on
      curEl = null; curName = '';
      playMusic(fallback, vol);
    }, { once: true });
  }
  const out = curEl;
  curEl = next; curName = name;
  next.play().catch(() => {});                     // resumes from where it paused
  if (!muted) fade(next, vol, 500); else next.volume = 0;
  if (out && out !== next) fade(out, 0, 500, () => { try { out.pause(); } catch {} });
}
export function stopMusic() {
  if (curEl) { const out = curEl; fade(out, 0, 350, () => { try { out.pause(); } catch {} }); }
  curEl = null; curName = '';
}

/* Per-file trim for the sampled roars and stingers in assets/audio/.
   Measured, not guessed — open tools/measure-sfx.html and press "Measure roars".
   `g` scales the level: these arrived 21 dB apart, so Clubbo's defeat bellowed
   while Flick's chirp was inaudible. `at` skips lead-in silence, which several
   files open with — Flick's is 1.24s of nothing before 0.2s of sound, so its
   roar used to land well after the tap that asked for it. */
const ROAR = {
  'flick_entrance.wav': { g: 2.2, at: 1.21 },
  'snapper_entrance.wav': { g: 1.38, at: 0.66 },
  'stinger_entrance.wav': { g: 1.18, at: 0.13 },
  'roger-dodger_entrance.wav': { g: 1.17 },
  'chocker_entrance.wav': { g: 0.99, at: 0.14 },
  'shatter.wav': { g: 0.88 },
  'fixie_entrance.wav': { g: 0.88 },
  'diver_entrance.wav': { g: 0.75, at: 0.96 },
  'bo_entrance.wav': { g: 0.71 },
  'creeper_entrance.wav': { g: 0.71 },
  'chunky_entrance.wav': { g: 0.71, at: 0.63 },
  'spell_break.wav': { g: 0.7 },
  'catch.wav': { g: 0.68 },
  'minyar_entrance.wav': { g: 0.63 },
  'zappo_entrance.wav': { g: 0.61, at: 0.7 },
  'glob_entrance.wav': { g: 0.6, at: 0.31 },
  'sixter_entrance.wav': { g: 0.6 },
  'gus_entrance.wav': { g: 0.59 },
  'fygar_entrance.wav': { g: 0.57 },
  'yellogen_entrance.wav': { g: 0.53, at: 0.24 },
  'whipper_entrance.wav': { g: 0.51 },
  'glob_enrage.wav': { g: 0.46 },
  'swack_entrance.wav': { g: 0.43 },
  'cliggy_entrance.wav': { g: 0.43, at: 0.49 },
  'skyjumper_entrance.wav': { g: 0.41 },
  'demonder_entrance.wav': { g: 0.4 },
  'glob_laugh.wav': { g: 0.39 },
  'minyar_defeat.wav': { g: 0.38 },
  'glob_defeat.wav': { g: 0.36 },
  'waterwolf_entrance.wav': { g: 0.36 },
  'demonder_defeat.wav': { g: 0.34 },
  'chomper_entrance.wav': { g: 0.33 },
  'fertle_entrance.wav': { g: 0.32 },
  'yelp_entrance.wav': { g: 0.32 },
  'peeta-heater_entrance.wav': { g: 0.29, at: 0.29 },
  'clubbo_entrance.wav': { g: 0.28 },
  'crown_crack.wav': { g: 0.24 },
  'clubbo_defeat.wav': { g: 0.2 },
};

/* play a sampled file (used for the creatures' own entrance roars) */
export function sfx(file, vol = 0.8) {
  if (!file || muted) return;
  const t = ROAR[file];
  try {
    // a media fragment starts playback past the silence with no seek
    const a = new Audio(AUDIO(file) + (t && t.at ? `#t=${t.at}` : ''));
    a.volume = clamp(vol * (t ? t.g : 1), 0, 1);
    a.play().catch(() => {});
  } catch {}
}
/* one-shot stinger from the Music folder (e.g. a boss's musical entrance) */
export function sfxMusic(file, vol = 0.8) {
  if (!file || muted) return;
  try { const a = new Audio(MUSIC(file)); a.volume = vol; a.play().catch(() => {}); } catch {}
}
/* ── spoken story ─────────────────────────────────────────────────
   Recorded by tools/generate-voice.js from the same text data.js hands the
   screen, so a line always says what it shows. Only ids in the manifest are
   fetched, so an unrecorded line is silent rather than a 404 — and the story
   still reads perfectly with the sound off. */
let voiceIds = new Set();
let narrEl = null;

fetch('assets/audio/voice/manifest.json')
  .then(r => (r.ok ? r.json() : []))
  .then(list => { if (Array.isArray(list)) voiceIds = new Set(list); })
  .catch(() => {});

export const hasVoice = id => voiceIds.has(id);

/* Music sits under the narration, so pull it down while someone is talking. */
function duck(on) {
  if (!curEl || muted) return;
  fade(curEl, on ? musicVol * 0.3 : musicVol, on ? 250 : 500);
}

/* Speak one line. Any line already playing is cut off — advancing the story
   should never leave two voices overlapping. */
export function narrate(id) {
  stopNarration();
  if (!id || muted || !voiceIds.has(id)) return;
  try {
    const a = new Audio(VOICE(id));
    a.volume = 1;
    narrEl = a;
    duck(true);
    const done = () => { if (narrEl === a) { narrEl = null; duck(false); } };
    a.addEventListener('ended', done, { once: true });
    a.addEventListener('error', done, { once: true });
    a.play().catch(done);
  } catch { narrEl = null; duck(false); }
}

export function stopNarration() {
  if (!narrEl) return;
  try { narrEl.pause(); } catch {}
  narrEl = null;
  duck(false);
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
/* ── sampled cues: assets/audio/sfx/<name>.mp3, synth until they exist ──
   Generated by tools/generate-sfx.js (ElevenLabs), which also writes the
   manifest. A cue plays its sample once that file is decoded and falls back
   to the synth voice below until then — so cues can be added one at a time,
   and a cue that is never generated simply keeps its synth. The manifest
   gates the fetches so unmade cues never 404 in the console. */
const SFX_DIR = 'assets/audio/sfx/';
const sampleBuf = Object.create(null);   // name → AudioBuffer (null = in flight)
let sampleNames = new Set();             // what the manifest says is on disk

function loadSample(name) {
  if (name in sampleBuf) return;         // already loaded or loading
  const c = ac(); if (!c) return;
  sampleBuf[name] = null;
  fetch(SFX_DIR + name + '.mp3')
    .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('404'))))
    .then(b => c.decodeAudioData(b))
    .then(buf => { sampleBuf[name] = buf; })
    .catch(() => { delete sampleBuf[name]; sampleNames.delete(name); });
}
function preloadSamples() { sampleNames.forEach(loadSample); }

fetch(SFX_DIR + 'manifest.json')
  .then(r => (r.ok ? r.json() : []))
  .then(list => {
    if (!Array.isArray(list)) return;
    sampleNames = new Set(list);
    if (audioOn) preloadSamples();       // the first tap may already have gone by
  })
  .catch(() => {});

/* true if the cue had a decoded sample and it is now playing.
   `clip` optionally plays a window of the file: { at } skips lead-in silence so
   the cue lands the instant it fires, { dur } stops before a second take. */
function playSample(name, vol, clip) {
  const buf = sampleBuf[name];
  if (!buf) { if (sampleNames.has(name)) loadSample(name); return false; }
  const c = ac(); if (!c) return false;
  const s = c.createBufferSource(); s.buffer = buf;
  const g = c.createGain(); g.gain.value = vol;
  s.connect(g).connect(c.destination);
  if (clip) s.start(0, clip.at || 0, clip.dur); else s.start();
  return true;
}

/* A cue: its generated take if there is one, else the built-in synth.

   `vol` is the sample's playback gain, and the numbers below are measured, not
   guessed — open tools/measure-sfx.html over a local server to re-derive them.
   The generated files land anywhere from −27 dB to −3 dB depending on what the
   model felt like, so without this a boss slam is 20 dB louder than a star. Gain
   above 1 is safe where a file is quiet: each is capped so peak × gain stays
   under 1. Regenerating a cue means re-measuring it. */
const cue = (name, synth, vol = 0.7, clip = null) => () => {
  if (muted) return;
  if (!playSample(name, vol, clip)) synth();
};

/* Memory Echo's four pads: fixed pitches, so four cues rather than one */
const RUNE = [
  cue('rune_1', () => tone({ f: 330, dur: 0.16, type: 'sine', vol: 0.22 }), 1.33),
  cue('rune_2', () => tone({ f: 440, dur: 0.16, type: 'sine', vol: 0.22 }), 4.1),
  cue('rune_3', () => tone({ f: 554, dur: 0.16, type: 'sine', vol: 0.22 }), 0.4, { at: 0.21 }),
  cue('rune_4', () => tone({ f: 660, dur: 0.16, type: 'sine', vol: 0.22 }), 0.52, { at: 0.14 }),
];

/* named one-shots */

export const S = {
  tick:  cue('tick', () => tone({ f: 540, dur: 0.05, type: 'square', vol: 0.18 }), 0.26),
  go:    cue('go', () => { tone({ f: 660, f2: 990, dur: 0.18, type: 'sawtooth', vol: 0.25 }); tone({ f: 990, dur: 0.18, delay: 0.04, vol: 0.18 }); }, 0.79),
  ui:    cue('ui', () => tone({ f: 480, dur: 0.06, type: 'triangle', vol: 0.16 }), 0.46),
  hit:   cue('hit', () => { noise({ dur: 0.13, vol: 0.32, lp: 1600 }); tone({ f: 160, f2: 60, dur: 0.12, type: 'square', vol: 0.22 }); }, 2.52),
  good:  cue('good', () => { tone({ f: 620, dur: 0.07, type: 'square', vol: 0.2 }); tone({ f: 930, dur: 0.09, delay: 0.06, type: 'square', vol: 0.18 }); }, 0.99),
  bad:   cue('bad', () => tone({ f: 200, f2: 90, dur: 0.22, type: 'sawtooth', vol: 0.22 }), 0.25),
  star:  cue('star', () => { tone({ f: 1180, dur: 0.07, type: 'triangle', vol: 0.2 }); tone({ f: 1760, dur: 0.1, delay: 0.05, type: 'triangle', vol: 0.16 }); }, 1.89),
  swipe: cue('swipe', () => { noise({ dur: 0.16, vol: 0.22, lp: 3500, hp: 600 }); tone({ f: 300, f2: 760, dur: 0.14, type: 'sine', vol: 0.14 }); }, 0.37, { at: 0.09 }),
  splash:cue('splash', () => { noise({ dur: 0.3, vol: 0.3, lp: 1400, hp: 300 }); tone({ f: 380, f2: 120, dur: 0.25, type: 'sine', vol: 0.16 }); }, 1.26),
  win:   cue('win', () => [523, 659, 784, 1047].forEach((f, i) => tone({ f, dur: 0.16, delay: i * 0.1, type: 'triangle', vol: 0.24 })), 0.96),
  /* a regal brass-y sting (announces the King) */
  fanfare: cue('fanfare', () => {
    [392, 523, 659].forEach((f, i) => tone({ f, dur: 0.14, delay: i * 0.13, type: 'sawtooth', vol: 0.2, release: 0.1 }));
    tone({ f: 784, dur: 0.5, delay: 0.39, type: 'sawtooth', vol: 0.22, release: 0.3 });
    tone({ f: 392, dur: 0.5, delay: 0.39, type: 'triangle', vol: 0.16, release: 0.3 });
  }, 1),
  lose:  cue('lose', () => [392, 330, 262].forEach((f, i) => tone({ f, dur: 0.22, delay: i * 0.12, type: 'sawtooth', vol: 0.22 })), 0.57),
  /* cues that used to borrow another sound — now their own, synth included */
  combo: cue('combo', () => { tone({ f: 880, dur: 0.07, type: 'square', vol: 0.18 }); tone({ f: 1320, dur: 0.09, delay: 0.05, type: 'square', vol: 0.16 }); }, 1.81),
  badge: cue('badge', () => [659, 880, 1319].forEach((f, i) => tone({ f, dur: 0.14, delay: i * 0.09, type: 'triangle', vol: 0.2 })), 1.43),
  /* the stars stamping onto a result card, one at a time */
  starPop: cue('star_pop', () => { tone({ f: 990, dur: 0.08, type: 'triangle', vol: 0.22 }); tone({ f: 1480, dur: 0.12, delay: 0.05, type: 'triangle', vol: 0.18 }); }, 1.97, { dur: 0.36 }),
  /* a whole region freed — grander than a single duel win */
  regionClear: cue('region_clear', () => {
    [523, 659, 784].forEach((f, i) => tone({ f, dur: 0.16, delay: i * 0.12, type: 'triangle', vol: 0.22 }));
    tone({ f: 1047, dur: 0.6, delay: 0.36, type: 'triangle', vol: 0.24, release: 0.35 });
  }, 0.95),
  boxOpen: cue('box_open', () => { noise({ dur: 0.12, vol: 0.2, lp: 4000, hp: 800 }); [784, 988, 1319].forEach((f, i) => tone({ f, dur: 0.14, delay: 0.06 + i * 0.08, type: 'triangle', vol: 0.2 })); }, 7.23, { at: 0.41 }),
  heart: cue('heart', () => [523, 659, 784, 880].forEach((f, i) => tone({ f, dur: 0.18, delay: i * 0.07, type: 'sine', vol: 0.2, release: 0.14 })), 0.74),
  /* UI: a confirm and a softer, rounder back */
  uiBack: cue('ui_back', () => tone({ f: 320, f2: 240, dur: 0.07, type: 'triangle', vol: 0.14 }), 0.2),
  whoosh: cue('whoosh', () => noise({ dur: 0.18, vol: 0.1, lp: 2600, hp: 500 }), 0.12),
  /* boss telegraphs — the warning had no sound at all before */
  bossWarn: cue('boss_warn', () => tone({ f: 300, f2: 220, dur: 0.14, type: 'square', vol: 0.14 }), 0.14),
  bossSlam: cue('boss_slam', () => { noise({ dur: 0.24, vol: 0.34, lp: 900 }); tone({ f: 110, f2: 45, dur: 0.22, type: 'square', vol: 0.26 }); }, 0.36),
  /* shooting games: the shot itself, not the impact */
  shoot: cue('shoot', () => { noise({ dur: 0.07, vol: 0.16, lp: 5000, hp: 1200 }); tone({ f: 900, f2: 1600, dur: 0.07, type: 'triangle', vol: 0.16 }); }, 0.43),
  reload: cue('reload', () => { tone({ f: 260, dur: 0.05, type: 'square', vol: 0.14 }); tone({ f: 340, dur: 0.05, delay: 0.12, type: 'square', vol: 0.14 }); }, 0.61),

  /* ── menus ───────────────────────────────────────────────────── */
  start: cue('start', () => { tone({ f: 523, dur: 0.12, type: 'triangle', vol: 0.2 }); tone({ f: 784, dur: 0.22, delay: 0.1, type: 'triangle', vol: 0.2, release: 0.16 }); }, 2.11),
  select: cue('select', () => tone({ f: 620, dur: 0.05, type: 'sine', vol: 0.14 }), 0.19),
  toggle: cue('toggle', () => tone({ f: 400, f2: 520, dur: 0.05, type: 'square', vol: 0.14 }), 0.23),

  /* ── one per minigame: the thing that game is about ──────────── */
  logRoll:      cue('log_roll', () => tone({ f: 190, f2: 140, dur: 0.07, type: 'triangle', vol: 0.16 }), 0.4),
  orbPop:       cue('orb_pop', () => { tone({ f: 840, f2: 1260, dur: 0.06, type: 'triangle', vol: 0.18 }); }, 0.9),
  bomb:         cue('bomb', () => { noise({ dur: 0.22, vol: 0.3, lp: 800 }); tone({ f: 120, f2: 45, dur: 0.2, type: 'square', vol: 0.22 }); }, 0.65),
  starCatch:    cue('star_catch', () => { tone({ f: 900, dur: 0.06, type: 'triangle', vol: 0.18 }); tone({ f: 1350, dur: 0.08, delay: 0.04, type: 'triangle', vol: 0.14 }); }, 0.51),
  blast:        cue('blast', () => { noise({ dur: 0.16, vol: 0.26, lp: 2400 }); tone({ f: 320, f2: 90, dur: 0.2, type: 'sawtooth', vol: 0.22 }); }, 0.64),
  clawGrab:     cue('claw_grab', () => { tone({ f: 300, dur: 0.04, type: 'square', vol: 0.16 }); tone({ f: 1100, dur: 0.05, delay: 0.05, type: 'square', vol: 0.12 }); }, 0.74),
  hop:          cue('hop', () => tone({ f: 300, f2: 620, dur: 0.09, type: 'sine', vol: 0.18 }), 0.36),
  diveSlam:     cue('dive_slam', () => { noise({ dur: 0.18, vol: 0.28, lp: 1100 }); tone({ f: 180, f2: 60, dur: 0.16, type: 'square', vol: 0.2 }); }, 3.48),
  dodgeHit:     cue('dodge_hit', () => { noise({ dur: 0.11, vol: 0.28, lp: 1500 }); tone({ f: 170, f2: 70, dur: 0.1, type: 'square', vol: 0.2 }); }, 0.39),
  caught:       cue('caught', () => { tone({ f: 660, f2: 200, dur: 0.28, type: 'sawtooth', vol: 0.22 }); }, 0.59),
  flap:         cue('flap', () => noise({ dur: 0.1, vol: 0.14, lp: 1800, hp: 300 }), 0.16),
  cloudPass:    cue('cloud_pass', () => { noise({ dur: 0.12, vol: 0.12, lp: 3200, hp: 700 }); tone({ f: 1050, dur: 0.07, delay: 0.03, type: 'triangle', vol: 0.12 }); }, 0.48),
  tileHop:      cue('tile_hop', () => noise({ dur: 0.06, vol: 0.16, lp: 2600, hp: 500 }), 0.25),
  tileBurst:    cue('tile_burst', () => { noise({ dur: 0.26, vol: 0.26, lp: 2000, hp: 200 }); tone({ f: 240, f2: 90, dur: 0.18, type: 'sawtooth', vol: 0.16 }); }, 0.41),
  curlSlide:    cue('curl_slide', () => noise({ dur: 0.5, vol: 0.14, lp: 1400, hp: 200 }), 1.02),
  bullseye:     cue('bullseye', () => { tone({ f: 1050, dur: 0.07, type: 'triangle', vol: 0.2 }); tone({ f: 1580, dur: 0.12, delay: 0.06, type: 'triangle', vol: 0.16 }); }, 4.78),
  rune:         i => RUNE[i % 4](),
  paddleBounce: cue('paddle_bounce', () => tone({ f: 480, dur: 0.04, type: 'square', vol: 0.16 }), 0.34),
  brickBreak:   cue('brick_break', () => { noise({ dur: 0.09, vol: 0.22, lp: 4000, hp: 800 }); tone({ f: 700, f2: 400, dur: 0.07, type: 'square', vol: 0.14 }); }, 1.16),
  pedal:        cue('pedal', () => tone({ f: 260, f2: 200, dur: 0.05, type: 'square', vol: 0.14 }), 0.31),
  wailLock:     cue('wail_lock', () => tone({ f: 1180, dur: 0.09, type: 'sine', vol: 0.14, release: 0.1 }), 0.37),
  strikeGreen:  cue('strike_green', () => { noise({ dur: 0.1, vol: 0.2, lp: 2200 }); tone({ f: 200, f2: 80, dur: 0.14, type: 'square', vol: 0.22 }); }, 0.56),
  drawSignal:   cue('draw_signal', () => { tone({ f: 1320, dur: 0.09, type: 'square', vol: 0.24 }); }, 0.97),
  /* fired on a timer while the reel is turning, so it ratchets */
  reelTick:     cue('reel_tick', () => tone({ f: 420, f2: 300, dur: 0.03, type: 'square', vol: 0.1 }), 0.35),
  reelLand:     cue('reel_land', () => { noise({ dur: 0.18, vol: 0.2, lp: 1600, hp: 300 }); tone({ f: 700, f2: 1100, dur: 0.12, delay: 0.08, type: 'triangle', vol: 0.18 }); }, 0.96),
  ropeJump:     cue('rope_jump', () => noise({ dur: 0.08, vol: 0.14, lp: 2200, hp: 400 }), 0.4),
  ropePass:     cue('rope_pass', () => noise({ dur: 0.1, vol: 0.16, lp: 4000, hp: 900 }), 0.41),
  screechLaunch:cue('screech_launch', () => tone({ f: 700, f2: 2200, dur: 0.16, type: 'sawtooth', vol: 0.16 }), 0.46),
  crystalBurst: cue('crystal_burst', () => { noise({ dur: 0.14, vol: 0.22, lp: 6000, hp: 1500 }); tone({ f: 1600, f2: 900, dur: 0.1, type: 'triangle', vol: 0.14 }); }, 2.14),
  slabThread:   cue('slab_thread', () => noise({ dur: 0.14, vol: 0.16, lp: 2600, hp: 400 }), 0.18),
  slingThwack:  cue('sling_thwack', () => { noise({ dur: 0.08, vol: 0.24, lp: 1800 }); tone({ f: 220, f2: 90, dur: 0.09, type: 'square', vol: 0.18 }); }, 1.09),
  orbEat:       cue('orb_eat', () => tone({ f: 500, f2: 900, dur: 0.07, type: 'sine', vol: 0.18 }), 0.41),
  arrowShow:    cue('arrow_show', () => tone({ f: 700, dur: 0.04, type: 'square', vol: 0.14 }), 0.4),
  swipeOk:      cue('swipe_ok', () => { noise({ dur: 0.08, vol: 0.16, lp: 4000, hp: 900 }); tone({ f: 880, dur: 0.06, delay: 0.03, type: 'square', vol: 0.16 }); }, 0.43),
  traceDot:     cue('trace_dot', () => tone({ f: 900, dur: 0.04, type: 'sine', vol: 0.14 }), 0.17),
  runeDone:     cue('rune_done', () => { [700, 950, 1300].forEach((f, i) => tone({ f, dur: 0.1, delay: i * 0.06, type: 'triangle', vol: 0.18 })); }, 1.47),
  tug:          cue('tug', () => tone({ f: 170, f2: 130, dur: 0.06, type: 'sawtooth', vol: 0.14 }), 0.26),
  linkSnap:     cue('link_snap', () => { tone({ f: 900, f2: 300, dur: 0.06, type: 'square', vol: 0.18 }); noise({ dur: 0.07, vol: 0.14, lp: 5000, hp: 1200 }); }, 0.63),
  /* pitch-continuous by design — a fixed sample can't stand in for these */
  charge:lvl => tone({ f: 200 + lvl * 700, dur: 0.05, type: 'sawtooth', vol: 0.12 }),
  note:  f => tone({ f, dur: 0.2, type: 'triangle', vol: 0.24, release: 0.12 })
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
