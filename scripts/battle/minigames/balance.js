/* Balance Beam — the foe keeps shoving you off balance. TAP the LEFT or
   RIGHT side to lean back toward the middle. Don't topple before time's up! */
import { clamp, loop, rand, sfx, buzz, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'balance', name: 'Balance Beam', icon: '⚖️',
  howto: 'TAP the LEFT or RIGHT side of the beam to stay balanced. Don’t fall off!',

  play(area, ctx) {
    return new Promise(resolve => {
      const TIME = 14;
      let tilt = 0, vel = 0, left = TIME, done = false;
      let push = 0;                              // slowly-varying external lean
      const pushMax = 0.5 + ctx.difficulty * 0.12;
      const impulse = 1.7;
      const damp = 1.6;
      let shoveIn = rand(1.4, 2.6);

      area.innerHTML = `
        ${stageHTML(ctx, 'bl')}
        <div class="bl-time"><div class="bl-fill" id="tf"></div></div>
        <div class="bl-stage">
          <div class="bl-beam" id="beam">
            <img class="bl-creature" id="cr" src="${creatureImg(ctx)}">
          </div>
          <div class="bl-pivot">▲</div>
        </div>
        <div class="bl-pad">
          <button class="bl-half" id="L">◀ LEAN</button>
          <button class="bl-half" id="R">LEAN ▶</button>
        </div>`;
      const beam = area.querySelector('#beam'), tf = area.querySelector('#tf'), foeEl = area.querySelector('.foe');

      const nudge = dir => { if (done) return; vel += dir * impulse; S.tick(); buzz(10);
        beam.classList.remove('lean'); void beam.offsetWidth; beam.classList.add('lean'); };
      const Lb = area.querySelector('#L'), Rb = area.querySelector('#R');
      const onL = e => { e.preventDefault(); nudge(-1); };
      const onR = e => { e.preventDefault(); nudge(1); };
      Lb.addEventListener('pointerdown', onL);
      Rb.addEventListener('pointerdown', onR);

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        // wander the external push (random walk)
        push = clamp(push + rand(-1, 1) * dt * 1.4, -pushMax, pushMax);
        // foe shove events
        shoveIn -= dt;
        if (shoveIn <= 0) {
          shoveIn = rand(1.3, 2.6) - ctx.difficulty * 0.08;
          vel += (Math.random() < 0.5 ? -1 : 1) * (0.9 + ctx.difficulty * 0.12);
          hitFlash(foeEl); S.bad();
        }
        vel += push * dt;
        vel *= (1 - damp * dt);
        tilt += vel * dt;
        beam.style.transform = `rotate(${tilt * 30}deg)`;
        beam.classList.toggle('danger', Math.abs(tilt) > 0.7);
        if (Math.abs(tilt) >= 1) return end(false);
        if (left <= 0) return end(true);
      });

      function end(win) {
        if (done) return false; done = true; stop();
        Lb.removeEventListener('pointerdown', onL); Rb.removeEventListener('pointerdown', onR);
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        if (!win) buzz(80);
        resolve({ win, stars: win ? 3 : 1 });
        return false;
      }
    });
  }
};
function creatureImg(ctx) { return ctx.hero.king ? 'assets/img/king_intro.gif' : `assets/img/characters/${ctx.hero.sprite}`; }
