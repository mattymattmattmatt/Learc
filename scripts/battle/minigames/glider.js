/* Windrider — ride the gusts! TAP to flap upward; gravity (and the foe's wind)
   pulls you down. Thread through the gaps in the clouds. Clear enough gaps to
   win; three crashes and you're grounded. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, petImg, S } from '../util.js';

export default {
  id: 'glider', name: 'Windrider', icon: '🪁',
  howto: 'TAP to flap upward and glide through the gaps in the clouds!',

  play(area, ctx) {
    return new Promise(resolve => {
      const goal = 8 + Math.floor(ctx.difficulty / 2);   // gaps to clear
      let passed = 0, hearts = 3, done = false;

      area.innerHTML = `
        <div class="gl-hud"><span id="hearts">${'❤'.repeat(hearts)}</span>
          <span>🪁 <b id="sc">0</b>/${goal}</span></div>
        <div class="gl-field" id="field">
          <div class="gl-me" id="me"><img src="${petImg(ctx.hero)}"></div>
        </div>
        <div class="dg-hint">Tap to flap!</div>`;
      const field = area.querySelector('#field'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), scEl = area.querySelector('#sc');

      let W = 0, H = 0, size = 48;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; size = clamp(Math.min(W, H) * 0.14, 38, 64); me.style.width = me.style.height = size + 'px'; me.style.left = (W * 0.26 - size / 2) + 'px'; me.style.top = '0'; };
      measure(); window.addEventListener('resize', measure);

      let y = 0, vy = 0, iframe = 0;
      y = H * 0.4;
      const grav = 1500, flap = -440;
      const speed = 150 + ctx.difficulty * 16;
      const gapH = clamp(H * (0.42 - ctx.difficulty * 0.012), H * 0.21, H * 0.42);

      const walls = [];
      let acc = 0, every = clamp(1.5 - ctx.difficulty * 0.06, 0.78, 1.5);
      function spawn() {
        const gy = rand(gapH * 0.6, H - gapH * 0.6);
        const top = el('div', 'gl-wall'); top.style.cssText = `left:0;top:0;height:${gy - gapH / 2}px;transform:translate3d(${W}px,0,0)`;
        const bot = el('div', 'gl-wall'); bot.style.cssText = `left:0;top:${gy + gapH / 2}px;bottom:0;height:${H - (gy + gapH / 2)}px;transform:translate3d(${W}px,0,0)`;
        field.appendChild(top); field.appendChild(bot);
        walls.push({ top, bot, x: W, gy, scored: false });
      }

      const flapFn = e => { e && e.preventDefault(); if (done) return; vy = flap; me.classList.remove('flap'); void me.offsetWidth; me.classList.add('flap'); S.ui(); };
      field.addEventListener('pointerdown', flapFn);

      const stop = loop((dt) => {
        if (done) return false;
        iframe = Math.max(0, iframe - dt);
        vy += grav * dt; y += vy * dt;
        if (y < size / 2) { y = size / 2; vy = 0; }
        if (y > H - size / 2) { y = H - size / 2; vy = 0; if (iframe <= 0) hit(); }
        me.style.transform = `translate3d(0,${y - size / 2}px,0)`;

        acc += dt; if (acc >= every) { acc = 0; spawn(); }
        const mx = W * 0.26, mr = size * 0.4;
        for (let i = walls.length - 1; i >= 0; i--) {
          const w = walls[i]; w.x -= speed * dt;
          const tx = `translate3d(${w.x}px,0,0)`;
          w.top.style.transform = tx; w.bot.style.transform = tx;
          if (!w.scored && w.x + 28 < mx) { w.scored = true; passed++; scEl.textContent = passed; S.good(); sparkle(field, mx, y, 5); if (passed >= goal) return finish(true); }
          // collision: within wall x-range and outside gap
          if (iframe <= 0 && Math.abs(w.x + 14 - mx) < 14 + mr && (y - mr < w.gy - gapH / 2 || y + mr > w.gy + gapH / 2)) hit();
          if (w.x < -40) { w.top.remove(); w.bot.remove(); walls.splice(i, 1); }
        }
      });

      function hit() {
        if (iframe > 0) return; iframe = 1.0; hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts));
        me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt'); S.hit(); buzz(60); vy = flap * 0.6;
        if (hearts <= 0) finish(false);
      }
      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', flapFn); window.removeEventListener('resize', measure);
        walls.forEach(w => { w.top.remove(); w.bot.remove(); });
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
