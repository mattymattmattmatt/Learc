/* Power Strike — a timing bar. Stop the sweeping cursor in the target to
   land a hit. Bullseye = 2 damage, edge = 1. Knock out the foe's HP
   before you run out of swings. The zone shrinks and speeds up. */
import { clamp, loop, rand, sfx, buzz, floatText, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'powerstrike', name: 'Power Strike', icon: '🎯',
  howto: 'TAP to stop the slider in the green zone. Hit the bullseye for big damage!',

  play(area, ctx) {
    return new Promise(resolve => {
      const hp0 = 5 + Math.floor(ctx.difficulty / 2);     // tougher foe (≈5..9)
      let hp = hp0;
      let swings = hp0 + 3;
      const speed = 0.95 + ctx.difficulty * 0.18;         // full sweeps/sec (constant, readable)
      const zoneW = clamp(0.28 - ctx.difficulty * 0.024, 0.07, 0.28);
      const bullW = zoneW * 0.34;
      // the target zone jumps to a new spot every swing — no camping the centre
      let zc = 0.5;
      const placeZone = () => { zc = rand(zoneW / 2 + 0.04, 1 - zoneW / 2 - 0.04); };
      placeZone();

      area.innerHTML = `
        ${stageHTML(ctx, 'ps')}
        <div class="ps-hp">Foe HP <b id="hp">${'❤'.repeat(hp)}</b></div>
        <div class="ps-bar" id="bar">
          <div class="ps-zone" id="zone"></div>
          <div class="ps-bull" id="bull"></div>
          <div class="ps-cursor" id="cur"></div>
        </div>
        <div class="ps-swings" id="sw">Swings left: ${swings}</div>
        <button class="tap-pad" id="pad">STRIKE!</button>`;
      const cur = area.querySelector('#cur'), bar = area.querySelector('#bar');
      const hpEl = area.querySelector('#hp'), swEl = area.querySelector('#sw');
      const zoneEl = area.querySelector('#zone'), bullEl = area.querySelector('#bull');
      const pad = area.querySelector('#pad'), foeEl = area.querySelector('.foe'), heroEl = area.querySelector('.hero');
      const drawZone = () => {
        zoneEl.style.left = ((zc - zoneW / 2) * 100) + '%'; zoneEl.style.width = (zoneW * 100) + '%';
        bullEl.style.left = ((zc - bullW / 2) * 100) + '%'; bullEl.style.width = (bullW * 100) + '%';
      };
      drawZone();

      let t = 0, done = false;
      const stop = loop((dt) => {
        if (done) return false;
        t += dt * speed;
        const p = t % 1, m = Math.floor(t) % 2;
        const x = m === 0 ? p : 1 - p;          // constant-speed triangle sweep
        cur.style.left = (x * 100) + '%';
        cur._x = x;
      });

      const strike = e => {
        e.preventDefault();
        if (done) return;
        const x = cur._x ?? 0.5;
        const dz = Math.abs(x - zc);
        let dmg = 0, txt = 'Miss!';
        if (dz <= bullW / 2) { dmg = 2; txt = 'BULLSEYE! −2'; }
        else if (dz <= zoneW / 2) { dmg = 1; txt = 'Hit! −1'; }
        const r = bar.getBoundingClientRect();
        floatText(area, r.left + x * r.width - area.getBoundingClientRect().left, r.top - area.getBoundingClientRect().top, txt, dmg ? 'good' : 'bad');
        if (dmg) { hp = Math.max(0, hp - dmg); hpEl.textContent = '❤'.repeat(hp); hitFlash(foeEl); S.good(); buzz(20); }
        else { hitFlash(heroEl); S.bad(); buzz(40); }
        swings--; swEl.textContent = 'Swings left: ' + swings;
        placeZone(); drawZone();                  // relocate the target for the next swing
        if (hp <= 0) finish(true);
        else if (swings <= 0) finish(false);
      };
      pad.addEventListener('pointerdown', strike);

      function finish(win) {
        if (done) return; done = true;
        stop(); pad.removeEventListener('pointerdown', strike);
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (swings >= 3 ? 3 : 2) : 1 });
      }
    });
  }
};
