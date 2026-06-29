/* Sonic Screech — Yellogen's game (Missile-Command style).
   Yellogen is a flying, ear-splitting screecher, so she sits at the bottom of
   the sky and crystals rain down from above. TAP where you want to intercept:
   a screech blast launches up to that spot and detonates, and its shockwave
   shatters any crystal caught in it. No cooldown — fire as fast as you like —
   but the blast takes a moment to fly up, so lead the falling crystals. Bigger
   crystals fall faster. Let one reach the bottom and it bonks a feather; lose
   all three and you're out. (Canvas-rendered; ctx.difficulty scales the storm.) */
import { clamp, rand, loop, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'screech', name: 'Sonic Screech', icon: '🔊',
  howto: 'TAP just above the falling crystals 💎 to launch a screech 🔊 — it flies up and bursts, shattering everything nearby. Don’t let them reach the bottom!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const accent = (ctx.theme && ctx.theme.color) || '#ffd23f';

      // ── tuning (Yellogen runs at d≈7-8 on Normal, ~12-13 on Hard) ──
      // "Pressure" knobs cap at dp=9 so Hard stays intense but winnable;
      // only the goal keeps climbing with real difficulty.
      const dp        = Math.min(d, 9);
      const goal      = 17 + Math.round(d * 1.0);             // ~25 on Normal, ~29 on Hard
      const fallBase  = 84 + dp * 13;                         // base fall speed (px/s)
      const spawnGap  = () => clamp(0.9 - dp * 0.05, 0.4, 0.9);
      const burstP    = clamp(0.2 + dp * 0.04, 0.2, 0.56);    // chance crystals fall as a spread pair
      const blastF    = clamp(0.17 - dp * 0.003, 0.14, 0.17); // blast radius (fraction of min(W,H))
      const MISSILE_V = 1020;                                  // screech-blast travel speed (px/s)
      const RING_T    = 0.28;                                  // blast expand time (s)
      let health = 3;

      area.innerHTML = `
        <div class="sc-wrap" style="--accent:${accent}">
          <canvas class="sc-cv" id="cv"></canvas>
          <div class="sc-hud">
            <span class="sc-life" id="life"></span>
            <span class="sc-prog">🔊 <b id="cnt">0</b>/${goal}</span>
          </div>
          <button class="sc-quit" id="quit">✕</button>
          <div class="dg-hint">Tap above the crystals 💎 — blast them before they land</div>
        </div>`;
      const wrap = area.querySelector('.sc-wrap');
      const cv = area.querySelector('#cv'), g = cv.getContext('2d');
      const cnt = area.querySelector('#cnt'), lifeEl = area.querySelector('#life');
      const quit = area.querySelector('#quit');

      let W = 0, H = 0, dpr = 1, heroX = 0, heroY = 0, heroR = 0, groundY = 0;
      function measure() {
        const r = cv.getBoundingClientRect();
        W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        heroR = clamp(Math.min(W, H) * 0.085, 26, 46);
        heroX = W * 0.5; heroY = H - heroR * 1.15; groundY = H * 0.85;
      }
      measure(); window.addEventListener('resize', measure);

      const heroImg = new Image(); let heroReady = false;
      heroImg.onload = () => heroReady = true;
      heroImg.src = petImg(ctx.hero);

      // ── entities ──
      const crystals = [];   // {x,y,vx,vy,rot,vrot,size,dead}
      const missiles = [];   // {x,y,tx,ty,vx,vy,dist,traveled,boom}
      const blasts = [];     // {x,y,r,max,done}
      const shards = [];     // {x,y,vx,vy,life,rot,c}
      const clouds = Array.from({ length: 4 }, () => ({ x: rand(0, 1), y: rand(0.06, 0.5), s: rand(0.55, 1.15), v: rand(0.012, 0.03) }));

      const sizeMin = () => heroR * 0.55, sizeMax = () => heroR * 1.12;
      let shattered = 0, bob = 0, pulse = 0, hurt = 0, shake = 0;
      let spawnT = 0.3, done = false;
      const launchY = () => heroY - heroR * 0.7;
      const blastR = () => Math.min(W, H) * blastF;

      function renderLife() {
        lifeEl.innerHTML = '🪶'.repeat(health) + '<span class="sc-dim">🪶</span>'.repeat(3 - health);
      }
      renderLife();

      function spawn(awayFromX) {
        const sMin = sizeMin(), sMax = sizeMax(), size = rand(sMin, sMax);
        const x = awayFromX == null
          ? rand(W * 0.1, W * 0.9)
          : (awayFromX < W * 0.5 ? rand(W * 0.55, W * 0.9) : rand(W * 0.1, W * 0.45));
        // bigger crystals fall FASTER (0.7x..1.6x of base)
        const vy = fallBase * (0.7 + (size - sMin) / (sMax - sMin) * 0.9);
        crystals.push({ x, y: -size, vx: rand(-16, 16) * (dp / 9), vy, rot: rand(0, 6.28), vrot: rand(-1.5, 1.5), size, dead: false });
        return x;
      }
      function screech(tx, ty) {
        if (done) return;
        const ox = heroX, oy = launchY();
        const dx = tx - ox, dy = ty - oy, dist = Math.hypot(dx, dy) || 1;
        missiles.push({ x: ox, y: oy, tx, ty, vx: dx / dist * MISSILE_V, vy: dy / dist * MISSILE_V, dist, traveled: 0, boom: false });
        pulse = 1; S.swipe(); buzz(6);
      }
      function detonate(x, y) {
        blasts.push({ x, y, r: heroR * 0.3, max: blastR(), done: false });
        S.good();
      }
      function shatter(c) {
        c.dead = true; shattered++; cnt.textContent = shattered;
        sfx('shatter.wav', 0.3);
        for (let i = 0; i < 9; i++) {
          const a = rand(0, 6.28), sp = rand(70, 220);
          shards.push({ x: c.x, y: c.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, rot: rand(0, 6.28), c: i % 2 ? accent : '#cdf3ff' });
        }
        if (shattered >= goal) win();
      }
      function bonk(c) {
        c.dead = true; health--; renderLife(); S.bad(); buzz(80);
        shake = 1; hurt = 1;
        if (health <= 0) lose();
      }

      // read-only state so an automated playtest can lead its shots
      try {
        window.__sc = {
          get crystals() { return crystals; }, get heroX() { return heroX; }, get launchY() { return launchY(); },
          get blastR() { return blastR(); }, get groundY() { return groundY; }, get missileV() { return MISSILE_V; },
          get shattered() { return shattered; }, get health() { return health; }, get goal() { return goal; },
          get W() { return W; }, get H() { return H; }, get done() { return done; }, screech
        };
      } catch {}

      const onDown = e => {
        if (e.target === quit || done) return;
        e.preventDefault();
        const r = cv.getBoundingClientRect();
        screech(e.clientX - r.left, e.clientY - r.top);
      };
      wrap.addEventListener('pointerdown', onDown);
      quit.addEventListener('pointerdown', e => { e.stopPropagation(); finish(false); });

      const stop = loop(dt => {
        if (done) return false;
        bob += dt;
        if (pulse > 0) pulse = Math.max(0, pulse - dt * 3);
        if (hurt > 0) hurt = Math.max(0, hurt - dt * 2);
        if (shake > 0) shake = Math.max(0, shake - dt * 4);

        spawnT -= dt;
        if (spawnT <= 0) {
          const x1 = spawn();
          if (Math.random() < burstP) spawn(x1);     // a partner across the sky
          spawnT = spawnGap() * rand(0.82, 1.2);
        }

        // 1) crystals fall
        for (const c of crystals) { c.y += c.vy * dt; c.x += c.vx * dt; c.rot += c.vrot * dt; }

        // 2) missiles fly up to their target, then detonate
        for (const m of missiles) {
          m.x += m.vx * dt; m.y += m.vy * dt; m.traveled += MISSILE_V * dt;
          if (m.traveled >= m.dist) { m.boom = true; detonate(m.tx, m.ty); }
        }

        // 3) blasts expand & shatter anything within
        for (const b of blasts) {
          b.r += (b.max - heroR * 0.3) / RING_T * dt;
          if (b.r >= b.max) b.done = true;
          for (const c of crystals) {
            if (c.dead) continue;
            if (Math.hypot(c.x - b.x, c.y - b.y) <= b.r + c.size * 0.35) { shatter(c); if (done) break; }
          }
          if (done) break;
        }
        if (done) return false;

        // 4) crystals that reach the bottom bonk a feather
        for (const c of crystals) {
          if (!c.dead && c.y + c.size * 0.4 >= groundY) { bonk(c); if (done) break; }
        }
        if (done) return false;

        // 5) update shards / clouds, then cull
        for (const s of shards) { s.life += dt; s.vy += 150 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += 7 * dt; }
        for (const cl of clouds) { cl.x -= cl.v * dt; if (cl.x < -0.25) { cl.x = 1.25; cl.y = rand(0.06, 0.5); } }
        for (let i = crystals.length - 1; i >= 0; i--) if (crystals[i].dead) crystals.splice(i, 1);
        for (let i = missiles.length - 1; i >= 0; i--) if (missiles[i].boom) missiles.splice(i, 1);
        for (let i = blasts.length - 1; i >= 0; i--) if (blasts[i].done) blasts.splice(i, 1);
        for (let i = shards.length - 1; i >= 0; i--) if (shards[i].life > 0.6) shards.splice(i, 1);

        draw();
      });

      // ── drawing ──
      const hexA = (hex, a) => {
        const h = hex.replace('#', '');
        const n = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        const r = parseInt(n.slice(0, 2), 16), gg = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
        return `rgba(${r},${gg},${b},${a})`;
      };
      function drawCloud(x, y, s) {
        g.beginPath();
        g.arc(x, y, s * 0.6, 0, 6.28); g.arc(x + s * 0.7, y + s * 0.08, s * 0.5, 0, 6.28);
        g.arc(x - s * 0.7, y + s * 0.1, s * 0.45, 0, 6.28); g.arc(x, y + s * 0.28, s * 0.55, 0, 6.28);
        g.fill();
      }
      function drawCrystal(c) {
        g.save(); g.translate(c.x, c.y); g.rotate(c.rot);
        const s = c.size * 0.5;
        g.fillStyle = hexA('#7fe3ff', 0.94); g.strokeStyle = '#ffffff'; g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, -s); g.lineTo(s * 0.82, -s * 0.2); g.lineTo(s * 0.5, s); g.lineTo(-s * 0.5, s); g.lineTo(-s * 0.82, -s * 0.2);
        g.closePath(); g.fill(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.6)';
        g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.32, -s * 0.05); g.lineTo(0, s * 0.25); g.closePath(); g.fill();
        g.restore();
      }
      function drawHero() {
        const y = heroY + Math.sin(bob * 6) * 3, r = heroR * (1 + pulse * 0.14);
        if (pulse > 0) { g.strokeStyle = hexA(accent, pulse * 0.6); g.lineWidth = 3; g.beginPath(); g.arc(heroX, y, r + 7, 0, 6.28); g.stroke(); }
        if (heroReady) { g.save(); g.translate(heroX, y); g.drawImage(heroImg, -r, -r, r * 2, r * 2); g.restore(); }
        else { g.fillStyle = accent; g.beginPath(); g.arc(heroX, y, r, 0, 6.28); g.fill(); }
      }
      function draw() {
        g.save();
        if (shake > 0) { const m = shake * 7; g.translate(rand(-m, m), rand(-m, m)); }
        const grd = g.createLinearGradient(0, 0, 0, H);
        grd.addColorStop(0, '#bdeaff'); grd.addColorStop(0.58, '#e9f6ff'); grd.addColorStop(1, '#fff4d4');
        g.fillStyle = grd; g.fillRect(-30, -30, W + 60, H + 60);
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (const cl of clouds) drawCloud(cl.x * W, cl.y * H, 42 * cl.s);
        // ground glow line (the danger zone)
        g.strokeStyle = hexA('#ff8aa0', 0.5); g.lineWidth = 2; g.setLineDash([10, 8]);
        g.beginPath(); g.moveTo(0, groundY); g.lineTo(W, groundY); g.stroke(); g.setLineDash([]);
        // missile trails
        const oy = launchY();
        for (const m of missiles) {
          g.strokeStyle = hexA(accent, 0.55); g.lineWidth = 3;
          g.beginPath(); g.moveTo(heroX, oy); g.lineTo(m.x, m.y); g.stroke();
          g.fillStyle = '#fff'; g.beginPath(); g.arc(m.x, m.y, 3.5, 0, 6.28); g.fill();
        }
        // shockwave bursts
        for (const b of blasts) {
          const a = clamp(1 - b.r / b.max, 0, 1);
          g.strokeStyle = hexA(accent, 0.6 * a + 0.12); g.lineWidth = clamp(11 * a, 2, 11);
          g.beginPath(); g.arc(b.x, b.y, b.r, 0, 6.28); g.stroke();
          g.strokeStyle = hexA('#ffffff', 0.5 * a); g.lineWidth = clamp(5 * a, 1, 5);
          g.beginPath(); g.arc(b.x, b.y, b.r * 0.66, 0, 6.28); g.stroke();
        }
        for (const c of crystals) drawCrystal(c);
        for (const s of shards) {
          const a = clamp(1 - s.life / 0.6, 0, 1);
          g.save(); g.translate(s.x, s.y); g.rotate(s.rot); g.globalAlpha = a; g.fillStyle = s.c;
          g.beginPath(); g.moveTo(0, -5); g.lineTo(4, 4); g.lineTo(-4, 4); g.closePath(); g.fill(); g.restore();
        }
        g.globalAlpha = 1;
        drawHero();
        if (hurt > 0) { g.fillStyle = hexA('#ff3b3b', hurt * 0.32); g.fillRect(-30, -30, W + 60, H + 60); }
        g.restore();
      }
      draw();

      function win() { if (done) return; S.win(); buzz(40); finish(true); }
      function lose() { if (done) return; S.lose(); buzz(120); finish(false); }
      function finish(winFlag) {
        if (done) return false; done = true; stop();
        window.removeEventListener('resize', measure);
        wrap.removeEventListener('pointerdown', onDown);
        try { delete window.__sc; } catch {}
        if (!winFlag) sfx(ctx.foe.sfx, 0.7);
        resolve({ win: winFlag, stars: winFlag ? clamp(health, 1, 3) : 1 });
        return false;
      }
    });
  }
};
