/* Banshee Wail — Yellogen's game. Yellogen's screech weaves up and down a
   sound-wave; DRAG your wail (the bird) to keep it riding inside the moving
   band. Staying on pitch fills the SHATTER meter; drifting off it drains.
   Fill the meter to shatter Yellogen's screech and win. */
import { el, clamp, loop, sfx, buzz, sparkle, petImg, S } from '../util.js';

export default {
  id: 'pitchwail', name: 'Banshee Wail', icon: '🎶',
  howto: 'DRAG up & down to keep your wail riding inside the weaving sound-wave. Fill the bar to shatter the screech!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const accent = (ctx.theme && ctx.theme.color) || '#ffd23f';
      const TIME = 22;
      const fillRate = 9;
      const drainRate = 9 + d * 0.55;
      const w1 = 0.8 + d * 0.05, w2 = 1.5 + d * 0.085;
      let progress = 0, time = 0, left = TIME, done = false;
      let inFrames = 0, totFrames = 0;

      area.innerHTML = `
        <div class="pw-hud" style="--accent:${accent}">
          <span>🎤 Shatter</span>
          <div class="pw-bar"><div class="pw-fill" id="pf"></div></div>
          <div class="pw-time"><div class="pw-tfill" id="tf"></div></div>
        </div>
        <div class="pw-field" id="field">
          <svg class="pw-svg" id="svg" preserveAspectRatio="none"></svg>
          <div class="pw-nowline" id="nowline"></div>
          <div class="pw-bird" id="bird"><img src="${petImg(ctx.hero)}" draggable="false"></div>
        </div>
        <div class="dg-hint">Keep your wail inside the glowing wave!</div>`;
      const field = area.querySelector('#field'), svg = area.querySelector('#svg');
      const bird = area.querySelector('#bird'), nowline = area.querySelector('#nowline');
      const pf = area.querySelector('#pf'), tf = area.querySelector('#tf');

      let W = 0, H = 0, midY = 0, amp = 0, bandH = 0, birdX = 0, bandPath = null;
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        midY = H * 0.5; amp = H * 0.33;
        bandH = clamp(H * (0.16 - d * 0.006), H * 0.06, H * 0.16);
        birdX = W * 0.28; nowline.style.left = birdX + 'px';
        svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
        svg.innerHTML = '';
        bandPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        bandPath.setAttribute('class', 'pw-wave');
        bandPath.setAttribute('stroke-width', (bandH * 2).toFixed(0));
        svg.appendChild(bandPath);
        bird.style.left = birdX + 'px';
      };
      measure(); window.addEventListener('resize', measure);

      const pps = 110 + d * 8;                       // how fast the wave scrolls in
      const waveY = s => clamp(midY + amp * (Math.sin(s * w1) * 0.6 + Math.sin(s * w2 + 1.7) * 0.4), bandH + 4, H - bandH - 4);

      let by = midY;
      const placeBird = () => { bird.style.top = clamp(by, 10, H - 10) + 'px'; };
      placeBird();
      const moveTo = cy => { const r = field.getBoundingClientRect(); by = clamp(cy - r.top, 10, H - 10); placeBird(); };
      let drag = false;
      const down = e => { drag = true; moveTo(e.clientY); e.preventDefault(); };
      const move = e => { if (drag) { moveTo(e.clientY); e.preventDefault(); } };
      const up = () => { drag = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);

      let sparkAcc = 0;
      const stop = loop(dt => {
        if (done) return false;
        time += dt; left -= dt;
        // draw the upcoming wave (right = future), scrolling toward the now-line
        let pts = '';
        for (let x = 0; x <= W; x += 14) { const s = time + (x - birdX) / pps; pts += `${x},${waveY(s).toFixed(1)} `; }
        if (bandPath) bandPath.setAttribute('points', pts.trim());
        const targetY = waveY(time);
        const inBand = Math.abs(by - targetY) < bandH;
        totFrames++; if (inBand) inFrames++;
        bird.classList.toggle('on', inBand);
        nowline.classList.toggle('on', inBand);
        progress = clamp(progress + (inBand ? fillRate : -drainRate) * dt, 0, 100);
        pf.style.width = progress + '%';
        tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        if (inBand) { sparkAcc += dt; if (sparkAcc > 0.18) { sparkAcc = 0; sparkle(field, birdX, by, 3, ['🎵', '✨']); S.tick(); } }
        if (progress >= 100) return end(true);
        if (left <= 0) return end(false);
      });

      function end(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        window.removeEventListener('resize', measure);
        if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 70);
        const acc = totFrames ? inFrames / totFrames : 0;
        resolve({ win, stars: win ? (acc >= 0.8 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
