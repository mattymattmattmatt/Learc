/* Freeze! — creep toward the goal while the foe isn't looking. HOLD to move,
   but the instant the eye snaps open you must let go — move while watched and
   you're caught and shoved back. Reach the flag before your hearts run out. */
import { clamp, loop, rand, sfx, buzz, floatText, petImg, S } from '../util.js';

export default {
  id: 'freezeframe', name: 'Freeze!', icon: '🛑',
  howto: 'HOLD to creep forward — but let GO the instant the eye opens, or you’re caught!',

  play(area, ctx) {
    return new Promise(resolve => {
      let prog = 0, hearts = 3, done = false, holding = false, cool = 0;
      let phase = 'green', timer = rand(1.4, 2.4);
      const speed = 0.36;

      area.innerHTML = `
        <div class="ff-hud"><span id="hearts">${'❤'.repeat(hearts)}</span></div>
        <div class="ff-stage">
          <div class="ff-watcher"><img src="${petImg(ctx.foe)}"><div class="ff-eye" id="eye">😌</div></div>
          <div class="ff-light" id="light">GO!</div>
          <div class="ff-track" id="track">
            <div class="ff-flag">🏁</div>
            <div class="ff-me" id="me"><img src="${petImg(ctx.hero)}"></div>
          </div>
        </div>
        <button class="tap-pad" id="pad">HOLD TO MOVE</button>`;
      const track = area.querySelector('#track'), me = area.querySelector('#me');
      const eye = area.querySelector('#eye'), light = area.querySelector('#light');
      const heartsEl = area.querySelector('#hearts'), pad = area.querySelector('#pad');

      const down = e => { e.preventDefault(); holding = true; };
      const up = () => { holding = false; };
      pad.addEventListener('pointerdown', down);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);   // never leave the hero creeping on a lost pointer

      const place = () => { me.style.left = clamp(prog, 0, 1) * 86 + '%'; };
      place();
      const setPhase = p => {
        phase = p; track.dataset.phase = p;
        if (p === 'green') { light.textContent = 'GO!'; light.className = 'ff-light go'; eye.textContent = '😌'; timer = rand(1.3, 2.4) - ctx.difficulty * 0.05; }
        else if (p === 'warn') { light.textContent = '…'; light.className = 'ff-light warn'; eye.textContent = '😐'; timer = clamp(0.6 - ctx.difficulty * 0.03, 0.25, 0.6); }
        else { light.textContent = 'FREEZE!'; light.className = 'ff-light red'; eye.textContent = '👁️'; timer = rand(0.9, 1.8); S.bad(); }
      };
      setPhase('green');

      const stop = loop((dt) => {
        if (done) return false;
        cool = Math.max(0, cool - dt);
        timer -= dt;
        if (timer <= 0) setPhase(phase === 'green' ? 'warn' : phase === 'warn' ? 'red' : 'green');

        if (holding && phase === 'green') { prog += speed * dt; place(); if (prog >= 1) return finish(true); }
        else if (holding && phase === 'red' && cool <= 0) {
          cool = 0.8; hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts));
          prog = clamp(prog - 0.16, 0, 1); place();
          me.classList.remove('caught'); void me.offsetWidth; me.classList.add('caught');
          floatText(area, me.getBoundingClientRect().left - area.getBoundingClientRect().left, 40, 'CAUGHT!', 'bad');
          S.hit(); buzz(70);
          if (hearts <= 0) return finish(false);
        }
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        pad.removeEventListener('pointerdown', down);
        window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
