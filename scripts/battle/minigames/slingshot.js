/* Slingshot — pull back the pouch, aim the arc, and let fly! Bonk the foe
   enough times before you run out of stones. A dotted line previews your
   shot; the foe bobs (and the wind picks up) as difficulty climbs. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, petImg, S } from '../util.js';

export default {
  id: 'slingshot', name: 'Slingshot', icon: '🪃',
  howto: 'Drag back from the sling to aim, then release to fling a stone at the foe!',

  play(area, ctx) {
    return new Promise(resolve => {
      const hp0 = 3 + Math.floor(ctx.difficulty / 4);   // 3..5
      let hp = hp0, stones = hp0 + 4, done = false;

      area.innerHTML = `
        <div class="sl-hud"><span>Foe HP <b id="hp">${'❤'.repeat(hp)}</b></span>
          <span>Stones <b id="st">${'●'.repeat(stones)}</b></span></div>
        <div class="sl-field" id="field">
          <div class="sl-traj" id="traj"></div>
          <div class="sl-foe" id="foe"><img src="${petImg(ctx.foe)}"></div>
          <div class="sl-stone" id="stone" hidden></div>
          <div class="sl-post" id="post"></div>
          <div class="sl-pouch" id="pouch"></div>
          <svg class="sl-band" id="band"><line id="b1"/><line id="b2"/></svg>
        </div>
        <div class="dg-hint">Drag back & release to fire!</div>`;
      const field = area.querySelector('#field'), foeEl = area.querySelector('#foe');
      const stoneEl = area.querySelector('#stone'), traj = area.querySelector('#traj');
      const pouch = area.querySelector('#pouch'), post = area.querySelector('#post');
      const b1 = area.querySelector('#b1'), b2 = area.querySelector('#b2');
      const hpEl = area.querySelector('#hp'), stEl = area.querySelector('#st');

      let W = 0, H = 0, G = 0, K = 6.2, maxPull = 120;
      const anchor = { x: 0, y: 0 }, foe = { x: 0, y: 0, base: 0, r: 40 };
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        G = H * 1.5; maxPull = Math.min(W, H) * 0.36;
        anchor.x = W * 0.2; anchor.y = H * 0.74;
        foe.x = W * 0.8; foe.base = H * 0.42; foe.r = clamp(Math.min(W, H) * 0.13, 34, 60);
        post.style.left = anchor.x + 'px'; post.style.top = anchor.y + 'px';
        foeEl.style.width = foe.r * 2 + 'px'; foeEl.style.height = foe.r * 2 + 'px';
      };
      measure(); window.addEventListener('resize', measure);

      const foeAmp = clamp((ctx.difficulty - 2) * 5, 0, 60);
      const foeSpd = 1 + ctx.difficulty * 0.12;
      const wind = (ctx.difficulty >= 6 ? rand(-1, 1) * (ctx.difficulty - 5) * 16 : 0);
      let t = 0;

      let aiming = false, pull = { x: 0, y: 0 }, proj = null;
      const setPouch = (x, y) => { pouch.style.left = x + 'px'; pouch.style.top = y + 'px'; };
      const restPouch = () => setPouch(anchor.x, anchor.y);
      restPouch();

      const drawBands = (px, py) => {
        b1.setAttribute('x1', anchor.x - 10); b1.setAttribute('y1', anchor.y - 6); b1.setAttribute('x2', px); b1.setAttribute('y2', py);
        b2.setAttribute('x1', anchor.x + 10); b2.setAttribute('y1', anchor.y - 6); b2.setAttribute('x2', px); b2.setAttribute('y2', py);
      };
      const clearBands = () => { [b1, b2].forEach(b => { b.setAttribute('x1', 0); b.setAttribute('y1', 0); b.setAttribute('x2', 0); b.setAttribute('y2', 0); }); };
      clearBands();

      const previewVel = () => ({ x: (anchor.x - pull.x) * K, y: (anchor.y - pull.y) * K });
      const drawTraj = () => {
        const v = previewVel(); let x = anchor.x, y = anchor.y, vx = v.x, vy = v.y;
        let html = '';
        for (let i = 0; i < 22; i++) {
          const dt = 0.045; x += vx * dt; y += vy * dt; vy += G * dt; vx += wind * dt;
          if (x < -20 || x > W + 20 || y > H + 20) break;
          if (i % 2 === 0) html += `<span class="sl-dot" style="left:${x}px;top:${y}px"></span>`;
        }
        traj.innerHTML = html;
      };

      const down = e => {
        if (done || proj || stones <= 0) return;
        aiming = true; updatePull(e); e.preventDefault();
      };
      const move = e => { if (aiming) { updatePull(e); e.preventDefault(); } };
      const upH = e => {
        if (!aiming) return; aiming = false;
        const v = previewVel();
        if (Math.hypot(anchor.x - pull.x, anchor.y - pull.y) < 14) { traj.innerHTML = ''; clearBands(); restPouch(); return; } // tiny pull, cancel
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

      const stop = loop((dt) => {
        if (done) return false;
        t += dt;
        foe.y = foe.base + Math.sin(t * foeSpd) * foeAmp;
        foeEl.style.left = (foe.x - foe.r) + 'px'; foeEl.style.top = (foe.y - foe.r) + 'px';
        if (proj) {
          proj.x += proj.vx * dt; proj.y += proj.vy * dt; proj.vy += G * dt; proj.vx += wind * dt;
          stoneEl.style.left = proj.x + 'px'; stoneEl.style.top = proj.y + 'px';
          if (Math.hypot(proj.x - foe.x, proj.y - foe.y) < foe.r + 9) {
            sparkle(field, foe.x, foe.y, 9); floatText(area, foe.x, foe.y, 'BONK!', 'good');
            foeEl.classList.remove('hit'); void foeEl.offsetWidth; foeEl.classList.add('hit');
            hp--; hpEl.textContent = '❤'.repeat(Math.max(0, hp)); S.hit(); buzz(40);
            proj = null; stoneEl.hidden = true;
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
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (stones >= 3 ? 3 : stones >= 1 ? 2 : 2) : 1 });
        return false;
      }
    });
  }
};
