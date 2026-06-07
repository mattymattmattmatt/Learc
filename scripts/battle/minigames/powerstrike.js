/* Power Strike — a timing bar. Stop the sweeping cursor in the target to
   land a hit. Bullseye = 2 damage, edge = 1. Knock out the foe's HP
   before you run out of swings. The zone shrinks and speeds up. */
import { clamp, loop, sfx, buzz, floatText } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'powerstrike', name: 'Power Strike', icon: '🎯',
  howto: 'TAP to stop the slider in the green zone. Hit the bullseye for big damage!',

  play(area, ctx) {
    return new Promise(resolve => {
      const hp0 = 3 + Math.floor(ctx.difficulty / 3);     // 3..6
      let hp = hp0;
      let swings = hp0 + 3;
      const speed = 0.9 + ctx.difficulty * 0.12;          // sweeps/sec
      const zoneW = clamp(0.34 - ctx.difficulty * 0.022, 0.09, 0.34);
      const bullW = zoneW * 0.34;

      area.innerHTML = `
        ${stageHTML(ctx, 'ps')}
        <div class="ps-hp">Foe HP <b id="hp">${'❤'.repeat(hp)}</b></div>
        <div class="ps-bar" id="bar">
          <div class="ps-zone" style="left:${(0.5 - zoneW/2)*100}%;width:${zoneW*100}%"></div>
          <div class="ps-bull" style="left:${(0.5 - bullW/2)*100}%;width:${bullW*100}%"></div>
          <div class="ps-cursor" id="cur"></div>
        </div>
        <div class="ps-swings" id="sw">Swings left: ${swings}</div>
        <button class="tap-pad" id="pad">STRIKE!</button>`;
      const cur = area.querySelector('#cur'), bar = area.querySelector('#bar');
      const hpEl = area.querySelector('#hp'), swEl = area.querySelector('#sw');
      const pad = area.querySelector('#pad'), foeEl = area.querySelector('.foe'), heroEl = area.querySelector('.hero');

      let t = 0, done = false;
      const stop = loop((dt) => {
        if (done) return false;
        t += dt * speed;
        const x = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2;  // 0..1 ping-pong
        cur.style.left = (x * 100) + '%';
        cur._x = x;
      });

      const strike = e => {
        e.preventDefault();
        if (done) return;
        const x = cur._x ?? 0.5;
        const dz = Math.abs(x - 0.5);
        let dmg = 0, txt = 'Miss!';
        if (dz <= bullW / 2) { dmg = 2; txt = 'BULLSEYE! −2'; }
        else if (dz <= zoneW / 2) { dmg = 1; txt = 'Hit! −1'; }
        const r = bar.getBoundingClientRect();
        floatText(area, r.left + x * r.width - area.getBoundingClientRect().left, r.top - area.getBoundingClientRect().top, txt, dmg ? 'good' : 'bad');
        if (dmg) { hp = Math.max(0, hp - dmg); hpEl.textContent = '❤'.repeat(hp); hitFlash(foeEl); sfx(ctx.hero.sfx, 0.6); buzz(20); }
        else { hitFlash(heroEl); buzz(40); }
        swings--; swEl.textContent = 'Swings left: ' + swings;
        if (hp <= 0) finish(true);
        else if (swings <= 0) finish(false);
      };
      pad.addEventListener('pointerdown', strike);

      function finish(win) {
        if (done) return; done = true;
        stop(); pad.removeEventListener('pointerdown', strike);
        sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (swings >= 3 ? 3 : swings >= 1 ? 2 : 2) : 1 });
      }
    });
  }
};
