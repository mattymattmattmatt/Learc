/* Charge Shot — HOLD the pad to charge your blast, RELEASE when the meter
   is inside the golden band. Perfect release = big damage; overcharge fizzles.
   Drop the foe's HP before you run out of shots. */
import { clamp, loop, rand, sfx, buzz, floatText, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'charge', name: 'Charge Shot', icon: '🔋',
  howto: 'HOLD to charge, RELEASE inside the golden band. Don’t overcharge!',

  play(area, ctx) {
    return new Promise(resolve => {
      const hp0 = 3 + Math.floor(ctx.difficulty / 3);   // 3..6
      let hp = hp0, shots = hp0 + 3, done = false;
      const rate = 0.6 + ctx.difficulty * 0.08;          // meter fill per second
      // the golden band jumps to a new height and size every shot
      let bandW = 0.2, bandLo = 0.5, bandHi = 0.7;
      const placeBand = () => {
        bandW = clamp(0.2 - ctx.difficulty * 0.015, 0.08, 0.22) * rand(0.8, 1.2);
        bandLo = rand(0.28, 0.82 - bandW);                // anywhere along the meter
        bandHi = bandLo + bandW;
      };
      placeBand();

      area.innerHTML = `
        ${stageHTML(ctx, 'ch')}
        <div class="ps-hp">Foe HP <b id="hp">${'❤'.repeat(hp)}</b></div>
        <div class="ch-meter" id="meter">
          <div class="ch-band" id="band" style="bottom:${bandLo*100}%;height:${bandW*100}%"></div>
          <div class="ch-fill" id="fill"></div></div>
        <div class="ps-swings" id="sw">Shots left: ${shots}</div>
        <button class="tap-pad" id="pad">HOLD TO CHARGE</button>`;
      const fill = area.querySelector('#fill'), hpEl = area.querySelector('#hp');
      const swEl = area.querySelector('#sw'), pad = area.querySelector('#pad');
      const band = area.querySelector('#band');
      const foeEl = area.querySelector('.foe'), heroEl = area.querySelector('.hero');
      const drawBand = () => { band.style.bottom = (bandLo * 100) + '%'; band.style.height = (bandW * 100) + '%'; };

      let charging = false, level = 0;
      const stop = loop((dt) => {
        if (done) return false;
        if (charging) {
          level = level + rate * dt;
          if (level >= 1.12) { level = 1.12; release(true); }   // overcharged → auto fizzle
          fill.style.height = clamp(level, 0, 1) * 100 + '%';
          fill.classList.toggle('over', level > bandHi);
          if (Math.random() < 0.5) S.charge(clamp(level, 0, 1));
        }
      });

      const startC = e => { e.preventDefault(); if (done || charging) return; charging = true; level = 0; pad.textContent = 'RELEASE!'; pad.classList.add('charging'); };
      const release = fizzle => {
        if (done || !charging) return;
        charging = false; pad.textContent = 'HOLD TO CHARGE'; pad.classList.remove('charging');
        const lv = level; fill.style.height = '0%'; fill.classList.remove('over');
        let dmg = 0, txt = 'Fizzle!';
        if (!fizzle && lv >= bandLo && lv <= bandHi) {
          const perfect = Math.abs(lv - (bandLo + bandW / 2)) < bandW * 0.3;
          dmg = perfect ? 2 : 1; txt = perfect ? 'PERFECT! −2' : 'Hit! −1';
        } else if (lv > bandHi) txt = 'Overcharged! 💨';
        const r = foeEl.getBoundingClientRect(), a = area.getBoundingClientRect();
        floatText(area, r.left + r.width / 2 - a.left, r.top - a.top, txt, dmg ? 'good' : 'bad');
        if (dmg) { hp = Math.max(0, hp - dmg); hpEl.textContent = '❤'.repeat(hp); hitFlash(foeEl); S.good(); buzz(20); }
        else { S.bad(); buzz(40); }
        shots--; swEl.textContent = 'Shots left: ' + shots;
        placeBand(); drawBand();                          // move the target for the next shot
        if (hp <= 0) finish(true); else if (shots <= 0) finish(false);
      };
      pad.addEventListener('pointerdown', startC);
      pad.addEventListener('pointerup', () => release(false));
      pad.addEventListener('pointerleave', () => { if (charging) release(false); });

      function finish(win) {
        if (done) return; done = true; stop();
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (shots >= 3 ? 3 : 2) : 1 });
      }
    });
  }
};
