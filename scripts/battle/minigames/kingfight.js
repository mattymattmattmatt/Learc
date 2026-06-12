/* The Gilded King — the final, strategic boss duel.
   The crown takes a random ASPECT (fire / flood / storm / wind / stone / dark).
   The King's speech leaks clues; the player returns to the select screen and
   picks ANY freed champion. The chosen hero's traits decide how the fight feels:
     • counter trait  → sturdier (more hearts), the hazard is gentle, a shield
       absorbs every other hit, and the King opens to a strike sooner.
     • backfire trait → fewer hearts, the hazard is fiercer and hits harder.
     • a striking trait (strength/bite/etc.) cracks the crown twice as fast.
   Every wave the Aspect draws from a POOL of attack patterns, so no two waves
   play the same — and when the crown is half-broken the King ENRAGES, adding
   crown-shard bursts to everything. Survive the wave, then TAP the King while
   he glows: ONE true strike per opening, then he recovers. Crack the whole
   crown to win. */
import { el, clamp, loop, rand, buzz, sparkle, floatText, petImg, KING_GIF, S } from '../util.js';

const FALLBACK = { id: 'cinders', name: 'Cinders', element: '🔥', counter: ['water', 'ice', 'cold'], backfire: ['fire', 'heat'] };
const WARN = { cinders: '🔥 Embers fall!', deluge: '🌊 The flood rises!', tempest: '⚡ Lightning strikes!', gale: '🌪️ Brace against the gale!', stone: '⛰️ Boulders!', gloom: '🌑 Darkness falls!' };

