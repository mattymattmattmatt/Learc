/* Pedal Race — Minyar's fight, a Pedal-Power-style mash race.
   HAMMER the two pedals in ALTERNATION (◀ then ▶ then ◀…) to build speed and
   race Minyar's tantrum-trike to the flag. Tapping the same pedal twice in a
   row makes you stumble, so it's a rhythm-of-alternation skill, not pure mash. */
import { loop, clamp, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'pedalrace', name: 'Tantrum Trike Race', icon: '🚲',
  howto: 'Hammer the pedals — LEFT, RIGHT, LEFT, RIGHT! Keep alternating to build speed and beat Minyar to the flag.',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const boss = ctx.foe || {};
      const accent = boss.color || '#7ad17a';
      const D = 160, TIMEOUT = 60;
      const cpuSpeed = clamp(3.4 + d * 1.14, 3.4, 20);   // tuned: ~4/s to win (Story), ~5/s (Normal), ~8/s (Hard)
      const step = 2.0;                                // ground gained per valid alternating press,
      let heroPos = 0, bossPos = 0, disp = 0, lastPedal = 0, taps = 0, time = 0, done = false;
      // so your speed tracks how fast you actually alternate (no coasting at the cap)

      area.innerHTML = `
        <div class="pr-hud" style="--accent:${accent}">
          <span>🏁 First to the flag wins!</span>
          <span class="pr-tapn">⚡ <b id="taps">0</b></span>
        </div>
        <div class="pr-track">
          <div class="pr-lane"><span class="pr-flag">🏁</span>
            <div class="pr-racer" id="rhero"><img src="${petImg(ctx.hero)}" draggable="false"></div></div>
          <div class="pr-lane foe"><span class="pr-flag">🏁</span>
            <div class="pr-racer" id="rfoe"><img src="${petImg(boss)}" draggable="false"></div></div>
        </div>
        <div class="pr-speedwrap"><span>SPEED</span><div class="pr-speed"><div class="pr-speed-fill" id="spd"></div></div></div>
        <div class="pr-pedals">
          <button class="pr-pedal" id="pedL">◀<br>PEDAL</button>
          <button class="pr-pedal" id="pedR">PEDAL<br>▶</button>
        </div>`;
      const rhero = area.querySelector('#rhero'), rfoe = area.querySelector('#rfoe');
      const tapsEl = area.querySelector('#taps'), spd = area.querySelector('#spd');
      const pedL = area.querySelector('#pedL'), pedR = area.querySelector('#pedR');

      const place = () => {
        rhero.style.left = clamp((heroPos / D) * 90, 0, 90) + '%';
        rfoe.style.left = clamp((bossPos / D) * 90, 0, 90) + '%';
      };
      place();

      function press(pedal, btn) {
        if (done) return;
        btn.classList.remove('hit'); void btn.offsetWidth; btn.classList.add('hit');
        if (pedal === lastPedal) {            // same pedal twice → stumble and lose ground
          heroPos = Math.max(0, heroPos - step * 0.8); disp *= 0.5; S.bad(); buzz(10);
          rhero.classList.remove('wobble'); void rhero.offsetWidth; rhero.classList.add('wobble');
          place(); return;
        }
        lastPedal = pedal; taps++; tapsEl.textContent = taps;
        heroPos += step; disp = clamp(disp + 0.16, 0, 1);
        place(); S.tick(); buzz(8);
      }
      const dL = e => { e.preventDefault(); press(-1, pedL); };
      const dR = e => { e.preventDefault(); press(1, pedR); };
      pedL.addEventListener('pointerdown', dL);
      pedR.addEventListener('pointerdown', dR);

      const stop = loop(dt => {
        if (done) return false;
        time += dt;
        disp = Math.max(0, disp - 1.1 * dt);             // speed gauge eases back when you slow down
        spd.style.width = clamp(disp * 100, 0, 100) + '%';
        let cpu = cpuSpeed;                   // gentle rubber-band keeps it a race
        if (heroPos > bossPos + 18) cpu *= 1.12;
        else if (bossPos > heroPos + 18) cpu *= 0.94;
        bossPos += cpu * dt;
        place();
        if (heroPos >= D) return end(true);
        if (bossPos >= D) return end(false);
        if (time >= TIMEOUT) return end(heroPos >= bossPos);
      });

      function end(win) {
        if (done) return false; done = true; stop();
        pedL.removeEventListener('pointerdown', dL);
        pedR.removeEventListener('pointerdown', dR);
        if (!win) sfx(boss.sfx, 0.7);
        const dominant = win && bossPos <= D * 0.7;
        resolve({ win, stars: win ? (dominant ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
