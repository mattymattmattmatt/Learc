/* Rope Jump — Demonder's fight, a Hot-Rope-Jump-style timing survival.
   Demonder swings a fiery rope under your feet; TAP to hop it each time it
   reaches the ground. The rope speeds up the longer you last — clear enough
   jumps to win. Mis-time it and you trip. */
import { loop, clamp, rand, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'ropejump', name: 'Rope-a-Demon', icon: '🪢',
  howto: 'TAP anywhere to JUMP the swinging rope. It gets faster — clear every pass without tripping!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const boss = ctx.foe || {};
      const accent = boss.color || '#ff6b3f';
      const goal = 12 + Math.round(d * 1.1);
      const hang = 0.46;
      let hearts = 3, count = 0, done = false;
      let period = clamp(1.45 - d * 0.05, 0.62, 1.45);
      let phase = rand(0.25, 0.4), air = 0;

      area.innerHTML = `
        <div class="rj-hud" style="--accent:${accent}">
          <span id="hearts">${'❤'.repeat(hearts)}</span>
          <span>Jumps <b id="cnt">0</b>/${goal}</span>
        </div>
        <div class="rj-field" id="field">
          <div class="rj-boss"><img src="${petImg(boss)}" draggable="false"></div>
          <div class="rj-rope" id="rope"></div>
          <div class="rj-ground"></div>
          <div class="rj-hero" id="me"><img src="${petImg(ctx.hero)}" draggable="false"></div>
          <div class="rj-banner" id="ban"></div>
        </div>
        <button class="rj-jump" id="jump">⬆ JUMP</button>
        <div class="dg-hint">Tap JUMP the instant the rope sweeps your feet!</div>`;
      const field = area.querySelector('#field'), rope = area.querySelector('#rope'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), cntEl = area.querySelector('#cnt'), ban = area.querySelector('#ban');
      const jump = area.querySelector('#jump');

      let W = 0, H = 0, feetY = 0, amp = 0;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; feetY = H * 0.8; amp = H * 0.54; };
      measure(); window.addEventListener('resize', measure);

      function doJump() { if (done || air > 0) return; air = hang; S.tick(); buzz(10); }
      const tap = e => { e.preventDefault(); doJump(); };
      jump.addEventListener('pointerdown', tap);
      field.addEventListener('pointerdown', tap);

      function flash(txt, cls) { ban.textContent = txt; ban.className = 'rj-banner show ' + cls; clearTimeout(ban._t); ban._t = setTimeout(() => ban.classList.remove('show'), 650); }

      const stop = loop(dt => {
        if (done) return false;
        if (air > 0) air = Math.max(0, air - dt);
        phase += dt / period;
        let passed = false;
        if (phase >= 1) { phase -= 1; passed = true; }
        // rope swings to the feet at phase 0/1, up high at 0.5
        rope.style.top = (feetY - amp * Math.sin(Math.PI * phase)) + 'px';
        const hopY = air > 0 ? -Math.sin(Math.PI * (1 - air / hang)) * (H * 0.18) : 0;
        me.style.transform = `translateX(-50%) translateY(${hopY}px)`;
        if (passed) {
          if (air > 0) {
            count++; cntEl.textContent = count; S.good(); buzz(12);
            if (count % 4 === 0) { period = Math.max(0.5, period * 0.9); flash('Faster!', 'warn'); }
            if (count >= goal) return end(true);
          } else {
            hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts));
            field.classList.remove('flash'); void field.offsetWidth; field.classList.add('flash');
            S.hit(); buzz(70); flash('Tripped!', 'bad');
            if (hearts <= 0) return end(false);
          }
        }
      });

      function end(win) {
        if (done) return false; done = true; stop();
        jump.removeEventListener('pointerdown', tap); field.removeEventListener('pointerdown', tap);
        window.removeEventListener('resize', measure);
        if (!win) sfx(boss.sfx, 0.7);
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
