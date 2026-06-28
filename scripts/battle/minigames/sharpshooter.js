/* Sharpshooter — a flying-target gallery. TAP to fire at the clay disks as
   they arc across. Six shots per clip, then a quick reload. Hit your quota
   before time runs out — and don't shoot the bombs! */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, S } from '../util.js';

export default {
  id: 'sharpshooter', name: 'Sharpshooter', icon: '🎯',
  howto: 'TAP to shoot the flying targets! Reload when your clip is empty. Avoid bombs 💣.',

  play(area, ctx) {
    return new Promise(resolve => {
      const goal = 9 + Math.min(ctx.difficulty, 10);   // capped — clip + reload throughput is the limit
      const TIME = 20, CLIP = 6;
      let score = 0, ammo = CLIP, reloading = false, left = TIME, done = false;

      area.innerHTML = `
        <div class="ss-hud"><span>🎯 <b id="sc">0</b>/${goal}</span>
          <span id="ammo" class="ss-ammo"></span>
          <div class="ss-time"><div class="ss-fill" id="tf"></div></div></div>
        <div class="ss-field" id="field"><div class="ss-cross" id="cross" hidden>✛</div></div>
        <div class="dg-hint" id="hint">Tap to shoot!</div>`;
      const field = area.querySelector('#field'), scEl = area.querySelector('#sc');
      const ammoEl = area.querySelector('#ammo'), tf = area.querySelector('#tf');
      const cross = area.querySelector('#cross');

      const drawAmmo = () => { ammoEl.innerHTML = reloading ? '<span class="ss-reload">RELOADING…</span>' : ('🔸'.repeat(ammo) + '▫️'.repeat(CLIP - ammo)); };
      drawAmmo();

      let W = 0, H = 0;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; };
      measure(); window.addEventListener('resize', measure);

      const targets = [];
      const tSpeed = 140 + ctx.difficulty * 20;
      const bombChance = clamp((ctx.difficulty - 3) * 0.05, 0, 0.32);
      let acc = 0, every = clamp(1.1 - ctx.difficulty * 0.06, 0.42, 1.1);

      function spawn() {
        const bomb = Math.random() < bombChance;
        const fromL = Math.random() < 0.5;
        const r = clamp(Math.min(W, H) * (bomb ? 0.085 : 0.075), 22, 40);
        const node = el('div', 'ss-target' + (bomb ? ' bomb' : ''), bomb ? '💣' : ((ctx.theme && ctx.theme.proj) || ''));
        node.style.width = node.style.height = r * 2 + 'px';
        const y = rand(H * 0.25, H * 0.7);
        const x = fromL ? -r : W + r;
        const vx = (fromL ? 1 : -1) * tSpeed * rand(0.85, 1.15);
        const vy = -rand(40, 120);
        node.style.transform = `translate3d(${x - r}px,${y - r}px,0)`;
        field.appendChild(node);
        targets.push({ node, x, y, vx, vy, r, bomb, life: 0 });
      }

      const fireAt = (cx, cy) => {
        if (reloading) { return; }
        if (ammo <= 0) { startReload(); return; }
        ammo--; drawAmmo(); S.hit(); buzz(18);
        cross.hidden = false; cross.style.left = cx + 'px'; cross.style.top = cy + 'px';
        cross.classList.remove('fire'); void cross.offsetWidth; cross.classList.add('fire');
        // hit-test (nearest target under the shot)
        let hitT = null;
        for (const t of targets) if (!t.dead && Math.hypot(t.x - cx, t.y - cy) < t.r + 6) { hitT = t; break; }
        if (hitT) {
          hitT.dead = true;
          // pin to its current spot so the scale/pop animation plays in place
          hitT.node.style.transform = 'none';
          hitT.node.style.left = (hitT.x - hitT.r) + 'px'; hitT.node.style.top = (hitT.y - hitT.r) + 'px';
          hitT.node.classList.add(hitT.bomb ? 'boom' : 'pop');
          setTimeout(() => hitT.node.remove(), 160);
          if (hitT.bomb) { score = Math.max(0, score - 2); floatText(area, cx, cy, '💥 −2', 'bad'); S.bad(); buzz(70); field.classList.add('flash'); setTimeout(() => field.classList.remove('flash'), 120); }
          else { score++; scEl.textContent = score; sparkle(field, cx, cy, 7); floatText(area, cx, cy, 'HIT!', 'good'); S.star(); if (score >= goal) return finish(true); }
        }
        if (ammo <= 0) startReload();
      };
      function startReload() {
        if (reloading) return; reloading = true; drawAmmo();
        setTimeout(() => { ammo = CLIP; reloading = false; drawAmmo(); }, 1000);
      }

      const onDown = e => { e.preventDefault(); const r = field.getBoundingClientRect(); fireAt(e.clientX - r.left, e.clientY - r.top); };
      field.addEventListener('pointerdown', onDown);

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        acc += dt; if (acc >= every) { acc = 0; spawn(); if (ctx.difficulty >= 7) spawn(); }
        for (let i = targets.length - 1; i >= 0; i--) {
          const t = targets[i];
          if (t.dead) { if (!t.node.isConnected) targets.splice(i, 1); continue; }
          t.x += t.vx * dt; t.y += t.vy * dt; t.vy += H * 0.5 * dt; t.life += dt;
          t.node.style.transform = `translate3d(${t.x - t.r}px,${t.y - t.r}px,0)`;
          if (t.x < -60 || t.x > W + 60 || t.y > H + 60) { t.node.remove(); targets.splice(i, 1); }
        }
        if (left <= 0) return finish(score >= goal);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', onDown);
        window.removeEventListener('resize', measure);
        targets.forEach(t => t.node.remove());
        if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 60);
        resolve({ win, stars: win ? (left > TIME * 0.25 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
