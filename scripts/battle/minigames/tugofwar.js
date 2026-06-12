/* Tug of War — mash TAP to pull the rope. The foe pulls back harder as
   difficulty rises. Pull the marker to your side before time runs out. */
import { clamp, loop, sfx, buzz, S } from '../util.js';
import { stageHTML } from './stage.js';

export default {
  id: 'tugofwar', name: 'Tug of War', icon: '🪢',
  howto: 'TAP as fast as you can! Keep the rope on YOUR side — the more taps, the more stars.',

  play(area, ctx) {
    return new Promise(resolve => {
      area.innerHTML = `
        ${stageHTML(ctx, 'tow')}
        <div class="tow-track"><div class="tow-knot" id="knot">🟡</div>
          <div class="tow-mid"></div></div>
        <div class="tow-time"><div class="tow-fill" id="tf"></div></div>
        <div class="tow-taps">Taps: <b id="taps">0</b></div>
        <button class="tap-pad" id="pad">TAP!</button>`;
      const knot = area.querySelector('#knot'), tf = area.querySelector('#tf');
      const pad = area.querySelector('#pad'), tapsEl = area.querySelector('#taps');

      let pos = 0;                        // -1 (foe) .. +1 (you)
      const TIME = 16;
      let left = TIME, done = false, taps = 0;
      const pull = 0.05;
      const foeRate = clamp(0.17 + ctx.difficulty * 0.045, 0, 0.4);   // 0.4 ≈ 8 taps/s just to hold — mash ceiling

      const place = () => { knot.style.left = (50 + pos * 46) + '%'; };
      place();

      const onPad = e => {
        e.preventDefault();
        pos = clamp(pos + pull, -1, 1);
        taps++; tapsEl.textContent = taps;
        pad.classList.remove('mash'); void pad.offsetWidth; pad.classList.add('mash');
        if (Math.random() < 0.4) S.tick();
      };
      pad.addEventListener('pointerdown', onPad);

      const stop = loop((dt) => {
        if (done) return false;
        pos = clamp(pos - foeRate * dt, -1, 1);
        left -= dt;
        tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        place();
        // no early win — keep mashing for as many taps as you can
        if (pos <= -1) { return end(false); }      // foe drags you all the way over
        if (left <= 0) { return end(pos > 0); }
      });

      function end(win) {
        if (done) return false; done = true;
        pad.removeEventListener('pointerdown', onPad);
        buzz(win ? 30 : 60); if (!win) sfx(ctx.foe.sfx, 0.7);
        // your star rating is how hard you pulled — total taps
        const stars = win ? (taps > 150 ? 3 : taps > 90 ? 2 : 1) : 1;
        resolve({ win, stars });
        return false;
      }
    });
  }
};
