/* Reel It In — Snapper's game.
   Snapper hauls fish up from the deep with its claw. A fish darts up and down
   the water column; you HOLD to reel your claw-grip UP and RELEASE to let it
   sink. Keep the fish inside the grip to fill the CATCH meter — but whenever
   the fish slips out, the ESCAPE meter climbs, and if it fills the fish gets
   away (and costs a heart). Land enough fish to win. Erratic fish and a tight
   grip make it a real fight. (Canvas-rendered; ctx.difficulty scales the
   fish's speed, the grip size and how fast fish bolt.) */
import { clamp, rand, loop, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'reelin', name: 'Reel It In', icon: '🎣',
  howto: 'HOLD to reel your claw UP, release to let it sink. Keep the darting fish 🐟 inside the grip to land it — let it slip away too long and it’s gone!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const accent = (ctx.theme && ctx.theme.color) || '#ff7a5a';

      // ── tuning (pressure knobs cap at dp=9; only the goal climbs past that) ──
      const dp        = Math.min(d, 9);
      const goal      = 4 + Math.round(d * 0.4);             // fish to land (~7 on Normal)
      const zoneHF    = clamp(0.24 - dp * 0.013, 0.12, 0.24); // grip height (fraction of column)
      const fishF     = 0.3 + dp * 0.025;                    // fish speed (kept below grip speed so it's trackable)
      const retargetN = () => clamp(1.0 - dp * 0.06, 0.38, 1.0) * rand(0.7, 1.5);
      const dartP     = clamp(0.16 + dp * 0.035, 0.16, 0.5); // chance a move is a long bolt
      const fillRate  = clamp(0.55 - dp * 0.012, 0.4, 0.55); // catch fills (per s in-grip)
      const cDrain    = 0.24 + dp * 0.02;                    // catch drains (per s out)
      const escRate   = 0.42 + dp * 0.04;                    // escape fills (per s out) — a real threat
      const escRecover= 0.5;                                  // escape recovers slowly (slips add up)
      let health = 3;

      area.innerHTML = `
        <div class="rl-wrap" style="--accent:${accent}">
          <canvas class="rl-cv" id="cv"></canvas>
          <div class="rl-hud">
            <span class="rl-life" id="life"></span>
            <span class="rl-prog">🎣 <b id="cnt">0</b>/${goal}</span>
          </div>
          <button class="rl-quit" id="quit">✕</button>
          <div class="dg-hint">Hold to reel up · release to sink · keep the fish in the grip</div>
        </div>`;
      const wrap = area.querySelector('.rl-wrap');
      const cv = area.querySelector('#cv'), g = cv.getContext('2d');
      const cnt = area.querySelector('#cnt'), lifeEl = area.querySelector('#life'), quit = area.querySelector('#quit');

      let W = 0, H = 0, dpr = 1, colTop = 0, colBot = 0, colH = 0, fishX = 0, zoneH = 0;
      function measure() {
        const r = cv.getBoundingClientRect();
        W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        colTop = H * 0.18; colBot = H * 0.92; colH = colBot - colTop;
        fishX = W * 0.46; zoneH = colH * zoneHF;
      }
      measure(); window.addEventListener('resize', measure);

      const heroImg = new Image(); let heroReady = false;
      heroImg.onload = () => heroReady = true;
      heroImg.src = petImg(ctx.hero);

      // ── state ──
      let zoneY = 0, zoneVy = 0, holding = false;
      let fishY = 0, fishTargetY = 0, fishMul = 1, retargetT = 0, fishWobble = 0;
      let c = 0, e = 0, score = 0, done = false, msg = '', msgT = 0, flash = 0, shake = 0, bob = 0;
      const bubbles = Array.from({ length: 9 }, () => ({ x: rand(0, 1), y: rand(0, 1), s: rand(2, 6), v: rand(0.04, 0.12) }));

      function newFish() {
        fishMul = rand(0.9, 1.1);
        fishY = rand(colTop + zoneH, colBot - zoneH);
        fishTargetY = rand(colTop, colBot);
        retargetT = retargetN();
        c = 0; e = 0;
      }
      function init() { zoneY = colTop + colH * 0.5; zoneVy = 0; newFish(); }
      init();

      function renderLife() {
        lifeEl.innerHTML = '❤'.repeat(health) + '<span class="rl-dim">❤</span>'.repeat(3 - health);
      }
      renderLife();

      function caught() {
        score++; cnt.textContent = score; S.star(); sfx('catch.wav', 0.7); buzz(28); msg = 'Hooked! 🎣'; msgT = 0.9;
        if (score >= goal) return win();
        newFish();
      }
      function escaped() {
        health--; renderLife(); S.bad(); buzz(90); flash = 1; shake = 1; msg = 'It got away! 💨'; msgT = 0.9;
        if (health <= 0) return lose();
        newFish();
      }

      // read-only state so an automated playtest can reel
      try {
        window.__rl = {
          get fishY() { return fishY; }, get zoneY() { return zoneY; }, get zoneH() { return zoneH; },
          get colTop() { return colTop; }, get colBot() { return colBot; },
          get score() { return score; }, get goal() { return goal; }, get health() { return health; },
          get c() { return c; }, get e() { return e; }, get done() { return done; },
          set holding(v) { holding = !!v; }
        };
      } catch {}

      const onDown = e2 => { if (e2.target === quit || done) return; e2.preventDefault(); holding = true; };
      const onUp = () => { holding = false; };
      wrap.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      quit.addEventListener('pointerdown', e2 => { e2.stopPropagation(); finish(false); });

      const stop = loop(dt => {
        if (done) return false;
        bob += dt; if (msgT > 0) msgT = Math.max(0, msgT - dt);
        if (flash > 0) flash = Math.max(0, flash - dt * 2);
        if (shake > 0) shake = Math.max(0, shake - dt * 4);

        // reel control: hold = reel UP, release = sink DOWN. Velocity-based with
        // a touch of smoothing so it's responsive (controllable) but not stiff.
        const UPV = colH * 1.1, DOWNV = colH * 0.95, RESP = 15;
        const targetV = holding ? -UPV : DOWNV;
        zoneVy += (targetV - zoneVy) * Math.min(1, dt * RESP);
        zoneY += zoneVy * dt;
        if (zoneY < colTop + zoneH / 2) { zoneY = colTop + zoneH / 2; zoneVy = Math.max(0, zoneVy); }
        if (zoneY > colBot - zoneH / 2) { zoneY = colBot - zoneH / 2; zoneVy = Math.min(0, zoneVy); }

        // fish AI: ease toward a target, occasionally bolt; small constant wobble
        retargetT -= dt; fishWobble += dt;
        if (retargetT <= 0) {
          fishTargetY = (Math.random() < dartP)
            ? (fishY < (colTop + colBot) / 2 ? rand(colBot - colH * 0.35, colBot) : rand(colTop, colTop + colH * 0.35))
            : rand(colTop, colBot);
          retargetT = retargetN();
        }
        // the fish fights a little harder the closer you are to landing it
        const sp = colH * fishF * fishMul * (1 + c * 0.5) * dt;
        fishY += clamp(fishTargetY - fishY, -sp, sp);
        fishY += Math.sin(fishWobble * 7) * colH * 0.0016;
        fishY = clamp(fishY, colTop, colBot);

        // catch / escape meters
        const inZone = Math.abs(fishY - zoneY) < zoneH / 2;
        if (inZone) { c = clamp(c + fillRate * dt, 0, 1); e = Math.max(0, e - escRecover * dt); }
        else { c = Math.max(0, c - cDrain * dt); e = clamp(e + escRate * dt, 0, 1); }
        if (c >= 1) { caught(); if (done) return false; }
        else if (e >= 1) { escaped(); if (done) return false; }

        for (const b of bubbles) { b.y -= b.v * dt; if (b.y < 0) { b.y = 1; b.x = rand(0, 1); } }
        draw(inZone);
      });

      // ── drawing ──
      const hexA = (hex, a) => {
        const h = hex.replace('#', '');
        const n = h.length === 3 ? h.split('').map(x => x + x).join('') : h;
        const r = parseInt(n.slice(0, 2), 16), gg = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
        return `rgba(${r},${gg},${b},${a})`;
      };
      function drawFish(x, y, s, dir) {
        g.save(); g.translate(x, y); g.scale(dir, 1);
        g.fillStyle = '#ff9a5a'; g.strokeStyle = '#fff'; g.lineWidth = 2;
        g.beginPath(); g.ellipse(0, 0, s, s * 0.62, 0, 0, 6.28); g.fill(); g.stroke();
        g.beginPath(); g.moveTo(-s * 0.8, 0); g.lineTo(-s * 1.5, -s * 0.6); g.lineTo(-s * 1.5, s * 0.6); g.closePath(); g.fillStyle = '#ff7a3a'; g.fill();
        g.beginPath(); g.arc(s * 0.45, -s * 0.18, s * 0.13, 0, 6.28); g.fillStyle = '#222'; g.fill();
        g.restore();
      }
      function draw(inZone) {
        g.save();
        if (shake > 0) { const m = shake * 6; g.translate(rand(-m, m), rand(-m, m)); }
        // water
        const grd = g.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#bfe9ff'); grd.addColorStop(0.32, '#5fb8ee'); grd.addColorStop(1, '#1f5e9e');
        g.fillStyle = grd; g.fillRect(-30, -30, W + 60, H + 60);
        g.fillStyle = 'rgba(255,255,255,.22)';
        for (const b of bubbles) { g.beginPath(); g.arc(b.x * W, colTop + b.y * colH, b.s, 0, 6.28); g.fill(); }

        // reel line from Snapper down to the grip
        g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(fishX, H * 0.04); g.lineTo(fishX, zoneY); g.stroke();

        // the grip (catch zone) — green when the fish is inside, orange when not
        const zc = inZone ? '#5fe08a' : accent;
        g.fillStyle = hexA(zc, 0.22); g.strokeStyle = hexA(zc, 0.95); g.lineWidth = 3;
        const zx = W * 0.16, zw = W * 0.6;
        roundRect(zx, zoneY - zoneH / 2, zw, zoneH, 12); g.fill(); g.stroke();
        // claw pincers at the grip edges
        g.fillStyle = hexA(zc, 0.95);
        g.beginPath(); g.moveTo(zx, zoneY - zoneH / 2); g.lineTo(zx - 14, zoneY - zoneH / 2 - 8); g.lineTo(zx - 14, zoneY - zoneH / 2 + 10); g.closePath(); g.fill();
        g.beginPath(); g.moveTo(zx, zoneY + zoneH / 2); g.lineTo(zx - 14, zoneY + zoneH / 2 + 8); g.lineTo(zx - 14, zoneY + zoneH / 2 - 10); g.closePath(); g.fill();

        // the fish
        drawFish(fishX, fishY, clamp(colH * 0.045, 12, 22), Math.sin(bob * 4) > 0 ? 1 : -1);

        // catch + escape meters on the right
        const bx = W - 26, by = colTop, bh = colH;
        g.fillStyle = 'rgba(0,0,0,.22)'; roundRect(bx, by, 12, bh, 6); g.fill();
        g.fillStyle = '#5fe08a'; roundRect(bx, by + bh * (1 - c), 12, bh * c, 6); g.fill();
        const ex = W - 44;
        g.fillStyle = 'rgba(0,0,0,.22)'; roundRect(ex, by, 8, bh, 5); g.fill();
        g.fillStyle = '#ff5a6a'; roundRect(ex, by + bh * (1 - e), 8, bh * e, 5); g.fill();

        // Snapper at the surface
        const hr = clamp(Math.min(W, H) * 0.075, 24, 42), hy = H * 0.04 + Math.sin(bob * 5) * 2;
        if (heroReady) { g.save(); g.translate(fishX, hy); g.drawImage(heroImg, -hr, -hr, hr * 2, hr * 2); g.restore(); }

        if (msgT > 0) {
          g.globalAlpha = clamp(msgT / 0.9, 0, 1);
          g.fillStyle = '#fff'; g.font = `700 ${Math.round(H * 0.045)}px system-ui, sans-serif`;
          g.textAlign = 'center'; g.fillText(msg, W * 0.46, H * 0.5); g.globalAlpha = 1; g.textAlign = 'start';
        }
        if (flash > 0) { g.fillStyle = hexA('#ff3b3b', flash * 0.3); g.fillRect(-30, -30, W + 60, H + 60); }
        g.restore();
      }
      function roundRect(x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        g.beginPath();
        g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
        g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
      }
      draw(false);

      function win() { if (done) return; S.win(); buzz(40); finish(true); }
      function lose() { if (done) return; S.lose(); buzz(120); finish(false); }
      function finish(winFlag) {
        if (done) return false; done = true; stop();
        window.removeEventListener('resize', measure);
        wrap.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
        try { delete window.__rl; } catch {}
        if (!winFlag) sfx(ctx.foe.sfx, 0.7);
        resolve({ win: winFlag, stars: winFlag ? clamp(health, 1, 3) : 1 });
        return false;
      }
    });
  }
};
