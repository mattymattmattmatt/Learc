/* Dodge — drag your creature to survive the foe's barrage for 12s.
   You have 3 hearts; projectiles speed up and thicken with difficulty. */
import { el, clamp, loop, rand, sfx, buzz, floatText, petImg, S } from '../util.js';

export default {
  id: 'dodge', name: 'Dodge!', icon: '🌀',
  howto: 'Drag your creature to DODGE the attacks. Survive until the timer runs out!',

  play(area, ctx) {
    return new Promise(resolve => {
      const TIME = 12;
      let hp = 3, left = TIME, done = false;

      area.innerHTML = `
        <div class="dg-hud"><span id="hearts">${'❤'.repeat(hp)}</span>
          <div class="dg-time"><div class="dg-fill" id="tf"></div></div></div>
        <div class="dg-field" id="field">
          <div class="dg-hero" id="me"><img src="${petImg(ctx.hero)}" alt="you" draggable="false"></div>
        </div>
        <div class="dg-hint">Drag the bubble to dodge!</div>`;
      const field = area.querySelector('#field'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), tf = area.querySelector('#tf');

      let W = 0, H = 0, size = 56;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; size = clamp(Math.min(W, H) * 0.17, 44, 76); me.style.width = size + 'px'; me.style.height = size + 'px'; };
      measure(); window.addEventListener('resize', measure);

      let px = 0, py = 0;
      const placeMe = () => { me.style.transform = `translate(${px}px,${py}px)`; };
      px = W / 2 - size / 2; py = H * 0.7; placeMe();

      const moveTo = (cx, cy) => {
        const r = field.getBoundingClientRect();
        px = clamp(cx - r.left - size / 2, 0, W - size);
        py = clamp(cy - r.top - size / 2, 0, H - size);
        placeMe();
      };
      let dragging = false;
      const down = e => { dragging = true; moveTo(e.clientX, e.clientY); e.preventDefault(); };
      const move = e => { if (dragging) { moveTo(e.clientX, e.clientY); e.preventDefault(); } };
      const up = () => { dragging = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);

      const projs = [];
      const spawnEvery = clamp(0.9 - ctx.difficulty * 0.06, 0.2, 0.9);   // keeps thickening up to d≈12
      const pspeed = 150 + ctx.difficulty * 26;                          // d14 ≈ 514 px/s
      let acc = 0, iframe = 0;

      const PROJ = (ctx.theme && ctx.theme.proj) || '⭐';
      function spawn() {
        const edge = (Math.random() * 4) | 0;
        const node = el('div', 'dg-proj', PROJ);
        let x, y, vx, vy;
        if (edge === 0) { x = rand(0, W); y = -20; }
        else if (edge === 1) { x = W + 20; y = rand(0, H); }
        else if (edge === 2) { x = rand(0, W); y = H + 20; }
        else { x = -20; y = rand(0, H); }
        // aim roughly at the player's current spot
        const tx = px + size / 2, ty = py + size / 2;
        const dx = tx - x, dy = ty - y, d = Math.hypot(dx, dy) || 1;
        const jitter = rand(-0.25, 0.25);
        vx = (dx / d) * pspeed * (1 + jitter * 0.3); vy = (dy / d) * pspeed;
        node.style.transform = `translate(${x}px,${y}px)`;
        field.appendChild(node);
        projs.push({ node, x, y, vx, vy });
      }

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; iframe = Math.max(0, iframe - dt);
        tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        acc += dt; if (acc >= spawnEvery) { acc = 0; spawn(); if (ctx.difficulty >= 6) spawn(); if (ctx.difficulty >= 11) spawn(); }

        const hx = px + size / 2, hy = py + size / 2, hr = size * 0.46;   // matches the round token
        for (let i = projs.length - 1; i >= 0; i--) {
          const p = projs[i];
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.node.style.transform = `translate(${p.x}px,${p.y}px)`;
          if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { p.node.remove(); projs.splice(i, 1); continue; }
          if (iframe <= 0 && Math.hypot(p.x - hx, p.y - hy) < hr + 11) {
            p.node.remove(); projs.splice(i, 1);
            hp--; iframe = 0.9; heartsEl.textContent = '❤'.repeat(Math.max(0, hp));
            me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt');
            S.hit(); buzz(60);
            floatText(area, hx, hy, '−1', 'bad');
            if (hp <= 0) return end(false);
          }
        }
        if (left <= 0) return end(true);
      });

      function end(win) {
        if (done) return false; done = true;
        stop();
        field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        window.removeEventListener('resize', measure);
        projs.forEach(p => p.node.remove());
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (hp >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
