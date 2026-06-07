/* Tug of War — mash TAP to pull the rope. The foe pulls back harder as
   difficulty rises. Pull the marker to your side before time runs out. */
import { clamp, loop, sfx, buzz } from '../util.js';
import { stageHTML } from './_stage.js';

export default {
  id: 'tugofwar', name: 'Tug of War', icon: '🪢',
  howto: 'TAP as fast as you can to pull the rope to YOUR side before time runs out!',

  play(area, ctx) {
    return new Promise(resolve => {
      area.innerHTML = `
        ${stageHTML(ctx, 'tow')}
        <div class="tow-track"><div class="tow-knot" id="knot">🟡</div>
          <div class="tow-mid"></div></div>
        <div class="tow-time"><div class="tow-fill" id="tf"></div></div>
        <button class="tap-pad" id="pad">TAP!</button>`;
      const knot = area.querySelector('#knot'), tf = area.querySelector('#tf');
      const pad = area.querySelector('#pad');

      let pos = 0;                        // -1 (foe) .. +1 (you)
      const TIME = 16;
      let left = TIME, done = false;
      const pull = 0.05;
      const foeRate = 0.17 + ctx.difficulty * 0.045;

      const place = () => { knot.style.left = (50 + pos * 46) + '%'; };
      place();

      const onPad = e => {
        e.preventDefault();
        pos = clamp(pos + pull, -1, 1);
        pad.classList.remove('mash'); void pad.offsetWidth; pad.classList.add('mash');
        if (Math.random() < 0.3) sfx(ctx.hero.sfx, 0.4);
      };
      pad.addEventListener('pointerdown', onPad);

      const stop = loop((dt) => {
        if (done) return false;
        pos = clamp(pos - foeRate * dt, -1, 1);
        left -= dt;
        tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        place();
        if (pos >= 1)  { return end(true); }
        if (pos <= -1) { return end(false); }
        if (left <= 0) { return end(pos > 0); }
      });

      function end(win) {
        if (done) return false; done = true;
        pad.removeEventListener('pointerdown', onPad);
        buzz(win ? 30 : 60); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        const margin = (pos + 1) / 2;      // 0..1
        resolve({ win, stars: win ? (left > TIME * 0.5 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
