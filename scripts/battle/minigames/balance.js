/* Balance Beam — you're perched on a log over croc-infested water! The foe
   keeps shoving you. TAP the LEFT or RIGHT side to lean back to the middle.
   Slide too far and you topple in — snap! Stay up until time runs out. */
import { clamp, loop, rand, sfx, buzz, wait, petImg, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'balance', name: 'Balance Beam', icon: '⚖️',
  howto: 'TAP LEFT or RIGHT to stay balanced on the log. Don’t fall to the crocs!',

  play(area, ctx) {
    return new Promise(resolve => {
      const TIME = 14;
      let tilt = 0, vel = 0, left = TIME, done = false;
      let push = 0;
      const pushMax = clamp(0.45 + ctx.difficulty * 0.11, 0, 1.65);
      const impulse = 1.7, damp = 1.7;
      let shoveIn = rand(1.4, 2.6);

      area.innerHTML = `
        ${stageHTML(ctx, 'bl')}
        <div class="bl-time"><div class="bl-fill" id="tf"></div></div>
        <div class="bl-stage">
          <div class="bl-meter"><div class="bl-needle" id="needle"></div><div class="bl-center"></div></div>
          <div class="bl-arena" id="arena">
            <div class="bl-creature" id="cr"><img src="${petImg(ctx.hero)}" draggable="false"></div>
            <div class="bl-log" id="log"></div>
            <div class="bl-pivot">▲</div>
            <div class="bl-water">
              <span class="croc c1">🐊</span><span class="croc c2">🐊</span><span class="croc c3">🐊</span>
              <div class="bl-waves"></div>
            </div>
          </div>
        </div>
        <div class="bl-pad">
          <button class="bl-half" id="L">◀ LEAN</button>
          <button class="bl-half" id="R">LEAN ▶</button>
        </div>`;
      const tf = area.querySelector('#tf'), foeEl = area.querySelector('.foe');
      const cr = area.querySelector('#cr'), log = area.querySelector('#log'), needle = area.querySelector('#needle');
      const arena = area.querySelector('#arena');

      const nudge = dir => { if (done) return; vel += dir * impulse; S.tick(); buzz(10);
        cr.classList.remove('lean'); void cr.offsetWidth; cr.classList.add('lean'); };
      const Lb = area.querySelector('#L'), Rb = area.querySelector('#R');
      const onL = e => { e.preventDefault(); nudge(-1); };
      const onR = e => { e.preventDefault(); nudge(1); };
      Lb.addEventListener('pointerdown', onL);
      Rb.addEventListener('pointerdown', onR);

      const render = () => {
        const w = arena.getBoundingClientRect().width || 320;
        const slide = tilt * w * 0.40;                 // creature slides toward the low side
        cr.style.transform = `translate(-50%,0) translateX(${slide}px) rotate(${tilt * 26}deg)`;
        log.style.transform = `rotate(${tilt * 12}deg)`;
        needle.style.transform = `translateX(-50%) rotate(${tilt * 60}deg)`;
        const danger = Math.abs(tilt) > 0.62;
        cr.classList.toggle('danger', danger);
        arena.classList.toggle('danger', danger);
      };
      render();

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        push = clamp(push + rand(-1, 1) * dt * 1.4, -pushMax, pushMax);
        shoveIn -= dt;
        if (shoveIn <= 0) {
          shoveIn = Math.max(0.55, rand(1.3, 2.6) - ctx.difficulty * 0.08);   // always a beat to recover
          vel += (Math.random() < 0.5 ? -1 : 1) * Math.min(2.05, 0.85 + ctx.difficulty * 0.12);
          hitFlash(foeEl); S.bad();
        }
        vel += push * dt; vel *= (1 - damp * dt); tilt += vel * dt;
        render();
        if (Math.abs(tilt) >= 1) return fall();
        if (left <= 0) return end(true);
      });

      async function fall() {
        if (done) return false; done = true; stop();
        Lb.removeEventListener('pointerdown', onL); Rb.removeEventListener('pointerdown', onR);
        const dir = tilt > 0 ? 1 : -1;
        cr.style.transition = 'transform .5s cubic-bezier(.5,0,.9,.6)';
        cr.style.transform = `translate(-50%,0) translateX(${dir * 130}px) translateY(180px) rotate(${dir * 220}deg)`;
        S.splash(); buzz(120);
        await wait(360);
        const croc = area.querySelector(dir > 0 ? '.croc.c3' : '.croc.c1');
        if (croc) croc.classList.add('chomp');
        await wait(450);
        finish(false);
        return false;
      }
      function end(win) { if (done) return false; done = true; stop();
        Lb.removeEventListener('pointerdown', onL); Rb.removeEventListener('pointerdown', onR); finish(win); return false; }
      function finish(win) {
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? 3 : 1 });
      }
    });
  }
};
