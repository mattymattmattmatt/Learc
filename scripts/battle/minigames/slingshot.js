/* Slingshot — your foe is an evasive flying target! Pull back the pouch,
   read its movement, and lead your shot. A dotted line previews the arc.
   Bonk the foe enough times before you run out of stones. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, petImg, S } from '../util.js';

export default {
  id: 'slingshot', name: 'Slingshot', icon: '🪃',
  howto: 'Drag back to aim, release to fire — and LEAD the moving target!',

  play(area, ctx) {
    return new Promise(resolve => {
      const hp0 = 2 + Math.floor(ctx.difficulty / 4);   // 2..4 bonks to win
      let hp = hp0, stones = hp0 + 5, done = false;

      area.innerHTML = `
        <div class="sl-hud"><span>Foe HP <b id="hp">${'❤'.repeat(hp)}</b></span>
          <span>Stones <b id="st">${'●'.repeat(stones)}</b></span></div>
        <div class="sl-field" id="field">
          <div class="sl-traj" id="traj"></div>
          <div class="sl-foe" id="foe"><img src="${petImg(ctx.foe)}"></div>
          <div class="sl-reticle" id="reticle"></div>
          <div class="sl-stone" id="stone" hidden></div>
          <div class="sl-post" id="post"></div>
          <div class="sl-pouch" id="pouch"></div>
          <svg class="sl-band" id="band"><line id="b1"/><line id="b2"/></svg>
        </div>
        <div class="dg-hint">Drag back & release — lead the target!</div>`;
      const field = area.querySelector('#field'), foeEl = area.querySelector('#foe'), reticle = area.querySelector('#reticle');
      const stoneEl = area.querySelector('#stone'), traj = area.querySelector('#traj');
      const pouch = area.querySelector('#pouch'), post = area.querySelector('#post');
      const b1 = area.querySelector('#b1'), b2 = area.querySelector('#b2');
      const hpEl = area.querySelector('#hp'), stEl = area.querySelector('#st');

      let W = 0, H = 0, G = 0, K = 6.2, maxPull = 120;
      const anchor = { x: 0, y: 0 };
      const foe = { x: 0, y: 0, vx: 0, vy: 0, r: 36, tx: 0, ty: 0 };
      const bounds = () => ({ x0: W * 0.34, x1: W * 0.94, y0: H * 0.06, y1: H * 0.62 });
      const newWaypoint = () => { const b = bounds(); foe.tx = rand(b.x0, b.x1); foe.ty = rand(b.y0, b.y1); };
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        G = H * 1.5; maxPull = Math.min(W, H) * 0.36;
        anchor.x = W * 0.2; anchor.y = H * 0.78;
        foe.r = clamp(Math.min(W, H) * 0.11, 30, 48);
        post.style.left = anchor.x + 'px'; post.style.top = anchor.y + 'px';
        foeEl.style.width = foeEl.style.height = foe.r * 2 + 'px';
        reticle.style.width = reticle.style.height = foe.r * 2.5 + 'px';
      };
      measure(); window.addEventListener('resize', measure);
      const b0 = bounds(); foe.x = (b0.x0 + b0.x1) / 2; foe.y = (b0.y0 + b0.y1) / 2; newWaypoint();

      const foeSpd = 55 + ctx.difficulty * 16;          // flies faster with difficulty
      const wind = (ctx.difficulty >= 5 ? rand(-1, 1) * (ctx.difficulty - 4) * 14 : 0);
      let jitter = 0;

      let aiming = false, pull = { x: 0, y: 0 }, proj = null;
      const setPouch = (x, y) => { pouch.style.left = x + 'px'; pouch.style.top = y + 'px'; };
      const restPouch = () => setPouch(anchor.x, anchor.y);
      restPouch();

      const drawBands = (px, py) => {
        b1.setAttribute('x1', anchor.x - 10); b1.setAttribute('y1', anchor.y - 6); b1.setAttribute('x2', px); b1.setAttribute('y2', py);
        b2.setAttribute('x1', anchor.x + 10); b2.setAttribute('y1', anchor.y - 6); b2.setAttribute('x2', px); b2.setAttribute('y2', py);
      };
      const clearBands = () => { [b1, b2].forEach(b => { ['x1', 'y1', 'x2', 'y2'].forEach(a => b.setAttribute(a, 0)); }); };
      clearBands();

      const previewVel = () => ({ x: (anchor.x - pull.x) * K, y: (anchor.y - pull.y) * K });
      const drawTraj = () => {
        const v = previewVel(); let x = anchor.x, y = anchor.y, vx = v.x, vy = v.y, html = '';
        for (let i = 0; i < 22; i++) {
          const dt = 0.045; x += vx * dt; y += vy * dt; vy += G * dt; vx += wind * dt;
          if (x < -20 || x > W + 20 || y > H + 20) break;
          if (i % 2 === 0) html += `<span class="sl-dot" style="left:${x}px;top:${y}px"></span>`;
        }
        traj.innerHTML = html;
      };

      const down = e => { if (done || proj || stones <= 0) return; aiming = true; updatePull(e); e.preventDefault(); };
      const move = e => { if (aiming) { updatePull(e); e.preventDefault(); } };
      const upH = () => {
        if (!aiming) return; aiming = false;
        if (Math.hypot(anchor.x - pull.x, anchor.y - pull.y) < 14) { traj.innerHTML = ''; clearBands(); restPouch(); return; }
        const v = previewVel();
        proj = { x: anchor.x, y: anchor.y, vx: v.x, vy: v.y };
        stones--; stEl.textContent = '●'.repeat(Math.max(0, stones));
        stoneEl.hidden = false; stoneEl.style.left = anchor.x + 'px'; stoneEl.style.top = anchor.y + 'px';
        traj.innerHTML = ''; clearBands(); restPouch(); S.swipe(); buzz(20);
      };
      function updatePull(e) {
        const r = field.getBoundingClientRect();
        let dx = (e.clientX - r.left) - anchor.x, dy = (e.clientY - r.top) - anchor.y;
        const d = Math.hypot(dx, dy);
        if (d > maxPull) { dx = dx / d * maxPull; dy = dy / d * maxPull; }
        pull.x = anchor.x + dx; pull.y = anchor.y + dy;
        setPouch(pull.x, pull.y); drawBands(pull.x, pull.y); drawTraj();
      }
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', upH);

      const stop = loop((dt, now) => {
        if (done) return false;
        // wandering flight: steer toward waypoint, retarget when near
        jitter += dt;
        let dx = foe.tx - foe.x, dy = foe.ty - foe.y, d = Math.hypot(dx, dy) || 1;
        if (d < 24) newWaypoint();
        foe.x += (dx / d) * foeSpd * dt + Math.cos(jitter * 5) * 14 * dt;
        foe.y += (dy / d) * foeSpd * dt + Math.sin(jitter * 6) * 12 * dt;
        const b = bounds(); foe.x = clamp(foe.x, b.x0, b.x1); foe.y = clamp(foe.y, b.y0, b.y1);
        foeEl.style.left = (foe.x - foe.r) + 'px'; foeEl.style.top = (foe.y - foe.r) + 'px';
        reticle.style.left = foe.x + 'px'; reticle.style.top = foe.y + 'px';

        if (proj) {
          proj.x += proj.vx * dt; proj.y += proj.vy * dt; proj.vy += G * dt; proj.vx += wind * dt;
          stoneEl.style.left = proj.x + 'px'; stoneEl.style.top = proj.y + 'px';
          if (Math.hypot(proj.x - foe.x, proj.y - foe.y) < foe.r + 8) {
            sparkle(field, foe.x, foe.y, 9); floatText(area, foe.x, foe.y, 'BONK!', 'good');
            foeEl.classList.remove('hit'); void foeEl.offsetWidth; foeEl.classList.add('hit');
            hp--; hpEl.textContent = '❤'.repeat(Math.max(0, hp)); S.hit(); buzz(40);
            proj = null; stoneEl.hidden = true; newWaypoint();
            if (hp <= 0) return finish(true);
          } else if (proj.x < -30 || proj.x > W + 30 || proj.y > H + 30) {
            proj = null; stoneEl.hidden = true;
            if (stones <= 0) return finish(false);
          }
        }
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', upH);
        window.removeEventListener('resize', measure);
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (stones >= 3 ? 3 : stones >= 1 ? 2 : 2) : 1 });
        return false;
      }
    });
  }
};
