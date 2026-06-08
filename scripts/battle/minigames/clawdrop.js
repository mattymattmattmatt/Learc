/* Claw Drop — the crane sweeps back and forth. TAP to drop it straight down
   and snatch a fish. Catch your quota before time runs out! */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, S } from '../util.js';

export default {
  id: 'clawdrop', name: 'Claw Drop', icon: '🦀',
  howto: 'TAP to drop the claw when it lines up with a fish. Snatch your quota!',

  play(area, ctx) {
    return new Promise(resolve => {
      const goal = 5 + Math.floor(ctx.difficulty * 0.7);
      const TIME = 20;
      let caught = 0, left = TIME, done = false;

      area.innerHTML = `
        <div class="cw-hud"><span>🦀 <b id="sc">0</b>/${goal}</span>
          <div class="cw-time"><div class="cw-fill" id="tf"></div></div></div>
        <div class="cw-field" id="field">
          <div class="cw-rail"></div>
          <div class="cw-claw" id="claw">🦀</div>
        </div>
        <button class="tap-pad" id="pad">DROP!</button>`;
      const field = area.querySelector('#field'), claw = area.querySelector('#claw');
      const scEl = area.querySelector('#sc'), tf = area.querySelector('#tf'), pad = area.querySelector('#pad');

      let W = 0, H = 0, laneY = 0, clawW = 44;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; laneY = H * 0.6; clawW = clamp(W * 0.12, 36, 60); claw.style.width = clawW + 'px'; };
      measure(); window.addEventListener('resize', measure);

      const fish = [];
      const sweepSpd = 0.5 + ctx.difficulty * 0.06;       // sweeps/sec
      const fishSpd = 70 + ctx.difficulty * 12;
      let t = 0, acc = 0, every = clamp(1.2 - ctx.difficulty * 0.05, 0.6, 1.2);
      let dropping = false, dropY = 0, clawX = 0;

      function spawn() {
        const fromL = Math.random() < 0.5;
        const n = el('div', 'cw-fish', '🐟');
        const y = laneY + rand(-H * 0.16, H * 0.16);
        field.appendChild(n);
        fish.push({ node: n, x: fromL ? -30 : W + 30, y, vx: (fromL ? 1 : -1) * fishSpd * rand(0.8, 1.2) });
      }

      const drop = e => { e && e.preventDefault(); if (done || dropping) return; dropping = true; dropY = 30; S.swipe(); buzz(15); };
      pad.addEventListener('pointerdown', drop);

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        if (!dropping) { t += dt * sweepSpd; const p = t % 1, m = Math.floor(t) % 2; clawX = (m === 0 ? p : 1 - p) * (W - clawW) + clawW / 2; }
        claw.style.left = (clawX - clawW / 2) + 'px';

        if (dropping) {
          dropY += H * 2.2 * dt; claw.style.top = dropY + 'px';
          if (dropY >= laneY) {
            // check catch
            let hit = -1, bd = clawW * 0.7;
            fish.forEach((f, i) => { const d = Math.abs(f.x - clawX); if (d < bd) { bd = d; hit = i; } });
            if (hit >= 0) { const f = fish[hit]; f.node.remove(); fish.splice(hit, 1); caught++; scEl.textContent = caught; sparkle(field, clawX, laneY, 7); floatText(area, clawX, laneY, 'GOTCHA!', 'good'); S.star(); buzz(25); if (caught >= goal) return finish(true); }
            else { S.bad(); }
            dropping = false; claw.style.top = '6px';
          }
        }
        acc += dt; if (acc >= every) { acc = 0; spawn(); }
        for (let i = fish.length - 1; i >= 0; i--) { const f = fish[i]; f.x += f.vx * dt; f.node.style.left = (f.x - 14) + 'px'; f.node.style.top = (f.y - 14) + 'px'; if (f.x < -40 || f.x > W + 40) { f.node.remove(); fish.splice(i, 1); } }
        if (left <= 0) return finish(caught >= goal);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        pad.removeEventListener('pointerdown', drop); window.removeEventListener('resize', measure);
        fish.forEach(f => f.node.remove());
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (left > TIME * 0.4 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
