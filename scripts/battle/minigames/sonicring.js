/* Sonic Shatter — sound rings ripple inward. TAP the instant a ring lines up
   with the golden target ring to shatter it. Land enough clean shatters before
   too many slip through. */
import { el, clamp, loop, rand, sfx, buzz, floatText, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'sonicring', name: 'Sonic Shatter', icon: '🔊',
  howto: 'TAP when a shrinking ring matches the golden ring. Perfect timing!',

  play(area, ctx) {
    return new Promise(resolve => {
      const total = 10 + ctx.difficulty;
      const need = 0.6;
      let spawned = 0, hits = 0, judged = 0, combo = 0, done = false;

      area.innerHTML = `
        ${stageHTML(ctx, 'sr')}
        <div class="sr-acc"><span>💥 <b id="acc">0</b>/${total}</span><span id="combo" class="rh-combo"></span></div>
        <div class="sr-field" id="field"><div class="sr-target" id="tg"></div></div>`;
      const field = area.querySelector('#field'), tg = area.querySelector('#tg');
      const accEl = area.querySelector('#acc'), comboEl = area.querySelector('#combo');
      const heroEl = area.querySelector('.hero'), foeEl = area.querySelector('.foe');

      let W = 0, H = 0, cx = 0, cy = 0, TR = 60, tol = 22;
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height; cx = W / 2; cy = H / 2;
        TR = clamp(Math.min(W, H) * 0.15, 42, 86); tol = TR * 0.42;
        tg.style.left = cx + 'px'; tg.style.top = cy + 'px'; tg.style.width = tg.style.height = TR * 2 + 'px';
        field.dataset.tr = TR;
      };
      measure(); window.addEventListener('resize', measure);

      const rings = [];
      const approach = clamp(1.7 - ctx.difficulty * 0.06, 1.0, 1.7);
      const gap = clamp(0.95 - ctx.difficulty * 0.04, 0.5, 0.95);
      let t0 = performance.now(), nextSpawn = 0.5;

      const stop = loop((dt, now) => {
        if (done) return false;
        const elapsed = (now - t0) / 1000;
        if (spawned < total && elapsed >= nextSpawn) {
          spawned++; nextSpawn += gap;
          const n = el('div', 'sr-ring'); n.style.left = cx + 'px'; n.style.top = cy + 'px';
          field.appendChild(n); rings.push({ node: n, born: now, judged: false, r: 0 });
        }
        const R0 = Math.min(W, H) * 0.55;
        for (let i = rings.length - 1; i >= 0; i--) {
          const ring = rings[i]; const p = (now - ring.born) / (approach * 1000); // 0..1
          const r = R0 * (1 - p); ring.r = r;
          ring.node.style.width = ring.node.style.height = Math.max(0, r * 2) + 'px';
          if (!ring.judged && r < TR - tol) { ring.judged = true; judged++; combo = 0; updateCombo(); ring.node.classList.add('miss'); hitFlash(heroEl); S.bad(); cleanup(ring, i); }
        }
        if (judged >= total) return end();
      });
      function updateCombo() { comboEl.textContent = combo >= 2 ? `🔥 ${combo}` : ''; }
      function cleanup(ring, i) { const nn = ring.node; setTimeout(() => nn.remove(), 200); if (i != null) rings.splice(i, 1); }

      const onTap = e => {
        e.preventDefault(); if (done) return;
        let best = null, bd = 1e9, bi = -1;
        rings.forEach((ring, i) => { if (ring.judged) return; const d = Math.abs(ring.r - TR); if (d < bd) { bd = d; best = ring; bi = i; } });
        if (best && bd <= tol) {
          best.judged = true; judged++; hits++; combo++;
          const perfect = bd <= tol * 0.4;
          best.node.classList.add('shatter'); hitFlash(foeEl); buzz(perfect ? 18 : 10); S.star();
          floatText(area, cx, cy - TR, perfect ? 'PERFECT!' : 'good', perfect ? 'good' : '');
          accEl.textContent = hits; updateCombo(); cleanup(best, bi);
        }
      };
      field.addEventListener('pointerdown', onTap);

      function end() {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', onTap); window.removeEventListener('resize', measure);
        rings.forEach(r => r.node.remove());
        const acc = hits / total, win = acc >= need;
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (acc >= 0.9 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
