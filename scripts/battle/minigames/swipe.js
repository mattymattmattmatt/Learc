/* Swipe Strike — arrows flash up; swipe that direction fast. Land enough
   clean swipes before three misses. Wrong way or too slow = a miss. */
import { clamp, sfx, buzz, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

const ARROWS = { up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️' };
const KEYS = ['up', 'down', 'left', 'right'];

export default {
  id: 'swipe', name: 'Swipe Strike', icon: '🌟',
  howto: 'SWIPE the way each arrow points — up, down, left or right. Be quick!',

  play(area, ctx) {
    return new Promise(resolve => {
      const need = 9 + ctx.difficulty;          // clean swipes to win
      const perArrow = clamp(1600 - ctx.difficulty * 120, 550, 1600);  // ms allowed
      let hits = 0, misses = 0, done = false, cur = null, timer = null, deadline = 0;

      area.innerHTML = `
        ${stageHTML(ctx, 'sw')}
        <div class="sw-score"><span>✅ <b id="hit">0</b>/${need}</span><span id="miss">❌ 0/3</span></div>
        <div class="sw-pad" id="pad"><div class="sw-arrow" id="arrow">—</div>
          <div class="sw-timebar"><div class="sw-tf" id="tf"></div></div></div>`;
      const pad = area.querySelector('#pad'), arrowEl = area.querySelector('#arrow');
      const hitEl = area.querySelector('#hit'), missEl = area.querySelector('#miss'), tf = area.querySelector('#tf');
      const heroEl = area.querySelector('.hero'), foeEl = area.querySelector('.foe');

      function nextArrow() {
        if (done) return;
        cur = KEYS[(Math.random() * 4) | 0];
        arrowEl.textContent = ARROWS[cur];
        arrowEl.classList.remove('pop'); void arrowEl.offsetWidth; arrowEl.classList.add('pop');
        deadline = performance.now() + perArrow;
        clearTimeout(timer);
        timer = setTimeout(() => judge(null), perArrow);
        S.tick();
      }
      // shrink the timer bar
      let raf = 0;
      const animate = () => {
        if (done) return;
        const remain = clamp((deadline - performance.now()) / perArrow, 0, 1);
        tf.style.width = (remain * 100) + '%';
        raf = requestAnimationFrame(animate);
      };
      animate();

      function judge(dir) {
        if (done || cur == null) return;
        const ok = dir === cur;
        clearTimeout(timer);
        const wasCur = cur; cur = null;
        if (ok) { hits++; hitEl.textContent = hits; hitFlash(foeEl); S.good(); buzz(14); }
        else { misses++; missEl.textContent = `❌ ${misses}/3`; hitFlash(heroEl); S.bad(); buzz(50); }
        if (hits >= need) return end(true);
        if (misses >= 3) return end(false);
        setTimeout(nextArrow, 180);
      }

      // swipe detection
      let sx = 0, sy = 0, tracking = false;
      const down = e => { tracking = true; sx = e.clientX; sy = e.clientY; e.preventDefault(); };
      const upH = e => {
        if (!tracking) return; tracking = false;
        const dx = e.clientX - sx, dy = e.clientY - sy;
        const adx = Math.abs(dx), ady = Math.abs(dy);
        if (Math.max(adx, ady) < 24) return;     // too small — ignore (no penalty)
        judge(adx > ady ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      };
      pad.addEventListener('pointerdown', down);
      window.addEventListener('pointerup', upH);

      function end(win) {
        if (done) return; done = true;
        clearTimeout(timer); cancelAnimationFrame(raf);
        pad.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', upH);
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (misses === 0 ? 3 : 2) : 1 });
      }

      setTimeout(nextArrow, 400);
    });
  }
};
