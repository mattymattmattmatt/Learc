/* Slingshot — Roger Dodger's Untouchable Dance.

   The old version wandered the target to random waypoints, so "lead your shot"
   was guesswork: you could not know where the foe would be when the stone
   arrived. Now he glides a steady, readable sweep — leading him is a genuine
   skill — and the difficulty comes from his dodge instead.

   He carries dodge charges (the ◆ pips). A stone that gets close while he has
   one left is snapped away from at the last instant, and the charge is spent.
   Charges come back on a timer. So the game is a rhythm: bait his dodges out,
   then land the shot while he has none left. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, petImg, S } from '../util.js';

export default {
  id: 'slingshot', name: 'Slingshot', icon: '🪃',
  howto: 'Drag back to aim, release to fire. He DODGES while he has ◆ left — bait them out, then hit him while he is empty!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const hp0 = 2 + Math.floor(d / 4);                    // 3 bonks on Normal
      const dodgeMax = clamp(1 + Math.floor(d / 4), 1, 3);  // 2 charges on Normal
      const rechargeEvery = clamp(3.6 - d * 0.18, 1.8, 3.6);   // baiting has to stick long enough to use
      const sweepT = clamp(3.4 - d * 0.15, 1.6, 3.4);       // seconds per sweep
      const stones0 = hp0 * 5;                              // ~2 to bait, 1 to land, per bonk

      let hp = hp0, stones = stones0, dodges = dodgeMax, rechT = rechargeEvery, done = false;

      area.innerHTML = `
        <div class="sl-hud"><span>Foe HP <b id="hp">${'❤'.repeat(hp)}</b></span>
          <span>Dodges <b id="dg">${'◆'.repeat(dodges)}</b></span>
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
        <div class="dg-hint">Bait out his ◆ dodges, then strike!</div>`;
      const field = area.querySelector('#field'), foeEl = area.querySelector('#foe'), reticle = area.querySelector('#reticle');
      const stoneEl = area.querySelector('#stone'), traj = area.querySelector('#traj');
      const pouch = area.querySelector('#pouch'), post = area.querySelector('#post');
      const b1 = area.querySelector('#b1'), b2 = area.querySelector('#b2');
      const hpEl = area.querySelector('#hp'), stEl = area.querySelector('#st'), dgEl = area.querySelector('#dg');

      let W = 0, H = 0, G = 0, maxPull = 120;
      const K = 6.2;
      const anchor = { x: 0, y: 0 };
      // ox/oy are the dodge offset, eased toward otx/oty so the dash reads as a
      // snap sideways rather than a teleport.
      const foe = { x: 0, y: 0, r: 36, ox: 0, oy: 0, otx: 0, oty: 0, dashT: 0 };
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

      /* The readable part: a steady sweep with a gentle bob. Same every lap, so
         you can watch one pass and know where he'll be for the next. */
      let t = 0;
      const pathAt = time => {
        const midX = W * 0.64, ampX = W * 0.26;
        const midY = H * 0.3, ampY = H * 0.16;
        const w = (Math.PI * 2) / sweepT;
        return { x: midX + Math.sin(time * w) * ampX, y: midY + Math.sin(time * w * 2) * ampY };
      };

      const renderPips = () => { dgEl.textContent = dodges > 0 ? '◆'.repeat(dodges) : '—'; };

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
          const dt = 0.045; x += vx * dt; y += vy * dt; vy += G * dt;
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
        proj = { x: anchor.x, y: anchor.y, vx: v.x, vy: v.y, baited: false };
        stones--; stEl.textContent = '●'.repeat(Math.max(0, stones));
        stoneEl.hidden = false; stoneEl.style.left = anchor.x + 'px'; stoneEl.style.top = anchor.y + 'px';
        traj.innerHTML = ''; clearBands(); restPouch(); S.shoot(); buzz(20);
      };
      function updatePull(e) {
        const r = field.getBoundingClientRect();
        let dx = (e.clientX - r.left) - anchor.x, dy = (e.clientY - r.top) - anchor.y;
        const dd = Math.hypot(dx, dy);
        if (dd > maxPull) { dx = dx / dd * maxPull; dy = dy / dd * maxPull; }
        pull.x = anchor.x + dx; pull.y = anchor.y + dy;
        setPouch(pull.x, pull.y); drawBands(pull.x, pull.y); drawTraj();
      }
      const cancelAim = () => { if (!aiming) return; aiming = false; traj.innerHTML = ''; clearBands(); restPouch(); };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', upH);
      window.addEventListener('pointercancel', cancelAim);

      const stop = loop((dt) => {
        if (done) return false;
        t += dt;

        // dodge charges tick back up
        if (dodges < dodgeMax) {
          rechT -= dt;
          if (rechT <= 0) { dodges++; rechT = rechargeEvery; renderPips(); }
        }

        // path + easing dodge offset
        const pos = pathAt(t);
        if (foe.dashT > 0) { foe.dashT -= dt; if (foe.dashT <= 0) { foe.otx = 0; foe.oty = 0; } }
        const k = Math.min(1, dt * 14);
        foe.ox += (foe.otx - foe.ox) * k;
        foe.oy += (foe.oty - foe.oy) * k;
        foe.x = clamp(pos.x + foe.ox, foe.r, W - foe.r);
        foe.y = clamp(pos.y + foe.oy, foe.r, H * 0.66);
        foeEl.style.left = (foe.x - foe.r) + 'px'; foeEl.style.top = (foe.y - foe.r) + 'px';
        reticle.style.left = foe.x + 'px'; reticle.style.top = foe.y + 'px';
        reticle.classList.toggle('spent', dodges === 0);

        if (proj) {
          proj.x += proj.vx * dt; proj.y += proj.vy * dt; proj.vy += G * dt;
          stoneEl.style.left = proj.x + 'px'; stoneEl.style.top = proj.y + 'px';
          const dist = Math.hypot(proj.x - foe.x, proj.y - foe.y);

          // one dodge per stone, and only while he has a charge left
          if (!proj.baited && dodges > 0 && dist < foe.r * 2.0) {
            proj.baited = true;
            dodges--; renderPips();
            if (dodges < dodgeMax) rechT = rechargeEvery;
            // snap perpendicular to the stone's flight, away from where it's headed
            const sv = Math.hypot(proj.vx, proj.vy) || 1;
            let px = -proj.vy / sv, py = proj.vx / sv;
            if ((foe.x - proj.x) * px + (foe.y - proj.y) * py < 0) { px = -px; py = -py; }
            foe.otx = px * foe.r * 2.6; foe.oty = py * foe.r * 2.0; foe.dashT = 0.3;
            foeEl.classList.remove('dodge'); void foeEl.offsetWidth; foeEl.classList.add('dodge');
            floatText(area, foe.x, foe.y - foe.r, 'Dodged!', 'bad');
            S.swipe(); buzz(12);
          }

          if (dist < foe.r + 8) {
            sparkle(field, foe.x, foe.y, 9); floatText(area, foe.x, foe.y, 'BONK!', 'good');
            foeEl.classList.remove('hit'); void foeEl.offsetWidth; foeEl.classList.add('hit');
            hp--; hpEl.textContent = '❤'.repeat(Math.max(0, hp)); S.slingThwack(); buzz(40);
            proj = null; stoneEl.hidden = true;
            if (hp <= 0) return finish(true);
            // A landed hit also ends the round when it was the last stone —
            // otherwise the game sits there with nothing left to throw and no
            // projectile in flight, waiting for an outcome that cannot arrive.
            if (stones <= 0) return finish(false);
          } else if (proj.x < -30 || proj.x > W + 30 || proj.y > H + 30) {
            proj = null; stoneEl.hidden = true;
            if (stones <= 0) return finish(false);
          }
        }
      });

      renderPips();

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', upH);
        window.removeEventListener('pointercancel', cancelAim); window.removeEventListener('resize', measure);
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (stones >= Math.ceil(stones0 * 0.3) ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
