/* Log Roll — you're a ball balancing on a floating log over croc water!
   The log keeps tipping and the foe shoves you; TAP ◀ / ▶ to roll back toward
   the middle. Roll off either end and you splash in. Stay on till time's up. */
import { clamp, loop, rand, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'balance', name: 'Log Roll', icon: '🪵',
  howto: 'TAP ◀ / ▶ to roll your ball back to the middle of the log — don’t roll off into the water!',

  play(area, ctx) {
    return new Promise(resolve => {
      const TIME = 14;
      let p = 0, vel = 0, left = TIME, done = false, cleanRun = true, roll = 0, slope = 0;
      const impulse = 0.34;                             // small nudge per tap — fine control
      const damp = 2.0;                                 // velocity bleeds fast so taps feel responsive
      const drift = 0.34 + ctx.difficulty * 0.05;       // how fast the log's tilt wanders
      const shoveBase = 0.22 + ctx.difficulty * 0.04;   // foe shove strength
      let shoveIn = rand(0.9, 1.6);

      area.innerHTML = `
        <div class="lr-time"><div class="lr-fill" id="tf"></div></div>
        <div class="lr-arena" id="arena">
          <div class="lr-water"><span class="lr-croc a">🐊</span><span class="lr-croc b">🐊</span><span class="lr-croc c">🐊</span></div>
          <div class="lr-beam" id="beam">
            <div class="lr-ball" id="ball"><img src="${petImg(ctx.hero)}" draggable="false"></div>
          </div>
          <div class="lr-pivot">▲</div>
        </div>
        <div class="lr-pad">
          <button class="lr-half" id="L">◀ ROLL</button>
          <button class="lr-half" id="R">ROLL ▶</button>
        </div>`;
      const tf = area.querySelector('#tf'), beam = area.querySelector('#beam'), ball = area.querySelector('#ball'), arena = area.querySelector('#arena');
      const Lb = area.querySelector('#L'), Rb = area.querySelector('#R');

      const push = dir => { if (done) return; vel += dir * impulse; S.tick(); buzz(10); };
      const onL = e => { e.preventDefault(); push(-1); };
      const onR = e => { e.preventDefault(); push(1); };
      Lb.addEventListener('pointerdown', onL); Rb.addEventListener('pointerdown', onR);

      const render = () => {
        const bw = beam.offsetWidth || 300;             // layout width (unaffected by rotation)
        const x = p * (bw * 0.42);                       // roll along the log surface
        beam.style.transform = `translate(-50%,-50%) rotate(${p * 11}deg)`;   // log tips toward the ball
        ball.style.transform = `translateX(calc(-50% + ${x}px)) rotate(${roll}rad)`;
        const danger = Math.abs(p) > 0.66;
        ball.classList.toggle('danger', danger);
        arena.classList.toggle('danger', danger);
      };
      render();

      const stop = loop(dt => {
        if (done) return false;
        left -= dt; tf.style.width = clamp(left / TIME * 100, 0, 100) + '%';
        slope = clamp(slope + rand(-1, 1) * dt * drift, -1, 1);
        shoveIn -= dt;
        if (shoveIn <= 0) {
          shoveIn = Math.max(0.5, rand(0.9, 1.7) - ctx.difficulty * 0.06);
          vel += (Math.random() < 0.5 ? -1 : 1) * shoveBase;
          arena.classList.remove('shove'); void arena.offsetWidth; arena.classList.add('shove'); S.bad();
        }
        vel += slope * dt * 0.95;                        // the tilting log keeps rolling you
        vel *= (1 - damp * dt);
        p += vel * dt;
        roll += vel * dt * 6;                            // the ball spins as it rolls
        if (Math.abs(p) > 0.66) cleanRun = false;
        render();
        if (Math.abs(p) >= 1) return fall();
        if (left <= 0) return end(true);
      });

      function fall() {
        if (done) return false; done = true; stop(); cleanup();
        const dir = p > 0 ? 1 : -1;
        ball.style.transition = 'transform .5s cubic-bezier(.5,0,.9,.6)';
        ball.style.transform = `translateX(calc(-50% + ${dir * 130}px)) translateY(180px) rotate(${dir * 12}rad)`;
        S.splash(); buzz(120); setTimeout(() => finish(false), 520);
        return false;
      }
      function end(win) { if (done) return false; done = true; stop(); cleanup(); finish(win); return false; }
      function cleanup() { Lb.removeEventListener('pointerdown', onL); Rb.removeEventListener('pointerdown', onR); }
      function finish(win) { if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 80); resolve({ win, stars: win ? (cleanRun ? 3 : 2) : 1 }); }
    });
  }
};
