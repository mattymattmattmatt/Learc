/* Claw Machine — the crane sweeps across the tank. TAP to drop the claw and
   snag what's beneath it. Common 🐟 = 1, plump 🐠 = 2, rare golden 🐡 = 3.
   Chain catches for a COMBO bonus — but grab the junk 🥾 and your combo breaks.
   Reach the points goal before time runs out. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, S } from '../util.js';

export default {
  id: 'clawdrop', name: 'Claw Machine', icon: '🕹️',
  howto: 'TAP to drop the claw onto a fish. Golden fish are worth most — chain catches for combos, dodge the junk!',

  play(area, ctx) {
    return new Promise(resolve => {
      const goal = 7 + Math.min(ctx.difficulty, 8);    // points to win
      const TIME = 24;
      let score = 0, combo = 0, left = TIME, done = false;

      area.innerHTML = `
        <div class="cw-hud"><span>💎 <b id="sc">0</b>/${goal}</span>
          <span id="combo" class="cw-combo"></span>
          <div class="cw-time"><div class="cw-fill" id="tf"></div></div></div>
        <div class="cw-field" id="field">
          <span class="cw-bubble b1"></span><span class="cw-bubble b2"></span><span class="cw-bubble b3"></span>
          <div class="cw-rail"></div>
          <div class="cw-rope" id="rope"></div>
          <div class="cw-claw" id="claw">🦀</div>
        </div>
        <button class="tap-pad" id="pad">DROP CLAW!</button>`;
      const field = area.querySelector('#field'), claw = area.querySelector('#claw'), rope = area.querySelector('#rope');
      const scEl = area.querySelector('#sc'), tf = area.querySelector('#tf'), pad = area.querySelector('#pad'), comboEl = area.querySelector('#combo');

      let W = 0, H = 0, topY = 18, botY = 0, clawW = 44, grabW = 40;
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        topY = 18; botY = H * 0.78; clawW = clamp(W * 0.13, 38, 62); grabW = clawW * 0.95;
        claw.style.width = clawW + 'px';
      };
      measure(); window.addEventListener('resize', measure);

      const items = [];
      const junkChance = clamp((ctx.difficulty - 2) * 0.05, 0, 0.42);
      const makeType = () => {
        if (Math.random() < junkChance) return { kind: 'junk', val: 0, emoji: '🥾', cls: ' junk' };
        const r = Math.random();
        if (r < 0.12) return { kind: 'gold', val: 3, emoji: '🐡', cls: ' gold' };
        if (r < 0.42) return { kind: 'big', val: 2, emoji: '🐠', cls: ' big' };
        return { kind: 'fish', val: 1, emoji: '🐟', cls: '' };
      };
      const spawnSlot = () => {
        for (let i = 0; i < 8; i++) {
          const x = rand(clawW, W - clawW);
          if (items.every(it => Math.abs(it.x - x) > clawW * 1.2)) {
            const ty = makeType();
            const n = el('div', 'cw-item' + ty.cls, ty.emoji);
            field.appendChild(n);
            items.push({ node: n, x, val: ty.val, kind: ty.kind, bob: rand(0, 6.28), grabbed: false }); return;
          }
        }
      };
      for (let i = 0; i < 5; i++) spawnSlot();

      const sweepSpd = Math.min(1.05, 0.42 + ctx.difficulty * 0.05);
      let t = 0, phase = 'sweep', clawX = W / 2, clawY = topY, held = null;
      const dropV = H * 1.9;
      const showCombo = () => { comboEl.textContent = combo >= 2 ? `🔥 Combo ×${combo}` : ''; };

      const drop = e => { e && e.preventDefault(); if (done || phase !== 'sweep') return; phase = 'down'; S.swipe(); buzz(15); };
      pad.addEventListener('pointerdown', drop);

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';

        if (phase === 'sweep') { t += dt * sweepSpd; const p = t % 1, m = Math.floor(t) % 2; clawX = (m === 0 ? p : 1 - p) * (W - clawW) + clawW / 2; }
        else if (phase === 'down') {
          clawY += dropV * dt;
          if (clawY >= botY) {
            clawY = botY;
            let hit = -1, bd = grabW;
            items.forEach((it, i) => { if (it.grabbed) return; const d = Math.abs(it.x - clawX); if (d < bd) { bd = d; hit = i; } });
            claw.classList.add('grab'); setTimeout(() => claw.classList.remove('grab'), 220);
            if (hit >= 0) { held = items[hit]; held.grabbed = true; held.node.classList.add('held'); S.good(); buzz(20); }
            else { S.bad(); combo = 0; showCombo(); }
            phase = 'up';
          }
        } else if (phase === 'up') {
          clawY -= dropV * dt;
          if (held) { held.node.style.left = (clawX - 14) + 'px'; held.node.style.top = (clawY) + 'px'; }
          if (clawY <= topY) {
            clawY = topY;
            if (held) {
              const i = items.indexOf(held); if (i >= 0) items.splice(i, 1);
              if (held.val > 0) {
                combo++; const bonus = combo >= 2 ? 1 : 0; const gain = held.val + bonus;
                score += gain; scEl.textContent = score; showCombo();
                sparkle(field, clawX, topY + 20, held.kind === 'gold' ? 12 : 7);
                floatText(area, clawX, topY + 24, bonus ? `+${held.val} +${bonus}🔥` : `+${held.val}`, 'good');
                S.star(); buzz(held.kind === 'gold' ? 35 : 25);
              } else {
                combo = 0; showCombo(); floatText(area, clawX, topY + 24, 'Junk! 🥾', 'bad'); S.bad(); buzz(50);
              }
              held.node.remove(); held = null;
              setTimeout(() => { if (!done) spawnSlot(); }, 360);
              if (score >= goal) return finish(true);
            }
            phase = 'sweep';
          }
        }
        claw.style.left = (clawX - clawW / 2) + 'px'; claw.style.top = clawY + 'px';
        rope.style.left = clawX + 'px'; rope.style.height = Math.max(0, clawY - topY + 6) + 'px';
        for (const it of items) { if (it === held) continue; it.bob += dt; it.node.style.left = (it.x - 14) + 'px'; it.node.style.top = (botY + Math.sin(it.bob * 2) * 5) + 'px'; }
        if (left <= 0) return finish(score >= goal);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        pad.removeEventListener('pointerdown', drop); window.removeEventListener('resize', measure);
        items.forEach(it => it.node.remove());
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (left > TIME * 0.35 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