export default {
  id: 'kingfight', name: 'The Gilded King', icon: '👑',
  howto: 'DRAG to survive the crown’s Aspect, then TAP the King when he glows — ONE true strike per opening!',

  play(area, ctx) {
    return new Promise(resolve => {
      const A = ctx.aspect || FALLBACK;
      const tags = (ctx.hero && ctx.hero.tags) || [];
      const has = t => tags.includes(t);
      const isCounter = A.counter.some(has);
      const isBack = !isCounter && A.backfire.some(has);
      const striker = ['strength', 'attack', 'bite', 'explosive', 'stab', 'pinch'].some(has);
      const d = ctx.difficulty;

      /* affinity-driven tuning — one strike per opening, so the crown is
         the fight's true length: ~4-5 openings for a striker, more without */
      let hearts = isCounter ? 5 : isBack ? 2 : 3;
      const heartsMax = hearts;
      const stoneArmor = (A.id === 'stone' && !striker) ? 2 : 0;
      let crown = clamp(6 + Math.round(d * 0.25) + (isBack ? 1 : 0) + stoneArmor - (striker ? 1 : 0), 5, 10);
      const crownMax = crown;
      const hitDmg = striker ? 2 : 1;
      const hazMul = isCounter ? 0.65 : isBack ? 1.5 : 1;     // hazard cadence (lower = gentler)
      const waveLen0 = isCounter ? 4.6 : 5.6;
      const strikeLen = isCounter ? 2.2 : 1.8;
      const maxWater = isCounter ? 0.42 : 0.58;               // leave a safe strip up top for non-fliers
      const windForce = (90 + d * 8) * (isCounter ? 0.4 : isBack ? 1.5 : 1);

      area.innerHTML = `
        <div class="kf-hud">
          <span class="kf-hearts" id="hearts">${'❤'.repeat(hearts)}</span>
          <span class="kf-aspect">${A.element} ${A.name}</span>
          <span class="kf-crown" id="crown">${'♛'.repeat(crown)}</span>
        </div>
        <div class="kf-field aspect-${A.id}" id="field">
          <div class="kf-water" id="water" hidden></div>
          <div class="kf-king" id="king"><img src="${KING_GIF}" alt="King"></div>
          <div class="kf-reticle" id="reticle" hidden></div>
          <div class="kf-hero${isCounter ? ' shielded' : ''}" id="me"><img src="${petImg(ctx.hero)}" draggable="false"></div>
          <div class="kf-vignette" id="vig" hidden></div>
          <div class="kf-banner" id="banner">${A.element} The Aspect of ${A.name}</div>
        </div>`;
      const field = area.querySelector('#field'), king = area.querySelector('#king');
      const reticle = area.querySelector('#reticle'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), crownEl = area.querySelector('#crown');
      const banner = area.querySelector('#banner'), water = area.querySelector('#water'), vig = area.querySelector('#vig');
      if (A.id === 'deluge') water.hidden = false;
      if (A.id === 'gloom') { vig.hidden = false; vig.style.setProperty('--gr', (isCounter ? 200 : 120) + 'px'); }

      let W = 0, H = 0, size = 56, kx = 0, ky = 0, kr = 60;
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        size = clamp(Math.min(W, H) * 0.15, 42, 70); me.style.width = me.style.height = size + 'px';
        kr = clamp(Math.min(W, H) * 0.16, 48, 80);
        king.style.width = king.style.height = kr * 2 + 'px';
        kx = W / 2; ky = H * 0.17;
      };
      measure(); window.addEventListener('resize', measure);

      let px = W / 2 - size / 2, py = H * 0.74;
      const placeMe = () => { me.style.transform = `translate3d(${px}px,${py}px,0)`; };
      placeMe();
      const heroC = () => ({ x: px + size / 2, y: py + size / 2 });
      let dragging = false;
      const moveHero = (cx, cy) => {
        const r = field.getBoundingClientRect();
        px = clamp(cx - r.left - size / 2, 0, W - size);
        py = clamp(cy - r.top - size / 2, H * 0.26, H - size);
        placeMe();
      };
      const down = e => {
        e.preventDefault();
        if (phase === 'stagger') {
          const r = field.getBoundingClientRect();
          if (Math.hypot(e.clientX - r.left - kx, e.clientY - r.top - ky) < kr * 1.3) { strike(); return; }
        }
        dragging = true; moveHero(e.clientX, e.clientY);
      };
      const move = e => { if (dragging) { moveHero(e.clientX, e.clientY); e.preventDefault(); } };
      const up = () => { dragging = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);

      /* ── state ── */
      let phase = 'intro', timer = 1.6, waveIdx = 0, iframe = 0;
      let wind = 0, waterLevel = 0.05, drownT = 0;
      let shield = isCounter, shieldT = 0;
      let enraged = false, burstAcc = 0;
      const projs = [], bolts = [], zones = [];
      const broken = () => crownMax - crown;
      const pspeed = () => 170 + d * 14 + Math.min(84, broken() * 14);   // ramps as the crown cracks

      function setBanner(txt, cls = '') { banner.textContent = txt; banner.className = 'kf-banner show ' + cls; setTimeout(() => banner.classList.remove('show'), 1100); }

      // opening affinity cue
      setTimeout(() => {
        if (isCounter) setBanner('🛡️ Your power answers the ' + A.name + '!', 'strike');
        else if (isBack) setBanner('⚠️ The ' + A.name + ' feeds on you!');
        else setBanner('Stand firm against the ' + A.name + '!');
      }, 350);

      /* ── basic emitters ── */
      function spawnProj(x, y, vx, vy, emoji, scale = 1) {
        const n = el('div', 'kf-proj', emoji); if (scale !== 1) n.style.fontSize = (1.25 * scale) + 'rem';
        n.style.left = x + 'px'; n.style.top = y + 'px';
        field.appendChild(n); projs.push({ node: n, x, y, vx, vy, r: 11 * scale });
      }
      function spawnBolt(xAt) {
        const bw = clamp(W * 0.16, 40, 92);
        const aimHero = Math.random() < 0.6;
        const x = xAt != null ? clamp(xAt, bw / 2, W - bw / 2)
          : clamp(aimHero ? heroC().x + rand(-30, 30) : rand(bw, W - bw), bw / 2, W - bw / 2);
        const n = el('div', 'kf-bolt warn'); n.style.left = (x - bw / 2) + 'px'; n.style.width = bw + 'px';
        field.appendChild(n); bolts.push({ node: n, x, bw, state: 'warn', t: clamp(0.6 - d * 0.01, 0.4, 0.6) });
      }
      function spawnZone() {
        const r = clamp(Math.min(W, H) * 0.13, 44, 90);
        const h = heroC();
        const x = clamp(h.x + rand(-80, 80), r, Math.max(r, W - r));
        const y = clamp(h.y + rand(-80, 80), Math.max(H * 0.3, r), Math.max(H * 0.3, H - r));
        const n = el('div', 'kf-zone');
        n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.width = n.style.height = r * 2 + 'px';
        field.appendChild(n);
        zones.push({ node: n, x, y, r, state: 'warn', t: clamp(0.95 - d * 0.02, 0.6, 0.95) });
      }
      function aimFromKing(spread, emoji, k = 3, sMul = 1) {
        const sp = pspeed() * sMul;
        const h = heroC(); const a0 = Math.atan2(h.y - ky, h.x - kx);
        const half = (k - 1) / 2;
        for (let i = 0; i < k; i++) {
          const a = a0 + (i - half) * spread;
          spawnProj(kx, ky, Math.cos(a) * sp, Math.sin(a) * sp, emoji);
        }
      }
      function radialBurst(emoji, n = 8, sMul = 0.8) {
        const sp = pspeed() * sMul, a0 = rand(0, 6.283);
        for (let i = 0; i < n; i++) {
          const a = a0 + (i / n) * 6.283;
          spawnProj(kx, ky, Math.cos(a) * sp, Math.sin(a) * sp, emoji);
        }
      }
      const rainRandom = (emoji, n = 1, sMul = 1) => { for (let i = 0; i < n; i++) spawnProj(rand(12, W - 12), -14, rand(-45, 45), pspeed() * sMul, emoji); };
      const rainAimed = (emoji, scale = 1.3, sMul = 0.85) => { const h = heroC(); spawnProj(clamp(h.x + rand(-60, 60), 12, Math.max(12, W - 12)), -18, rand(-12, 12), pspeed() * sMul, emoji, scale); };
      const sideShot = (emoji, vyJit = 30, sMul = 1.15) => {
        const fromL = wind !== 0 ? wind > 0 : Math.random() < 0.5;
        spawnProj(fromL ? -14 : W + 14, rand(H * 0.28, H * 0.9), (fromL ? 1 : -1) * pspeed() * sMul, rand(-vyJit, vyJit), emoji);
      };
      const riseShot = (emoji, sMul = 0.75) => spawnProj(rand(12, W - 12), H + 14, rand(-40, 40), -pspeed() * sMul, emoji);
      const homingEdge = (emoji, shots = 1, sMul = 0.95) => {
        const h = heroC();
        for (let s = 0; s < shots; s++) {
          const e = (Math.random() * 4) | 0; let x, y;
          if (e === 0) { x = rand(0, W); y = -14; } else if (e === 1) { x = W + 14; y = rand(0, H); }
          else if (e === 2) { x = rand(0, W); y = H + 14; } else { x = -14; y = rand(0, H); }
          const a = Math.atan2(h.y - y, h.x - x);
          spawnProj(x, y, Math.cos(a) * pspeed() * sMul, Math.sin(a) * pspeed() * sMul, emoji);
        }
      };

      /* ── attack pattern pools — each wave shuffles through these ──
         every: seconds between volleys (scaled by hazMul); fire: one volley */
      let marchX = 0, marchDir = 1;
      const POOLS = {
        cinders: [
          { name: 'ember rain', every: () => clamp(0.34 - d * 0.012, 0.16, 0.34), fire: () => rainRandom('🔥', enraged ? 2 : 1) },
          { name: 'fan volley', every: () => 0.95, fire: () => aimFromKing(0.24, '🔥', enraged ? 5 : 3) },
          { name: 'eruptions',  every: () => 1.0,  fire: () => { spawnZone(); if (enraged) spawnZone(); } }
        ],
        stone: [
          { name: 'aimed boulder', every: () => clamp(0.55 - d * 0.015, 0.3, 0.55), fire: () => rainAimed('🪨', 1.5, 0.85) },
          { name: 'triple line',   every: () => 1.15, fire: () => { const h = heroC(); for (let k = -1; k <= 1; k++) spawnProj(clamp(h.x + k * 72, 12, W - 12), -18, 0, pspeed() * 0.82, '🪨', 1.3); } },
          { name: 'rockslide',     every: () => 0.8,  fire: () => sideShot('🪨', 14, 0.7) }
        ],
        tempest: [
          { name: 'hunting bolts', every: () => clamp(0.8 - d * 0.025, 0.4, 0.8), fire: () => { spawnBolt(); if (enraged) spawnBolt(); } },
          { name: 'storm march',   every: () => 0.3, fire: () => { marchX += marchDir * Math.max(60, W / 7); if (marchX > W || marchX < 0) { marchDir *= -1; marchX = clamp(marchX, 0, W); } spawnBolt(marchX); } },
          { name: 'static arc',    every: () => 0.85, fire: () => aimFromKing(0.32, '⚡', 2, 0.95) }
        ],
        gale: [
          { name: 'gusts',      every: () => clamp(0.4 - d * 0.012, 0.22, 0.4), fire: () => sideShot('💨') },
          { name: 'leaf storm', every: () => 0.5,  fire: () => { sideShot('🍃', 90, 1.0); if (enraged) sideShot('🍃', 90, 1.0); } },
          { name: 'twisters',   every: () => 1.15, fire: () => spawnProj(rand(20, W - 20), -16, rand(-130, 130), pspeed() * 0.8, '🌪️', 1.4) }
        ],
        deluge: [
          { name: 'rising tide', every: () => clamp(0.55 - d * 0.015, 0.3, 0.55), fire: () => riseShot('💧') },
          { name: 'water jets',  every: () => 0.75, fire: () => { sideShot('💦', 20, 1.05); if (enraged) sideShot('💦', 20, 1.05); } },
          { name: 'downpour',    every: () => 0.5,  fire: () => rainRandom('💧', 1, 0.9) }
        ],
        gloom: [
          { name: 'shadow bolts', every: () => clamp(0.42 - d * 0.012, 0.22, 0.42), fire: () => homingEdge('🟣', enraged ? 2 : 1) },
          { name: 'void ring',    every: () => 1.5,  fire: () => radialBurst('🟣', enraged ? 10 : 8, 0.72) },
          { name: 'creeping dark', every: () => 1.1, fire: () => { homingEdge('🟣', 2, 0.85); vig.classList.remove('pulse'); void vig.offsetWidth; vig.classList.add('pulse'); } }
        ]
      };
      const FALLBACK_POOL = [{ name: 'shards', every: () => 0.3, fire: () => rainRandom('✦') }];

      let pat = null, lastPat = null, patT = 0, patAcc = 0;
      function pickPattern() {
        const pool = POOLS[A.id] || FALLBACK_POOL;
        let cand;
        do { cand = pool[(Math.random() * pool.length) | 0]; } while (pool.length > 1 && cand === lastPat);
        lastPat = pat = cand;
        patT = rand(1.6, 2.5);                      // how long this pattern leads the orchestra
        patAcc = 0.15;                              // first volley lands almost at once
        if (cand.name === 'storm march') { marchDir = Math.random() < 0.5 ? 1 : -1; marchX = marchDir > 0 ? 0 : W; }
      }

      function hurt(n = 1) {
        if (iframe > 0 || done) return;
        if (isCounter && shield) {                       // shield soaks every other hit
          shield = false; shieldT = 2.6; me.classList.remove('shielded'); me.classList.add('shield-pop');
          setTimeout(() => me.classList.remove('shield-pop'), 220);
          sparkle(field, heroC().x, heroC().y, 7, ['🛡️', '✨']); S.ui(); buzz(15); iframe = 0.5; return;
        }
        iframe = 1.0; hearts = Math.max(0, hearts - n); heartsEl.textContent = '❤'.repeat(hearts);
        me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt'); S.hit(); buzz(70);
        floatText(area, heroC().x, heroC().y, '−' + n, 'bad');
        if (hearts <= 0) finish(false);
      }

      /* ── phases: wave → stagger (one strike!) → recover → wave… ── */
      function startWave() {
        phase = 'wave'; waveIdx++;
        timer = Math.max(3.0, waveLen0 - broken() * 0.25);
        wind = (waveIdx % 2 ? 1 : -1) * windForce;
        burstAcc = 0.8;
        king.classList.remove('stagger'); reticle.hidden = true;
        pickPattern();
        setBanner(WARN[A.id] || '⚠️ Attack!');
      }
      function enterStagger() {
        phase = 'stagger'; timer = strikeLen;
        clearHazards();
        king.classList.add('stagger'); reticle.hidden = false;
        reticle.style.left = kx + 'px'; reticle.style.top = ky + 'px'; reticle.style.width = reticle.style.height = kr * 2.6 + 'px';
        setBanner('⚔ STRIKE THE CROWN!', 'strike');
      }
      function enterRecover(msg) {
        phase = 'gap'; timer = 0.8;
        king.classList.remove('stagger'); reticle.hidden = true;
        if (msg) setBanner(msg);
      }
      function strike() {
        if (phase !== 'stagger' || done) return;
        crown = Math.max(0, crown - hitDmg); crownEl.textContent = '♛'.repeat(crown);
        king.classList.remove('hit'); void king.offsetWidth; king.classList.add('hit');
        sparkle(field, kx, ky, 14); floatText(area, kx, ky, 'CRACK! −' + hitDmg, 'good'); S.hit(); buzz(60);
        if (crown <= 0) return finish(true);
        if (!enraged && crown <= crownMax / 2) {
          enraged = true; field.classList.add('enraged');
          setTimeout(() => setBanner('🔥 The crown blazes with fury!'), 350);
          S.bad(); buzz(90);
        }
        enterRecover('The King recovers!');           // ONE strike per opening
      }
      function clearHazards() {
        projs.forEach(p => p.node.remove()); projs.length = 0;
        bolts.forEach(b => b.node.remove()); bolts.length = 0;
        zones.forEach(z => z.node.remove()); zones.length = 0;
      }

      /* ── per-frame updates ── */
      function updateProjs(dt) {
        const h = heroC(), hr = size * 0.42;
        for (let i = projs.length - 1; i >= 0; i--) {
          const p = projs[i]; p.x += p.vx * dt; p.y += p.vy * dt;
          p.node.style.left = p.x + 'px'; p.node.style.top = p.y + 'px';
          if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { p.node.remove(); projs.splice(i, 1); continue; }
          if (iframe <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < hr + p.r) { p.node.remove(); projs.splice(i, 1); hurt(); }
        }
      }
      function updateBolts(dt) {
        const h = heroC();
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i]; b.t -= dt;
          if (b.state === 'warn' && b.t <= 0) { b.state = 'strike'; b.t = 0.2; b.node.classList.remove('warn'); b.node.classList.add('strike'); S.bad(); buzz(20); }
          if (b.state === 'strike') { if (iframe <= 0 && Math.abs(h.x - b.x) < b.bw / 2 + size * 0.2) hurt(); if (b.t <= 0) { b.node.remove(); bolts.splice(i, 1); } }
        }
      }
      function updateZones(dt) {
        const h = heroC(), hr = size * 0.42;
        for (let i = zones.length - 1; i >= 0; i--) {
          const z = zones[i]; z.t -= dt;
          if (z.state === 'warn' && z.t <= 0) {
            z.state = 'slam'; z.t = 0.24; z.node.classList.add('slam'); S.hit(); buzz(20);
            if (iframe <= 0 && Math.hypot(z.x - h.x, z.y - h.y) < z.r * 0.9 + hr * 0.5) hurt();
          } else if (z.state === 'slam' && z.t <= 0) { z.node.remove(); zones.splice(i, 1); }
        }
      }
      function tickWater(dt, rising) {
        if (A.id !== 'deluge') return;
        waterLevel = rising ? Math.min(maxWater, waterLevel + 0.14 * hazMul * dt) : Math.max(0.05, waterLevel - 0.16 * dt);
        const surfaceY = H - waterLevel * H;
        water.style.height = (waterLevel * H) + 'px';
        if (!isCounter && heroC().y > surfaceY + size * 0.1) {
          drownT += dt; if (drownT >= 1.0) { drownT = 0; hurt(); }
        } else drownT = 0;
      }
      function tickWind(dt) {
        if (A.id !== 'gale' || phase !== 'wave') return;
        px = clamp(px + wind * dt, 0, W - size); placeMe();
      }
      function tickVignette() {
        if (A.id !== 'gloom') return;
        const h = heroC(); vig.style.setProperty('--gx', h.x + 'px'); vig.style.setProperty('--gy', h.y + 'px');
      }

      let done = false;
      const stop = loop((dt, now) => {
        if (done) return false;
        iframe = Math.max(0, iframe - dt);
        if (isCounter && !shield) { shieldT -= dt; if (shieldT <= 0) { shield = true; me.classList.add('shielded'); } }
        king.style.left = (kx - kr) + 'px'; king.style.top = (ky - kr + Math.sin(now / 500) * 6) + 'px';
        tickVignette();

        if (phase === 'intro') { timer -= dt; tickWater(dt, false); if (timer <= 0) startWave(); return; }
        if (phase === 'gap' || phase === 'stagger') {
          timer -= dt; updateProjs(dt); updateZones(dt); tickWater(dt, false);
          if (phase === 'stagger' && timer <= 0) enterRecover('The opening closes…');
          else if (phase === 'gap' && timer <= 0) startWave();
          return;
        }
        // wave: run the current pattern, swap patterns every couple of seconds
        timer -= dt;
        patT -= dt; if (patT <= 0) pickPattern();
        patAcc -= dt; if (patAcc <= 0 && pat) { patAcc = pat.every() / hazMul; pat.fire(); }
        if (enraged) { burstAcc -= dt; if (burstAcc <= 0) { burstAcc = 1.7; radialBurst('✦', 9, 0.85); } }
        updateProjs(dt); updateBolts(dt); updateZones(dt); tickWater(dt, true); tickWind(dt);
        if (timer <= 0) enterStagger();
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up); window.removeEventListener('resize', measure);
        clearHazards();
        buzz(win ? 60 : 120);   // jingles play on the result screens (the King has no voice yet)
        resolve({ win, stars: win ? (hearts >= heartsMax ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
