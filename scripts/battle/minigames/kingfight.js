/* The Gilded King — the final, strategic boss duel.
   The crown takes a random ASPECT (fire / flood / storm / wind / stone / dark).
   The King's speech leaks clues; the player returns to the select screen and
   picks ANY freed champion. The chosen hero's traits decide how the fight feels:
     • counter trait  → sturdier (more hearts), the hazard is gentle, a shield
       absorbs every other hit, and the King opens to a strike sooner.
     • backfire trait → fewer hearts, the hazard is fiercer and hits harder.
     • a striking trait (strength/bite/etc.) cracks the crown twice as fast.
   Survive the Aspect, then TAP the King when he glows to crack his crown. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, petImg, KING_GIF, S } from '../util.js';

const FALLBACK = { id: 'cinders', name: 'Cinders', element: '🔥', counter: ['water', 'ice', 'cold'], backfire: ['fire', 'heat'] };
const WARN = { cinders: '🔥 Embers fall!', deluge: '🌊 The flood rises!', tempest: '⚡ Lightning strikes!', gale: '🌪️ Brace against the gale!', stone: '⛰️ Boulders!', gloom: '🌑 Darkness falls!' };

export default {
  id: 'kingfight', name: 'The Gilded King', icon: '👑',
  howto: 'DRAG to survive the crown’s Aspect, then TAP the King when he glows to strike!',

  play(area, ctx) {
    return new Promise(resolve => {
      const A = ctx.aspect || FALLBACK;
      const tags = (ctx.hero && ctx.hero.tags) || [];
      const has = t => tags.includes(t);
      const isCounter = A.counter.some(has);
      const isBack = !isCounter && A.backfire.some(has);
      const striker = ['strength', 'attack', 'bite', 'explosive', 'stab', 'pinch'].some(has);
      const d = ctx.difficulty;

      /* affinity-driven tuning */
      let hearts = isCounter ? 5 : isBack ? 2 : 3;
      const heartsMax = hearts;
      const stoneArmor = (A.id === 'stone' && !striker) ? 2 : 0;
      let crown = clamp(Math.round(d * 0.55) + 3 + (isBack ? 1 : 0) - (striker ? 1 : 0) + stoneArmor, 5, 10);
      const crownMax = crown;
      const hitDmg = striker ? 2 : 1;
      const hazMul = isCounter ? 0.65 : isBack ? 1.5 : 1;     // hazard cadence (lower = gentler)
      const hazDmg = 1;                                       // every hit costs one heart (no one-shots)
      const waveLen0 = isCounter ? 5.5 : 7.0;
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
      let sacc = 0, boltAcc = 0, wind = 0, waterLevel = 0.05, drownT = 0;
      let shield = isCounter, shieldT = 0;
      const projs = [], bolts = [];
      const broken = () => crownMax - crown;
      const pspeed = () => 180 + d * 16 + broken() * 22;     // faster, and ramps as the crown cracks

      function setBanner(txt, cls = '') { banner.textContent = txt; banner.className = 'kf-banner show ' + cls; setTimeout(() => banner.classList.remove('show'), 1100); }

      // opening affinity cue
      setTimeout(() => {
        if (isCounter) setBanner('🛡️ Your power answers the ' + A.name + '!', 'strike');
        else if (isBack) setBanner('⚠️ The ' + A.name + ' feeds on you!');
        else setBanner('Stand firm against the ' + A.name + '!');
      }, 350);

      /* ── projectiles ── */
      function spawnProj(x, y, vx, vy, emoji, scale = 1) {
        const n = el('div', 'kf-proj', emoji); if (scale !== 1) n.style.fontSize = (1.25 * scale) + 'rem';
        n.style.left = x + 'px'; n.style.top = y + 'px';
        field.appendChild(n); projs.push({ node: n, x, y, vx, vy, r: 11 * scale });
      }
      function spawnBolt() {
        const bw = clamp(W * 0.16, 40, 92);
        const aimHero = Math.random() < 0.6;
        const x = clamp(aimHero ? heroC().x + rand(-30, 30) : rand(bw, W - bw), bw / 2, W - bw / 2);
        const n = el('div', 'kf-bolt warn'); n.style.left = (x - bw / 2) + 'px'; n.style.width = bw + 'px';
        field.appendChild(n); bolts.push({ node: n, x, bw, state: 'warn', t: clamp(0.6 - d * 0.01, 0.4, 0.6) });
      }

      function hurt(n = hazDmg) {
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

      /* ── phases ── */
      function startWave() {
        phase = 'wave'; waveIdx++;
        timer = Math.max(3.6, waveLen0 - broken() * 0.2); sacc = 0; boltAcc = 0;
        wind = (waveIdx % 2 ? 1 : -1) * windForce;
        king.classList.remove('stagger'); reticle.hidden = true;
        setBanner(WARN[A.id] || '⚠️ Attack!');
      }
      function enterStagger() {
        phase = 'stagger'; timer = strikeLen;
        projs.forEach(p => p.node.remove()); projs.length = 0;
        bolts.forEach(b => b.node.remove()); bolts.length = 0;
        king.classList.add('stagger'); reticle.hidden = false;
        reticle.style.left = kx + 'px'; reticle.style.top = ky + 'px'; reticle.style.width = reticle.style.height = kr * 2.6 + 'px';
        setBanner('⚔ STRIKE THE CROWN!', 'strike');
      }
      function strike() {
        if (phase !== 'stagger' || done) return;
        crown = Math.max(0, crown - hitDmg); crownEl.textContent = '♛'.repeat(crown);
        king.classList.remove('hit'); void king.offsetWidth; king.classList.add('hit');
        sparkle(field, kx, ky, 14); floatText(area, kx, ky, 'CRACK! −' + hitDmg, 'good'); S.hit(); buzz(60);
        if (crown <= 0) return finish(true);
        // stays open — keep tapping to land more cracks before the window closes
      }

      /* ── per-frame hazard helpers ── */
      function aimFromKing(sp, spread, emoji, scale) {
        const h = heroC(); const a0 = Math.atan2(h.y - ky, h.x - kx);
        for (let k = -1; k <= 1; k++) spawnProj(kx, ky, Math.cos(a0 + k * spread) * sp, Math.sin(a0 + k * spread) * sp, emoji, scale);
      }
      function emit(dt) {
        const sp = pspeed();
        const heavy = broken() >= Math.ceil(crownMax / 2);     // escalate past the half-way mark
        const mode = waveIdx % 2;                              // alternate patterns each wave
        if (A.id === 'cinders') {
          sacc -= dt; if (sacc <= 0) {
            sacc = clamp(0.34 - d * 0.012, 0.15, 0.34) / hazMul;
            if (mode === 0) { const n = 1 + (heavy ? 1 : 0); for (let i = 0; i < n; i++) spawnProj(rand(12, W - 12), -14, rand(-45, 45), sp, '🔥'); }
            else aimFromKing(sp, 0.22, '🔥');                  // a fanned volley aimed at you
          }
        } else if (A.id === 'stone') {
          sacc -= dt; if (sacc <= 0) {
            sacc = clamp(0.52 - d * 0.015, 0.28, 0.52) / hazMul; const h = heroC();
            if (mode === 0) spawnProj(clamp(h.x + rand(-60, 60), 12, W - 12), -18, rand(-12, 12), sp * 0.85, '🪨', 1.5);
            else for (let k = -1; k <= 1; k++) spawnProj(clamp(h.x + k * 72, 12, W - 12), -18, 0, sp * 0.82, '🪨', 1.3);
          }
        } else if (A.id === 'tempest') {
          boltAcc -= dt; if (boltAcc <= 0) { boltAcc = clamp(0.8 - d * 0.025, 0.38, 0.8) / hazMul; spawnBolt(); if (mode === 1 || heavy) spawnBolt(); }
        } else if (A.id === 'gale') {
          sacc -= dt; if (sacc <= 0) {
            sacc = clamp(0.4 - d * 0.012, 0.2, 0.4) / hazMul; const fromL = wind > 0;
            spawnProj(fromL ? -14 : W + 14, rand(H * 0.28, H * 0.9), (fromL ? 1 : -1) * sp * 1.15, rand(-30, 30), '💨');
            if (mode === 1 || heavy) spawnProj(fromL ? -14 : W + 14, rand(H * 0.28, H * 0.9), (fromL ? 1 : -1) * sp * 1.15, rand(-30, 30), '🍃');
          }
        } else if (A.id === 'deluge') {
          sacc -= dt; if (sacc <= 0) { sacc = clamp(0.55 - d * 0.015, 0.3, 0.55) / hazMul; spawnProj(rand(12, W - 12), H + 14, rand(-40, 40), -sp * 0.75, '💧'); }
        } else if (A.id === 'gloom') {
          sacc -= dt; if (sacc <= 0) {
            sacc = clamp(0.42 - d * 0.012, 0.2, 0.42) / hazMul; const h = heroC(); const shots = (mode === 1 || heavy) ? 2 : 1;
            for (let s = 0; s < shots; s++) { const e = (Math.random() * 4) | 0; let x, y; if (e === 0) { x = rand(0, W); y = -14; } else if (e === 1) { x = W + 14; y = rand(0, H); } else if (e === 2) { x = rand(0, W); y = H + 14; } else { x = -14; y = rand(0, H); } const a = Math.atan2(h.y - y, h.x - x); spawnProj(x, y, Math.cos(a) * sp * 0.95, Math.sin(a) * sp * 0.95, '🟣'); }
          }
        } else {
          sacc -= dt; if (sacc <= 0) { sacc = 0.3 / hazMul; spawnProj(rand(12, W - 12), -14, rand(-30, 30), sp, '✦'); }
        }
      }

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
          timer -= dt; updateProjs(dt); tickWater(dt, false);
          if (phase === 'stagger' && timer <= 0) { reticle.hidden = true; startWave(); }
          else if (phase === 'gap' && timer <= 0) startWave();
          return;
        }
        // wave
        timer -= dt; emit(dt); updateProjs(dt); updateBolts(dt); tickWater(dt, true); tickWind(dt);
        if (timer <= 0) enterStagger();
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up); window.removeEventListener('resize', measure);
        projs.forEach(p => p.node.remove()); bolts.forEach(b => b.node.remove());
        buzz(win ? 60 : 120);   // jingles play on the result screens (the King has no voice yet)
        resolve({ win, stars: win ? (hearts >= heartsMax ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
