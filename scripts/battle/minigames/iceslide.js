/* Ice Curling — slide your creature up the ice and stop it on the target.
   Drag back and release to set power & angle; it glides, then friction brings
   it to rest. Closer to the bullseye scores more. Beat the points goal. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, petImg, S } from '../util.js';

export default {
  id: 'iceslide', name: 'Ice Curling', icon: '🥌',
  howto: 'Drag back & release to slide onto the target. Stop on the bullseye!',

  play(area, ctx) {
    return new Promise(resolve => {
      const shotsMax = 5;
      const goal = clamp(6 + Math.floor(ctx.difficulty * 0.7), 6, 12);   // always reachable in 5 slides (max 15)
      let shots = shotsMax, score = 0, done = false;

      area.innerHTML = `
        <div class="ic-hud"><span>🥌 <b id="sc">0</b>/${goal}</span><span>Slides <b id="sh">${shots}</b></span></div>
        <div class="ic-field" id="field">
          <div class="ic-target" id="target"><div class="ic-r3"></div><div class="ic-r2"></div><div class="ic-r1"></div></div>
          <div class="ic-aim" id="aim" hidden></div>
          <div class="ic-me" id="me"><img src="${petImg(ctx.hero)}"></div>
        </div>
        <div class="dg-hint">Drag back & release to slide!</div>`;
      const field = area.querySelector('#field'), me = area.querySelector('#me');
      const target = area.querySelector('#target'), aim = area.querySelector('#aim');
      const scEl = area.querySelector('#sc'), shEl = area.querySelector('#sh');

      let W = 0, H = 0, size = 48, K = 7, fric = 0, tx = 0, ty = 0, tr = 60;
      const start = { x: 0, y: 0 };
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        size = clamp(Math.min(W, H) * 0.13, 38, 60); me.style.width = me.style.height = size + 'px';
        fric = H * 0.68;
        tx = W / 2; ty = H * 0.26; tr = clamp(Math.min(W, H) * 0.2, 54, 100);
        target.style.left = tx + 'px'; target.style.top = ty + 'px'; target.style.width = target.style.height = tr * 2 + 'px';
        start.x = W / 2; start.y = H * 0.84;
      };
      measure(); window.addEventListener('resize', measure);

      let pos = { x: start.x, y: start.y }, vel = null, aiming = false, pull = { x: 0, y: 0 };
      const place = () => { me.style.left = (pos.x - size / 2) + 'px'; me.style.top = (pos.y - size / 2) + 'px'; };
      place();

      const down = e => { if (done || vel) return; aiming = true; updateAim(e); e.preventDefault(); };
      const move = e => { if (aiming) { updateAim(e); e.preventDefault(); } };
      const up = () => {
        if (!aiming) return; aiming = false; aim.hidden = true;
        const dx = start.x - pull.x, dy = start.y - pull.y;
        if (Math.hypot(dx, dy) < 16) return;
        vel = { x: dx * K, y: dy * K };
        shots--; shEl.textContent = shots; S.swipe(); buzz(15);
      };
      function updateAim(e) {
        const r = field.getBoundingClientRect();
        let dx = (e.clientX - r.left) - start.x, dy = (e.clientY - r.top) - start.y;
        const d = Math.hypot(dx, dy), max = Math.min(W, H) * 0.4;
        if (d > max) { dx = dx / d * max; dy = dy / d * max; }
        pull.x = start.x + dx; pull.y = start.y + dy;
        // aim arrow points opposite the pull (the launch direction)
        const ang = Math.atan2(-dy, -dx), len = Math.hypot(dx, dy);
        aim.hidden = false; aim.style.left = start.x + 'px'; aim.style.top = start.y + 'px';
        aim.style.width = len * 1.6 + 'px'; aim.style.transform = `translateY(-50%) rotate(${ang}rad)`;
      }
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      const stop = loop((dt) => {
        if (done) return false;
        if (vel) {
          pos.x += vel.x * dt; pos.y += vel.y * dt;
          const sp = Math.hypot(vel.x, vel.y), ns = Math.max(0, sp - fric * dt);
          if (sp > 0) { vel.x *= ns / sp; vel.y *= ns / sp; }
          // walls
          if (pos.x < size / 2) { pos.x = size / 2; vel.x *= -0.5; }
          if (pos.x > W - size / 2) { pos.x = W - size / 2; vel.x *= -0.5; }
          if (pos.y < size / 2) { pos.y = size / 2; vel.y *= -0.4; }
          place();
          if (pos.y > H - size / 2 + 4 || ns < 6) { vel = null; resolveShot(); }
        }
      });

      function resolveShot() {
        const d = Math.hypot(pos.x - tx, pos.y - ty);
        let pts = 0, txt = 'Missed!';
        if (d < tr * 0.33) { pts = 3; txt = 'BULLSEYE! +3'; }
        else if (d < tr * 0.66) { pts = 2; txt = 'Nice! +2'; }
        else if (d < tr) { pts = 1; txt = '+1'; }
        if (pts) { score += pts; scEl.textContent = score; sparkle(field, pos.x, pos.y, 7); S.star(); }
        else S.bad();
        floatText(area, pos.x, pos.y - 10, txt, pts ? 'good' : 'bad');
        if (score >= goal) return finish(true);
        if (shots <= 0) return finish(score >= goal);
        setTimeout(() => { if (done) return; pos = { x: start.x, y: start.y }; place(); }, 600);
      }
      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('resize', measure);
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (score >= goal + 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
