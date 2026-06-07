/* Target Blitz — tap the glowing orbs before they vanish. Hit the goal
   before time runs out. Watch for bombs 💣 — tapping one costs you! */
import { el, clamp, loop, rand, sfx, buzz, sparkle } from '../util.js';

export default {
  id: 'blitz', name: 'Target Blitz', icon: '💥',
  howto: 'TAP the glowing orbs fast! Reach the goal before time runs out. Avoid the bombs 💣!',

  play(area, ctx) {
    return new Promise(resolve => {
      const goal = 10 + ctx.difficulty;            // hits needed
      const TIME = 16;
      let score = 0, left = TIME, done = false;

      area.innerHTML = `
        <div class="bz-hud">
          <span>🎯 <b id="sc">0</b>/${goal}</span>
          <div class="bz-time"><div class="bz-fill" id="tf"></div></div>
        </div>
        <div class="bz-field" id="field"></div>`;
      const field = area.querySelector('#field'), scEl = area.querySelector('#sc'), tf = area.querySelector('#tf');

      let W = 0, H = 0;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; };
      measure(); window.addEventListener('resize', measure);

      const targets = [];
      const life = clamp(1.25 - ctx.difficulty * 0.07, 0.55, 1.25);
      const size = clamp(74 - ctx.difficulty * 2.4, 44, 74);
      const bombChance = clamp((ctx.difficulty - 3) * 0.05, 0, 0.32);
      let acc = 0, every = clamp(0.62 - ctx.difficulty * 0.03, 0.28, 0.62);

      function spawn() {
        const bomb = Math.random() < bombChance;
        const t = el('button', 'bz-orb' + (bomb ? ' bomb' : ''), bomb ? '💣' : '⭐');
        const s = size * (bomb ? 1 : rand(0.85, 1.1));
        const x = rand(0, Math.max(0, W - s)), y = rand(0, Math.max(0, H - s));
        t.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px`;
        t.onpointerdown = e => {
          e.preventDefault();
          if (done || t._gone) return; t._gone = true;
          const cx = x + s / 2, cy = y + s / 2;
          if (bomb) { score = Math.max(0, score - 2); buzz(70); sfx(ctx.foe.sfx, 0.6); t.classList.add('boom'); }
          else { score++; buzz(15); sfx(null); sparkle(field, cx, cy, 6); t.classList.add('pop'); }
          scEl.textContent = score;
          setTimeout(() => t.remove(), 160);
          remove(t);
          if (score >= goal) end(true);
        };
        field.appendChild(t);
        targets.push({ t, die: performance.now() + life * 1000 });
      }
      function remove(node) { const i = targets.findIndex(o => o.t === node); if (i >= 0) targets.splice(i, 1); }

      const stop = loop((dt, now) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        acc += dt; if (acc >= every) { acc = 0; spawn(); }
        for (let i = targets.length - 1; i >= 0; i--) {
          if (now >= targets[i].die) { targets[i].t.remove(); targets.splice(i, 1); }
        }
        if (left <= 0) return end(score >= goal);
      });

      function end(win) {
        if (done) return false; done = true;
        stop(); window.removeEventListener('resize', measure);
        targets.forEach(o => o.t.remove());
        sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7); buzz(win ? 30 : 60);
        const ratio = clamp((TIME - 0) ? left / TIME : 0, 0, 1);
        resolve({ win, stars: win ? (left > TIME * 0.45 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
