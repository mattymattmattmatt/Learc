/* Wriggle Free — the coils are crushing you! Rapidly ALTERNATE tapping LEFT and
   RIGHT to wriggle and shimmy loose. Same side twice does nothing — you have to
   alternate. Fill the escape bar before the squeeze bar fills you. */
import { clamp, loop, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'unwind', name: 'Wriggle Free', icon: '🪱',
  howto: 'Quickly ALTERNATE tapping LEFT ◀ and RIGHT ▶ to wriggle out before you’re crushed!',

  play(area, ctx) {
    return new Promise(resolve => {
      let escape = 0, squeeze = 0, done = false, last = 0;
      const step = 1 / (16 + ctx.difficulty * 1.4);
      const squeezeRate = 0.052 + ctx.difficulty * 0.011;

      area.innerHTML = `
        <div class="wg-bars">
          <div class="wg-bar"><span>Escape</span><div class="wg-track"><div class="wg-fill esc" id="esc"></div></div></div>
          <div class="wg-bar"><span>Squeeze</span><div class="wg-track"><div class="wg-fill sq" id="sq"></div></div></div>
        </div>
        <div class="wg-field" id="field">
          <div class="wg-coil" id="coil"></div>
          <div class="wg-me" id="me"><img src="${petImg(ctx.hero)}"></div>
        </div>
        <div class="wg-pad">
          <button class="wg-half" id="L">◀</button>
          <button class="wg-half" id="R">▶</button>
        </div>`;
      const escEl = area.querySelector('#esc'), sqEl = area.querySelector('#sq');
      const me = area.querySelector('#me'), coil = area.querySelector('#coil');
      const Lb = area.querySelector('#L'), Rb = area.querySelector('#R');

      const tap = side => {
        if (done) return;
        me.classList.remove('l', 'r'); void me.offsetWidth; me.classList.add(side < 0 ? 'l' : 'r');
        if (side !== last) { escape += step; last = side; S.tick(); buzz(12); }
        else { squeeze = clamp(squeeze + 0.01, 0, 1); }  // tiny penalty for not alternating
      };
      const onL = e => { e.preventDefault(); tap(-1); };
      const onR = e => { e.preventDefault(); tap(1); };
      Lb.addEventListener('pointerdown', onL);
      Rb.addEventListener('pointerdown', onR);

      const stop = loop((dt) => {
        if (done) return false;
        squeeze = clamp(squeeze + squeezeRate * dt, 0, 1);
        escEl.style.width = clamp(escape * 100, 0, 100) + '%';
        sqEl.style.width = squeeze * 100 + '%';
        const tight = 1 - escape * 0.6 + squeeze * 0.15;
        coil.style.transform = `translate(-50%,-50%) scale(${clamp(tight, 0.5, 1.3)})`;
        coil.classList.toggle('danger', squeeze > 0.7);
        if (escape >= 1) return finish(true);
        if (squeeze >= 1) return finish(false);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        Lb.removeEventListener('pointerdown', onL); Rb.removeEventListener('pointerdown', onR);
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 80);
        resolve({ win, stars: win ? (squeeze < 0.5 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
