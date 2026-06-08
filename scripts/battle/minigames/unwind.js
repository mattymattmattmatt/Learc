/* Unwind — the coils are squeezing! DRAG in fast circles to spin loose. Fill
   the escape meter before the squeeze meter crushes you. Keep spinning! */
import { el, clamp, loop, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'unwind', name: 'Unwind', icon: '🌀',
  howto: 'DRAG round and round in circles to wriggle free before the coils crush you!',

  play(area, ctx) {
    return new Promise(resolve => {
      let escape = 0, squeeze = 0, done = false;
      const escapeTarget = (5 + ctx.difficulty * 0.35) * (2 * Math.PI);   // radians of spin
      const squeezeRate = 0.05 + ctx.difficulty * 0.011;                  // per second

      area.innerHTML = `
        <div class="uw-bars">
          <div class="uw-bar"><span>Escape</span><div class="uw-track"><div class="uw-fill esc" id="esc"></div></div></div>
          <div class="uw-bar"><span>Squeeze</span><div class="uw-track"><div class="uw-fill sq" id="sq"></div></div></div>
        </div>
        <div class="uw-field" id="field">
          <div class="uw-coil" id="coil">🌀</div>
          <div class="uw-me"><img src="${petImg(ctx.hero)}"></div>
          <div class="uw-hint2">spin in circles!</div>
        </div>`;
      const field = area.querySelector('#field'), coil = area.querySelector('#coil');
      const escEl = area.querySelector('#esc'), sqEl = area.querySelector('#sq');

      let cx = 0, cy = 0, spin = 0;
      const measure = () => { const r = field.getBoundingClientRect(); cx = r.width / 2; cy = r.height / 2; };
      measure(); window.addEventListener('resize', measure);

      let dragging = false, lastA = 0;
      const ang = e => { const r = field.getBoundingClientRect(); return Math.atan2((e.clientY - r.top) - cy, (e.clientX - r.left) - cx); };
      const down = e => { dragging = true; lastA = ang(e); e.preventDefault(); };
      const move = e => {
        if (!dragging || done) return; e.preventDefault();
        const a = ang(e); let da = a - lastA; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        lastA = a; escape += Math.abs(da); spin += da;
        coil.style.transform = `rotate(${-spin}rad)`;
        if (Math.abs(da) > 0.05 && Math.random() < 0.2) S.tick();
      };
      const up = () => { dragging = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      const stop = loop((dt) => {
        if (done) return false;
        squeeze += squeezeRate * dt;
        escEl.style.width = clamp(escape / escapeTarget * 100, 0, 100) + '%';
        sqEl.style.width = clamp(squeeze * 100, 0, 100) + '%';
        coil.classList.toggle('danger', squeeze > 0.7);
        if (escape >= escapeTarget) return finish(true);
        if (squeeze >= 1) return finish(false);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('resize', measure);
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7); buzz(win ? 30 : 80);
        resolve({ win, stars: win ? (squeeze < 0.5 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
