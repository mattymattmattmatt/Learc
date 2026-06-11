/* Echo Smash — Yellogen's squawks burst from a grid of speakers.
   SMASH the sound bursts 🔊 before they fade, but never hit a screech ⚡
   (that costs a heart). Reach the quota before time runs out. */
import { el, clamp, loop, sfx, buzz, sparkle, floatText, S } from '../util.js';

export default {
  id: 'sonicring', name: 'Echo Smash', icon: '🔊',
  howto: 'SMASH the sound bursts 🔊 as they pop up — but never hit a screech ⚡!',

  play(area, ctx) {
    return new Promise(resolve => {
      const COLS = 3, ROWS = 3, N = COLS * ROWS;
      const TIME = 18, goal = 12 + ctx.difficulty;
      let score = 0, hearts = 3, left = TIME, done = false;
      const life = clamp(1.25 - ctx.difficulty * 0.06, 0.55, 1.25);   // seconds a burst stays up
      const gap = clamp(0.85 - ctx.difficulty * 0.05, 0.32, 0.85);    // spawn interval
      const badChance = clamp(0.12 + ctx.difficulty * 0.03, 0.12, 0.45);

      area.innerHTML = `
        <div class="es-hud"><span id="hearts">${'❤'.repeat(hearts)}</span>
          <span>🔊 <b id="sc">0</b>/${goal}</span>
          <div class="es-time"><div class="es-fill" id="tf"></div></div></div>
        <div class="es-grid" id="grid">${Array.from({ length: N }, () => '<div class="es-hole"></div>').join('')}</div>
        <div class="dg-hint">Smash 🔊 — never hit ⚡!</div>`;
      const holes = [...area.querySelectorAll('.es-hole')];
      const scEl = area.querySelector('#sc'), heartsEl = area.querySelector('#hearts'), tf = area.querySelector('#tf');

      const occupied = new Array(N).fill(false);
      const orbs = [];
      let spawnAcc = 0.3;
      const at = orb => { const r = orb.node.getBoundingClientRect(), a = area.getBoundingClientRect(); return [r.left - a.left + r.width / 2, r.top - a.top + r.height / 2]; };

      const popOrb = (idx, bad) => {
        occupied[idx] = true;
        const o = el('div', 'es-orb' + (bad ? ' bad' : ''), bad ? '⚡' : '🔊');
        holes[idx].appendChild(o);
        const orb = { node: o, idx, bad, t: life, gone: false };
        o.addEventListener('pointerdown', e => { e.preventDefault(); if (done || orb.gone) return; smash(orb); });
        orbs.push(orb);
      };
      const removeOrb = (orb, cls) => {
        if (orb.gone) return; orb.gone = true; occupied[orb.idx] = false;
        if (cls) orb.node.classList.add(cls);
        const n = orb.node; setTimeout(() => n.remove(), 160);
        const i = orbs.indexOf(orb); if (i >= 0) orbs.splice(i, 1);
      };
      const smash = orb => {
        const [x, y] = at(orb);
        if (orb.bad) {
          hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts)); S.bad(); buzz(70);
          floatText(area, x, y, '✖', 'bad'); removeOrb(orb, 'boom');
          if (hearts <= 0) return end(false);
        } else {
          score++; scEl.textContent = score; S.star(); buzz(16);
          sparkle(area, x, y, 6); floatText(area, x, y, '+1', 'good'); removeOrb(orb, 'pop');
          if (score >= goal) return end(true);
        }
      };

      const stop = loop(dt => {
        if (done) return false;
        left -= dt; tf.style.width = clamp(left / TIME * 100, 0, 100) + '%';
        spawnAcc -= dt;
        if (spawnAcc <= 0) {
          spawnAcc = gap;
          const free = []; for (let i = 0; i < N; i++) if (!occupied[i]) free.push(i);
          if (free.length) {
            const idx = free[(Math.random() * free.length) | 0];
            popOrb(idx, Math.random() < badChance);
            if (ctx.difficulty >= 6 && free.length > 1 && Math.random() < 0.4) {
              const rest = free.filter(x => x !== idx); const idx2 = rest[(Math.random() * rest.length) | 0];
              popOrb(idx2, Math.random() < badChance);
            }
          }
        }
        for (let i = orbs.length - 1; i >= 0; i--) { const orb = orbs[i]; orb.t -= dt; if (orb.t <= 0) removeOrb(orb, 'fade'); }
        if (left <= 0) return end(score >= goal);
      });

      function end(win) {
        if (done) return false; done = true; stop();
        orbs.forEach(o => o.node.remove());
        if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 60);
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
