/* util.js — shared helpers for Battle of the Realm
   Pure helpers + a tiny audio layer. Everything fails soft. */

export const SPRITE = p => `assets/img/characters/${p}`;
export const AUDIO  = f => `assets/audio/${f}`;
export const KING_GIF = 'assets/img/king_intro.gif';
/* image URL for a combatant (creatures or the King) */
export const petImg = pet => (pet && pet.king ? KING_GIF : SPRITE(pet.sprite));

/* ── math / rng ───────────────────────────────────────────────── */
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const rand  = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const pick = arr => arr[(Math.random() * arr.length) | 0];
export function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = (Math.random()*(i+1))|0; [b[i],b[j]]=[b[j],b[i]]; } return b; }
export const starsByRatio = r => (r >= 0.95 ? 3 : r >= 0.6 ? 2 : 1);

/* ── audio (unlocked on first user gesture) ───────────────────── */
let audioOn = false, music = null, musicName = '';
export function unlockAudio() {
  if (audioOn) return; audioOn = true;
  document.removeEventListener('pointerdown', unlockAudio);
}
document.addEventListener('pointerdown', unlockAudio);

export function playMusic(name, vol = 0.28) {
  if (musicName === name && music) return;
  stopMusic(); musicName = name;
  const a = new Audio(AUDIO(name)); a.loop = true; a.volume = vol;
  a.addEventListener('error', () => {});
  music = a; a.play().catch(() => {});
}
export function stopMusic() { try { music?.pause(); } catch {} music = null; musicName = ''; }

export function sfx(file, vol = 0.8) {
  if (!file) return;
  try { const a = new Audio(AUDIO(file)); a.volume = vol; a.play().catch(() => {}); } catch {}
}
export const buzz = ms => { try { navigator.vibrate?.(ms); } catch {} };

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
      sfx(null);
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
