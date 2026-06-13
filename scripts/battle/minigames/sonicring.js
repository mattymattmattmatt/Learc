/* Banshee Wail — Yellogen's signature is its voice, so SING.
   A glowing pitch line flows in from the right; DRAG up and down to keep your
   wail riding on the line. Time spent on-pitch fills the wail meter — fill it
   to out-sing the foe. Notes ring out as you hold the line. */
import { clamp, loop, rand, sfx, buzz, petImg, S } from '../util.js';

const SCALE = [330, 392, 440, 494, 587, 659, 784];   // pentatonic-ish, low→high

export default {
  id: 'sonicring', name: 'Banshee Wail', icon: '🎤',
  howto: 'Drag UP & DOWN to keep your wail riding the line. Stay on pitch to fill the meter!',

  play(area, ctx) {
    return new Promise(resolve => {
      const TIME = 15;
      const need = 0.5;                                          // fraction on-pitch to win
      const tol = clamp(0.13 - ctx.difficulty * 0.004, 0.065, 0.13);  // height leniency
      const lead = 2.4, nowF = 0.2, N = 38;
      // a smooth wandering pitch contour in [0.12, 0.88]
      const a1 = 0.30, a2 = 0.15, w1 = 1.0 + ctx.difficulty * 0.05, w2 = 2.3 + ctx.difficulty * 0.06, ph1 = rand(0, 6.28), ph2 = rand(0, 6.28);
      const contour = t => clamp(0.5 + a1 * Math.sin(t * w1 + ph1) + a2 * Math.sin(t * w2 + ph2), 0.12, 0.88);

      area.innerHTML = `
        <div class="bw-hud"><span>🎤 Wail</span><div class="bw-meter"><div class="bw-fill" id="fill"></div></div></div>
        <div class="bw-field" id="field">
          <svg class="bw-svg" id="svg" preserveAspectRatio="none"></svg>
          <div class="bw-now" id="now"></div>
          <div class="bw-target" id="tgt"></div>
          <div class="bw-bird" id="bird"><img src="${petImg(ctx.hero)}" draggable="false"></div>
        </div>
        <div class="dg-hint">Drag up & down to keep your wail on the line!</div>`;
      const field = area.querySelector('#field'), svg = area.querySelector('#svg'), nowEl = area.querySelector('#now');
      const tgt = area.querySelector('#tgt'), bird = area.querySelector('#bird'), fillEl = area.querySelector('#fill');
      const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
      poly.setAttribute('class', 'bw-line'); svg.appendChild(poly);

      let W = 0, H = 0;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; svg.setAttribute('width', W); svg.setAttribute('height', H); nowEl.style.left = (nowF * W) + 'px'; };
      measure(); window.addEventListener('resize', measure);

      let pH = 0.5, dragging = false;
      const setFromPointer = e => { const r = field.getBoundingClientRect(); pH = clamp(1 - (e.clientY - r.top) / H, 0.05, 0.95); };
      const down = e => { dragging = true; setFromPointer(e); e.preventDefault(); };
      const move = e => { if (dragging) { setFromPointer(e); e.preventDefault(); } };
      const up = () => { dragging = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      let t = 0, onTime = 0, noteAcc = 0, done = false;
      const winTime = TIME * need;

      const stop = loop(dt => {
        if (done) return false;
        t += dt;
        let pts = '';
        for (let i = 0; i <= N; i++) { const f = i / N; const x = nowF * W + f * (W - nowF * W); const y = (1 - contour(t + f * lead)) * H; pts += x + ',' + y + ' '; }
        poly.setAttribute('points', pts);
        const tH = contour(t);
        tgt.style.left = (nowF * W) + 'px'; tgt.style.top = ((1 - tH) * H) + 'px';
        bird.style.left = (nowF * W) + 'px'; bird.style.top = ((1 - pH) * H) + 'px';
        const on = Math.abs(pH - tH) <= tol;
        bird.classList.toggle('on', on);
        tgt.classList.toggle('on', on);
        if (on) { onTime += dt; noteAcc -= dt; if (noteAcc <= 0) { noteAcc = 0.16; S.note(SCALE[Math.round(pH * (SCALE.length - 1))]); buzz(6); } }
        fillEl.style.width = clamp(onTime / winTime * 100, 0, 100) + '%';
        if (t >= TIME) return end(onTime >= winTime);
      });

      function end(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('resize', measure);
        if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 60);
        resolve({ win, stars: win ? (onTime / TIME >= 0.72 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
