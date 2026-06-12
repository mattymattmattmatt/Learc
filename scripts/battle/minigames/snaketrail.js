/* Venom Trail — you leave a trail of poison behind you. DRAG to steer; gobble
   the orbs to grow, but never cross your own venomous trail. Eat your fill to win. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, S } from '../util.js';

export default {
  id: 'snaketrail', name: 'Venom Trail', icon: '🐍',
  howto: 'DRAG to steer. Eat the orbs to grow — but don’t cross your own venom trail!',

  play(area, ctx) {
    return new Promise(resolve => {
      const goal = 6 + Math.floor(ctx.difficulty * 0.6);
      let eaten = 0, done = false;

      area.innerHTML = `
        <div class="sn-hud"><span>🐍 <b id="sc">0</b>/${goal}</span></div>
        <div class="sn-field" id="field">
          <div class="sn-head" id="head"></div>
          <div class="sn-orb" id="orb">⬤</div>
        </div>
        <div class="dg-hint">Drag anywhere to steer!</div>`;
      const field = area.querySelector('#field'), head = area.querySelector('#head'), orbEl = area.querySelector('#orb');
      const scEl = area.querySelector('#sc');

      let W = 0, H = 0, hr = 11;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; hr = clamp(Math.min(W, H) * 0.03, 9, 16); head.style.width = head.style.height = hr * 2 + 'px'; orbEl.style.fontSize = hr * 1.8 + 'px'; };
      measure(); window.addEventListener('resize', measure);

      const pos = { x: W / 2, y: H / 2 }, dir = { a: -Math.PI / 2 };
      let target = dir.a, pointer = null;
      const speed = Math.min(276, 120 + ctx.difficulty * 12), turn = 4.5;
      const trail = [];                 // {x,y,node}
      let baseLen = 14, spacing = 0, distAcc = 0;
      const orb = { x: 0, y: 0 };
      const placeOrb = () => { orb.x = rand(W * 0.12, W * 0.88); orb.y = rand(H * 0.12, H * 0.88); orbEl.style.left = orb.x + 'px'; orbEl.style.top = orb.y + 'px'; };
      placeOrb();

      const r0 = field.getBoundingClientRect();
      const setPointer = e => { const r = field.getBoundingClientRect(); pointer = { x: e.clientX - r.left, y: e.clientY - r.top }; };
      const down = e => { setPointer(e); e.preventDefault(); };
      const move = e => { if (pointer) setPointer(e); e.preventDefault(); };
      const up = () => { pointer = null; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      const stop = loop((dt) => {
        if (done) return false;
        if (pointer) { target = Math.atan2(pointer.y - pos.y, pointer.x - pos.x); }
        // steer toward target
        let da = target - dir.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        dir.a += clamp(da, -turn * dt, turn * dt);
        pos.x += Math.cos(dir.a) * speed * dt; pos.y += Math.sin(dir.a) * speed * dt;
        // wrap
        if (pos.x < 0) pos.x += W; if (pos.x > W) pos.x -= W;
        if (pos.y < 0) pos.y += H; if (pos.y > H) pos.y -= H;
        head.style.left = (pos.x - hr) + 'px'; head.style.top = (pos.y - hr) + 'px';

        // lay trail every few px
        distAcc += speed * dt;
        if (distAcc >= hr * 1.1) {
          distAcc = 0;
          const n = el('div', 'sn-seg'); n.style.width = n.style.height = hr * 1.7 + 'px';
          n.style.left = (pos.x - hr * 0.85) + 'px'; n.style.top = (pos.y - hr * 0.85) + 'px';
          field.insertBefore(n, head); trail.push({ x: pos.x, y: pos.y, node: n });
          const maxLen = baseLen + eaten * 6;
          while (trail.length > maxLen) { const s = trail.shift(); s.node.remove(); }
        }
        // eat orb
        if (Math.hypot(pos.x - orb.x, pos.y - orb.y) < hr + hr * 1.4) {
          eaten++; scEl.textContent = eaten; sparkle(field, orb.x, orb.y, 7); S.star(); buzz(15);
          if (eaten >= goal) return finish(true);
          placeOrb();
        }
        // self collision (skip the freshest segments near the head)
        for (let i = 0; i < trail.length - 6; i++) {
          if (Math.hypot(pos.x - trail[i].x, pos.y - trail[i].y) < hr * 1.3) { floatText(area, pos.x, pos.y, 'POISONED!', 'bad'); return finish(false); }
        }
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('resize', measure);
        trail.forEach(s => s.node.remove());
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 70);
        resolve({ win, stars: win ? (eaten >= goal ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
