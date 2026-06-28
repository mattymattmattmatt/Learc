/* Sonic Screech — Yellogen's game.
   Yellogen is a flying, ear-splitting screecher, so this game is built around
   exactly that: she hovers in the sky and you TAP where the crystals are to
   unleash a directed screech — a shockwave blooms at your tap and shatters
   every crystal caught in the blast. Aim at the densest clusters, and don't
   let a crystal slip through and bonk a feather — lose all three and you're
   out. Tap is on a short recharge, so time it. (Canvas-rendered shockwaves &
   shattering; ctx.difficulty scales swarm speed/density and shrinks the blast.) */
import { clamp, rand, loop, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'screech', name: 'Sonic Screech', icon: '🔊',
  howto: 'TAP right on the crystals 💎 to screech 🔊 — the blast shatters everything it catches. Don’t let them reach you, and mind the recharge!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const accent = (ctx.theme && ctx.theme.color) || '#ffd23f';

      // ── tuning (Yellogen runs at d≈7-8 on Normal, ~12-13 on Hard) ──
      // The "pressure" knobs cap at dp=9 so Hard stays intense but winnable;
      // only the goal keeps climbing with real difficulty (a longer endurance).
      const dp       = Math.min(d, 9);
      const goal     = 17 + Math.round(d * 1.0);             // ~25 on Normal, ~29 on Hard
      const speed0   = 70 + dp * 8;                          // drift speed (px/s)
      const spawnGap = () => clamp(1.1 - dp * 0.05, 0.56, 1.1);
      const burstP   = clamp(0.2 + dp * 0.045, 0.2, 0.6);    // chance a spawn comes as a far-apart pair
      const blastF   = clamp(0.165 - dp * 0.004, 0.135, 0.165);// blast radius — tight, so aim matters
      const RING_T   = 0.3;                                   // blast expand time (s)
      const COOLDOWN = clamp(0.58 - dp * 0.012, 0.47, 0.58); // recharge (s)
      let health = 3;

      area.innerHTML = `
        <div class="sc-wrap" style="--accent:${accent}">
          <canvas class="sc-cv" id="cv"></canvas>
          <div class="sc-hud">
            <span class="sc-life" id="life"></span>
            <span class="sc-prog">🔊 <b id="cnt">0</b>/${goal}</span>
          </div>
          <div class="sc-cool"><i id="cool"></i></div>
          <button class="sc-quit" id="quit">✕</button>
          <div class="dg-hint">Tap on the crystals 💎 to screech them apart</div>
        </div>`;
      const wrap = area.querySelector('.sc-wrap');
      const cv = area.querySelector('#cv'), g = cv.getContext('2d');
      const cnt = area.querySelector('#cnt'), lifeEl = area.querySelector('#life');
      const coolEl = area.querySelector('#cool'), quit = area.querySelector('#quit');

      let W = 0, H = 0, dpr = 1, heroX = 0, heroY = 0, heroR = 0;
      function measure() {
        const r = cv.getBoundingClientRect();
        W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        heroX = W * 0.15; heroY = H * 0.5; heroR = clamp(Math.min(W, H) * 0.085, 26, 46);
      }
      measure(); window.addEventListener('resize', measure);

      const heroImg = new Image(); let heroReady = false;
      heroImg.onload = () => heroReady = true;
      heroImg.src = petImg(ctx.hero);

      // ── entities ──
      const crystals = [];   // {x,y,vr,rot,vrot,size,dead}
      const blasts = [];     // {x,y,r,max,done}
      const shards = [];     // {x,y,vx,vy,life,rot,c}
      const beams = [];      // {x,y,life}  (a brief line from Yellogen to the tap)
      const clouds = Array.from({ length: 4 }, () => ({ x: rand(0, 1), y: rand(0.08, 0.72), s: rand(0.55, 1.15), v: rand(0.012, 0.03) }));

      let shattered = 0, cool = 0, bob = 0, pulse = 0, hurt = 0, shake = 0;
      let spawnT = 0.3, done = false;
      const origin = () => heroX + heroR * 0.55;
      const blastR = () => Math.min(W, H) * blastF;

      function renderLife() {
        lifeEl.innerHTML = '🪶'.repeat(health) + '<span class="sc-dim">🪶</span>'.repeat(3 - health);
      }
      renderLife();

      function spawn(awayFrom) {
        const size = rand(heroR * 0.72, heroR * 1.06);
        // a partner spawns in the opposite half, too far to catch in one blast
        const y = awayFrom == null
          ? rand(H * 0.14, H * 0.86)
          : (awayFrom < H * 0.5 ? rand(H * 0.56, H * 0.86) : rand(H * 0.14, H * 0.44));
        const x = W + size + (awayFrom == null ? 0 : rand(0, 70));
        crystals.push({ x, y, vr: speed0 * rand(0.85, 1.2), rot: rand(0, 6.28), vrot: rand(-1.5, 1.5), size, dead: false });
        return y;
      }
      function screech(x, y) {
        if (done) return;
        if (cool > 0) { S.tick(); return; }            // still recharging — fizzle
        cool = COOLDOWN;
        blasts.push({ x, y, r: heroR * 0.4, max: blastR(), done: false });
        beams.push({ x, y, life: 0 });
        pulse = 1; S.swipe(); buzz(10);
      }
      function shatter(c) {
        c.dead = true; shattered++; cnt.textContent = shattered;
        S.good();
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

      // read-only state so an automated playtest can aim its taps
      try {
        window.__sc = {
          get crystals() { return crystals; }, get heroX() { return heroX; }, get heroY() { return heroY; },
          get origin() { return origin(); }, get blastR() { return blastR(); }, get cool() { return cool; },
          get shattered() { return shattered; }, get health() { return health; }, get goal() { return goal; },
          get W() { return W; }, get done() { return done; }, screech
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
        if (cool > 0) { cool = Math.max(0, cool - dt); coolEl.style.width = (100 * (1 - cool / COOLDOWN)) + '%'; }

        spawnT -= dt;
        if (spawnT <= 0) {
          const y1 = spawn();
          if (Math.random() < burstP) spawn(y1);     // a partner at a far-off height
          spawnT = spawnGap() * rand(0.82, 1.2);
        }

        // 1) move crystals
        for (const c of crystals) { c.x -= c.vr * dt; c.rot += c.vrot * dt; }

        // 2) blasts expand & shatter anything within (screech wins ties)
        for (const b of blasts) {
          b.r += (b.max - heroR * 0.4) / RING_T * dt;
          if (b.r >= b.max) b.done = true;
          for (const c of crystals) {
            if (c.dead) continue;
            if (Math.hypot(c.x - b.x, c.y - b.y) <= b.r + c.size * 0.35) { shatter(c); if (done) break; }
          }
          if (done) break;
        }
        if (done) return false;

        // 3) survivors that reach Yellogen bonk a feather
        for (const c of crystals) {
          if (!c.dead && c.x - c.size * 0.5 <= heroX + heroR * 0.45) { bonk(c); if (done) break; }
        }
        if (done) return false;

        // 4) update shards / beams / clouds, then cull
        for (const s of shards) { s.life += dt; s.vy += 150 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.rot += 7 * dt; }
        for (const bm of beams) bm.life += dt;
        for (const cl of clouds) { cl.x -= cl.v * dt; if (cl.x < -0.25) { cl.x = 1.25; cl.y = rand(0.08, 0.72); } }
        for (let i = crystals.length - 1; i >= 0; i--) if (crystals[i].dead || crystals[i].x < -crystals[i].size * 2) crystals.splice(i, 1);
        for (let i = blasts.length - 1; i >= 0; i--) if (blasts[i].done) blasts.splice(i, 1);
        for (let i = shards.length - 1; i >= 0; i--) if (shards[i].life > 0.6) shards.splice(i, 1);
        for (let i = beams.length - 1; i >= 0; i--) if (beams[i].life > 0.18) beams.splice(i, 1);

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
        const y = heroY + Math.sin(bob * 6) * 4, r = heroR * (1 + pulse * 0.14);
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
        // screech beams (from Yellogen toward the tap)
        const oy = heroY + Math.sin(bob * 6) * 4;
        for (const bm of beams) {
          const a = clamp(1 - bm.life / 0.18, 0, 1);
          g.strokeStyle = hexA(accent, 0.5 * a); g.lineWidth = 4 * a + 1;
          g.beginPath(); g.moveTo(origin(), oy); g.lineTo(bm.x, bm.y); g.stroke();
        }
        // shockwave rings at each blast
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
