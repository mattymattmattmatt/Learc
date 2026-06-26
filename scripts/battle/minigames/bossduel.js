/* bossduel.js — the boss-duel engine for Glob's three henchmen and for
   Evil King Glob himself. One engine, four very different fights:

     • Minyar  — the Tantrum: stomps out expanding SHOCKWAVE RINGS and
       hurls his toys. Stay on the move and weave the rings.
     • Demonder — the Bruiser: a boxing match. Fast aimed GLOVE JABS and
       wind-up HAYMAKER slams you must side-step.
     • Clubbo  — the Crusher: heavy ground SLAMS plus full-width CLUB
       SWEEPS you have to duck under, and rolling boulders.
     • Glob    — the final duel: his crown CYCLES stolen Aspects (fire,
       flood, storm, wind, stone, shadow), enrages at half, hits hardest.

   In every fight: DRAG to survive each wave, then when the boss reels and
   the reticle appears, TAP the boss — ONE true strike per opening. Break
   the boss's guard fully to win. */
import { el, clamp, loop, rand, buzz, sparkle, floatText, petImg, S } from '../util.js';

/* warning banners per signature */
const WARN = {
  minyar: '😡 TANTRUM!', demonder: '🥊 Guard up!', clubbo: '🪵 SMASH!',
  cinders: '🔥 Embers fall!', deluge: '🌊 The flood rises!', tempest: '⚡ Lightning!',
  gale: '🌪️ Brace!', stone: '⛰️ Boulders!', gloom: '🌑 Darkness!'
};
const ASPECTS = ['cinders', 'deluge', 'tempest', 'gale', 'stone', 'gloom'];
const ASPECT_NAME = { cinders: 'Cinders', deluge: 'the Deluge', tempest: 'the Tempest', gale: 'the Gale', stone: 'Stone', gloom: 'the Gloom' };
const ASPECT_EL = { cinders: '🔥', deluge: '🌊', tempest: '⚡', gale: '🌪️', stone: '⛰️', gloom: '🌑' };

export default {
  id: 'bossduel', name: 'Boss Duel', icon: '💥',
  howto: 'DRAG to survive the boss’s onslaught, then TAP the boss when it reels — ONE strike per opening!',

  play(area, ctx) {
    return new Promise(resolve => {
      const B = ctx.foe || {};                 // boss display object (img, name, color…)
      const cfg = B.boss || {};
      const bossId = cfg.id || B.id || 'minyar';
      const isGlob = bossId === 'glob';
      const accent = B.color || (ctx.theme && ctx.theme.color) || '#ffd23f';
      const d = ctx.difficulty;

      const tags = (ctx.hero && ctx.hero.tags) || [];
      const striker = ['strength', 'attack', 'bite', 'explosive', 'stab', 'pinch'].some(t => tags.includes(t));

      let hearts = cfg.hearts || 3;
      const heartsMax = hearts;
      let crown = clamp((cfg.crown || 6) + Math.round(d * 0.2) - (striker ? 1 : 0), 5, 14);
      const crownMax = crown;
      const hitDmg = (cfg.hitDmg || 1) + (striker ? 1 : 0);
      const canEnrage = isGlob || bossId === 'clubbo' || cfg.enrage;

      area.innerHTML = `
        <div class="bd-hud" style="--accent:${accent}">
          <span class="bd-hearts" id="hearts">${'❤'.repeat(hearts)}</span>
          <span class="bd-name" id="bname">${B.name || 'Boss'}</span>
          <span class="bd-crown" id="crown">${'◆'.repeat(crown)}</span>
        </div>
        <div class="bd-field boss-${bossId}" id="field" style="--accent:${accent}">
          <div class="bd-water" id="water" hidden></div>
          <div class="bd-boss" id="boss"><img src="${petImg(B)}" alt="${B.name || 'boss'}" draggable="false"></div>
          <div class="bd-reticle" id="reticle" hidden></div>
          <div class="bd-hero" id="me"><img src="${petImg(ctx.hero)}" draggable="false"></div>
          <div class="bd-vignette" id="vig" hidden></div>
          <div class="bd-banner" id="banner">${B.name || 'Boss'}</div>
        </div>`;
      const field = area.querySelector('#field'), boss = area.querySelector('#boss');
      const reticle = area.querySelector('#reticle'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), crownEl = area.querySelector('#crown');
      const banner = area.querySelector('#banner'), water = area.querySelector('#water'), vig = area.querySelector('#vig');

      let W = 0, H = 0, size = 56, kx = 0, ky = 0, kr = 60;
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        size = clamp(Math.min(W, H) * 0.15, 42, 70); me.style.width = me.style.height = size + 'px';
        kr = clamp(Math.min(W, H) * 0.16, 48, 84);
        boss.style.width = boss.style.height = kr * 2 + 'px';
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
        py = clamp(cy - r.top - size / 2, H * 0.24, H - size);
        placeMe();
      };
      const down = e => {
        e.preventDefault();
        if (phase === 'stagger') {
          const r = field.getBoundingClientRect();
          if (Math.hypot(e.clientX - r.left - kx, e.clientY - r.top - ky) < kr * 1.4) { strike(); return; }
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
      let phase = 'intro', timer = 1.4, waveIdx = 0, iframe = 0, strikes = 0, heart = null;
      let enraged = false, burstAcc = 0, waterLevel = 0.05, drownT = 0;
      let aspect = isGlob ? ASPECTS[(Math.random() * ASPECTS.length) | 0] : null;
      const projs = [], bolts = [], zones = [], rings = [], sweeps = [];
      const broken = () => crownMax - crown;
      const pspeed = () => 165 + d * 13 + Math.min(90, broken() * 16);

      function setBanner(txt, cls = '') { banner.textContent = txt; banner.className = 'bd-banner show ' + cls; clearTimeout(banner._t); banner._t = setTimeout(() => banner.classList.remove('show'), 1100); }

      setTimeout(() => setBanner((B.name || 'The boss') + ' — ' + (B.epithet || 'guards the way!')), 320);

      /* ── emitters ── */
      function spawnProj(x, y, vx, vy, emoji, scale = 1) {
        const n = el('div', 'bd-proj', emoji); if (scale !== 1) n.style.fontSize = (1.25 * scale) + 'rem';
        n.style.left = x + 'px'; n.style.top = y + 'px';
        field.appendChild(n); projs.push({ node: n, x, y, vx, vy, r: 12 * scale });
      }
      function aimFromBoss(spread, emoji, k = 3, sMul = 1) {
        const sp = pspeed() * sMul, h = heroC(), a0 = Math.atan2(h.y - ky, h.x - kx), half = (k - 1) / 2;
        for (let i = 0; i < k; i++) { const a = a0 + (i - half) * spread; spawnProj(kx, ky, Math.cos(a) * sp, Math.sin(a) * sp, emoji); }
      }
      function radialBurst(emoji, n = 8, sMul = 0.8) {
        const sp = pspeed() * sMul, a0 = rand(0, 6.283);
        for (let i = 0; i < n; i++) { const a = a0 + (i / n) * 6.283; spawnProj(kx, ky, Math.cos(a) * sp, Math.sin(a) * sp, emoji); }
      }
      const rainRandom = (emoji, n = 1, sMul = 1) => { for (let i = 0; i < n; i++) spawnProj(rand(12, W - 12), -14, rand(-45, 45), pspeed() * sMul, emoji); };
      const rainAimed = (emoji, scale = 1.3, sMul = 0.85) => { const h = heroC(); spawnProj(clamp(h.x + rand(-60, 60), 12, Math.max(12, W - 12)), -18, rand(-12, 12), pspeed() * sMul, emoji, scale); };
      const sideShot = (emoji, vyJit = 30, sMul = 1.15) => { const fromL = Math.random() < 0.5; spawnProj(fromL ? -14 : W + 14, rand(H * 0.3, H * 0.9), (fromL ? 1 : -1) * pspeed() * sMul, rand(-vyJit, vyJit), emoji); };
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
      function spawnBolt(xAt) {
        const bw = clamp(W * 0.16, 40, 92);
        const x = xAt != null ? clamp(xAt, bw / 2, W - bw / 2) : clamp((Math.random() < 0.6 ? heroC().x + rand(-30, 30) : rand(bw, W - bw)), bw / 2, W - bw / 2);
        const n = el('div', 'bd-bolt warn'); n.style.left = (x - bw / 2) + 'px'; n.style.width = bw + 'px';
        field.appendChild(n); bolts.push({ node: n, x, bw, state: 'warn', t: clamp(0.6 - d * 0.01, 0.4, 0.6) });
      }
      function spawnZone(big = false) {
        const r = clamp(Math.min(W, H) * (big ? 0.2 : 0.13), 44, big ? 130 : 92);
        const h = heroC();
        const x = clamp(h.x + rand(-70, 70), r, Math.max(r, W - r));
        const y = clamp(h.y + rand(-70, 70), Math.max(H * 0.3, r), Math.max(H * 0.3, H - r));
        const n = el('div', 'bd-zone'); n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.width = n.style.height = r * 2 + 'px';
        field.appendChild(n);
        zones.push({ node: n, x, y, r, state: 'warn', t: clamp((big ? 1.05 : 0.9) - d * 0.02, 0.55, 1.05) });
      }
      // Minyar's signature: an expanding shockwave ring with a SAFE GAP you
      // move through — the gap is drawn into the ring so you can read it.
      function spawnRing() {
        const n = el('div', 'bd-ring'); n.style.left = kx + 'px'; n.style.top = ky + 'px';
        const gapAng = rand(0, Math.PI * 2);          // math angle (0=+x, clockwise, y-down)
        const gapHalf = 0.95;                          // ~54° each side → a wide, fair opening
        const gwDeg = gapHalf * 2 * 180 / Math.PI;
        const gcCss = (gapAng * 180 / Math.PI + 90);   // math → CSS conic angle
        const gsCss = ((gcCss - gwDeg / 2) % 360 + 360) % 360;
        n.style.setProperty('--gs', gsCss + 'deg');
        n.style.setProperty('--gw', gwDeg + 'deg');
        field.appendChild(n);
        rings.push({ node: n, r: kr * 0.5, max: Math.hypot(W, H), spd: 120 + d * 13 + broken() * 8, hit: false, gapAng, gapHalf });
      }
      // Clubbo's signature: a club SWEEP with a SAFE GAP — slide into the hole.
      // The gap is drawn into the bar (and telegraphed) so it's always dodgeable.
      function spawnSweep() {
        const vertical = Math.random() < 0.5;        // vertical bar slides sideways
        const thick = clamp(Math.min(W, H) * 0.11, 34, 72);
        const dir = Math.random() < 0.5 ? 1 : -1;
        const crossLen = vertical ? H : W;           // full length of the bar
        const gapLen = clamp(size * 2.6, 96, crossLen * 0.5);
        const gapMin = vertical ? H * 0.26 : 8;      // keep the gap inside the hero's reach
        const gapPos = rand(gapMin, Math.max(gapMin, crossLen - gapLen - 6));
        const n = el('div', 'bd-sweep ' + (vertical ? 'vert' : 'horiz') + ' warn');
        if (vertical) { n.style.width = thick + 'px'; n.style.height = '100%'; n.style.top = '0'; }
        else { n.style.height = thick + 'px'; n.style.width = '100%'; n.style.left = '0'; }
        n.style.setProperty('--g0', gapPos + 'px');
        n.style.setProperty('--g1', (gapPos + gapLen) + 'px');
        field.appendChild(n);
        const span = vertical ? W : H - H * 0.24;
        const start = dir > 0 ? -thick : span + thick;
        sweeps.push({ node: n, vertical, thick, dir, pos: start, span, gapPos, gapLen,
          spd: (span + thick * 2) / 1.5, state: 'warn', t: clamp(0.85 - d * 0.012, 0.5, 0.85), top0: vertical ? 0 : H * 0.24 });
      }

      /* ── attack pools ── */
      const P = {
        minyar: [
          { name: 'toy toss',   every: () => clamp(0.5 - d * 0.014, 0.28, 0.5), fire: () => rainAimed(pick(['🧸', '🪀', '🧱', '🔔']), 1.3, 0.9) },
          { name: 'shockwave',  every: () => 1.5, fire: () => { spawnRing(); if (enraged) setTimeout(spawnRing, 260); } },
          { name: 'tantrum fit', every: () => 0.85, fire: () => { aimFromBoss(0.3, '😤', enraged ? 5 : 3, 0.95); } }
        ],
        demonder: [
          { name: 'jab combo',  every: () => clamp(0.42 - d * 0.012, 0.22, 0.42), fire: () => aimFromBoss(0.12, '🥊', enraged ? 3 : 2, 1.15) },
          { name: 'haymaker',   every: () => 1.25, fire: () => spawnZone(true) },
          { name: 'hooks',      every: () => 0.7,  fire: () => { sideShot('🥊', 24, 1.2); if (enraged) sideShot('🥊', 24, 1.2); } }
        ],
        clubbo: [
          { name: 'ground slam', every: () => 1.1, fire: () => { spawnZone(true); if (enraged) spawnZone(); } },
          { name: 'club sweep',  every: () => 1.5, fire: () => spawnSweep() },
          { name: 'boulders',    every: () => clamp(0.7 - d * 0.015, 0.4, 0.7), fire: () => sideShot('🪨', 12, 0.85) }
        ],
        // Glob's crown — one pool per stolen Aspect
        cinders: [
          { name: 'ember rain', every: () => clamp(0.34 - d * 0.012, 0.16, 0.34), fire: () => rainRandom('🔥', enraged ? 2 : 1) },
          { name: 'fan volley', every: () => 0.95, fire: () => aimFromBoss(0.24, '🔥', enraged ? 5 : 3) },
          { name: 'eruptions',  every: () => 1.0,  fire: () => { spawnZone(); if (enraged) spawnZone(); } }
        ],
        deluge: [
          { name: 'rising tide', every: () => clamp(0.55 - d * 0.015, 0.3, 0.55), fire: () => riseShot('💧') },
          { name: 'water jets',  every: () => 0.75, fire: () => { sideShot('💦', 20, 1.05); if (enraged) sideShot('💦', 20, 1.05); } },
          { name: 'downpour',    every: () => 0.5,  fire: () => rainRandom('💧', 1, 0.9) }
        ],
        tempest: [
          { name: 'hunting bolts', every: () => clamp(0.8 - d * 0.025, 0.4, 0.8), fire: () => { spawnBolt(); if (enraged) spawnBolt(); } },
          { name: 'static arc',    every: () => 0.85, fire: () => aimFromBoss(0.32, '⚡', 2, 0.95) },
          { name: 'sparks',        every: () => 0.4,  fire: () => rainRandom('⚡', 1, 1.05) }
        ],
        gale: [
          { name: 'gusts',      every: () => clamp(0.4 - d * 0.012, 0.22, 0.4), fire: () => sideShot('💨') },
          { name: 'leaf storm', every: () => 0.5,  fire: () => { sideShot('🍃', 90, 1.0); if (enraged) sideShot('🍃', 90, 1.0); } },
          { name: 'twisters',   every: () => 1.15, fire: () => spawnProj(rand(20, W - 20), -16, rand(-130, 130), pspeed() * 0.8, '🌪️', 1.4) }
        ],
        stone: [
          { name: 'aimed boulder', every: () => clamp(0.55 - d * 0.015, 0.3, 0.55), fire: () => rainAimed('🪨', 1.5, 0.85) },
          { name: 'rockslide',     every: () => 0.8,  fire: () => sideShot('🪨', 14, 0.7) },
          { name: 'crush zone',    every: () => 1.1,  fire: () => spawnZone(true) }
        ],
        gloom: [
          { name: 'shadow bolts', every: () => clamp(0.42 - d * 0.012, 0.22, 0.42), fire: () => homingEdge('🟣', enraged ? 2 : 1) },
          { name: 'void ring',    every: () => 1.5,  fire: () => radialBurst('🟣', enraged ? 10 : 8, 0.72) },
          { name: 'creeping dark', every: () => 1.1, fire: () => { homingEdge('🟣', 2, 0.85); vig.classList.remove('pulse'); void vig.offsetWidth; vig.classList.add('pulse'); } }
        ]
      };
      const pick = arr => arr[(Math.random() * arr.length) | 0];
      const poolFor = () => P[isGlob ? aspect : bossId] || P.minyar;

      let pat = null, lastPat = null, patT = 0, patAcc = 0;
      function pickPattern() {
        const pool = poolFor();
        let cand; do { cand = pool[(Math.random() * pool.length) | 0]; } while (pool.length > 1 && cand === lastPat);
        lastPat = pat = cand; patT = rand(1.6, 2.5); patAcc = 0.2;
      }

      // Glob: per-aspect hazard scenery (water / darkness)
      function applyAspect() {
        water.hidden = aspect !== 'deluge';
        if (aspect === 'deluge') { waterLevel = 0.05; water.style.height = '5%'; }
        if (aspect === 'gloom') { vig.hidden = false; vig.style.setProperty('--gr', '130px'); } else vig.hidden = true;
        field.className = 'bd-field boss-glob aspect-' + aspect + (enraged ? ' enraged' : '');
      }
      if (isGlob) applyAspect();

      function hurt(n = 1) {
        if (iframe > 0 || done) return;
        iframe = 1.0; hearts = Math.max(0, hearts - n); heartsEl.textContent = '❤'.repeat(hearts);
        me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt'); S.hit(); buzz(70);
        floatText(area, heroC().x, heroC().y, '−' + n, 'bad');
        if (hearts <= 0) finish(false);
      }

      /* a healing heart that slowly drifts down the screen — tap it to refill
         all your hearts (Glob fight only, after the 3rd hit) */
      function spawnHeart() {
        if (heart || done) return;
        const hx = clamp(W * (0.25 + Math.random() * 0.5), 30, W - 30);
        const n = el('div', 'bd-heart', '❤');
        n.style.left = hx + 'px'; n.style.top = (ky + kr) + 'px';
        n.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); reviveHearts(); });
        field.appendChild(n);
        heart = { node: n, x: hx, y: ky + kr, vy: 38 };
        setBanner('💗 A heart! Tap it to heal!');
      }
      function reviveHearts() {
        if (!heart || done) return;
        hearts = heartsMax; heartsEl.textContent = '❤'.repeat(hearts);
        sparkle(field, heart.x, heart.y, 14, ['❤', '💖', '✨']); S.star(); buzz(40);
        floatText(area, heart.x, heart.y, 'HEARTS RESTORED!', 'good');
        heart.node.remove(); heart = null;
      }
      function updateHeart(dt) {
        if (!heart) return;
        heart.vy += 16 * dt; heart.y += heart.vy * dt;     // a slow, gentle fall
        heart.node.style.top = heart.y + 'px';
        if (heart.y > H + 36) { heart.node.remove(); heart = null; }   // missed — drifts off-screen
      }

      /* ── phases ── */
      function startWave() {
        phase = 'wave'; waveIdx++;
        timer = Math.max(3.6, (isGlob ? 6.6 : 6.0) - broken() * 0.16);
        burstAcc = 0.8;
        boss.classList.remove('stagger'); reticle.hidden = true;
        pickPattern();
        setBanner(WARN[isGlob ? aspect : bossId] || '⚠️ Attack!');
      }
      function enterStagger() {
        phase = 'stagger'; timer = isGlob ? 1.7 : 2.0;
        clearHazards();
        boss.classList.add('stagger'); reticle.hidden = false;
        reticle.style.left = kx + 'px'; reticle.style.top = ky + 'px'; reticle.style.width = reticle.style.height = kr * 2.6 + 'px';
        setBanner('⚔ STRIKE NOW!', 'strike');
      }
      function enterRecover(msg) { phase = 'gap'; timer = 0.8; boss.classList.remove('stagger'); reticle.hidden = true; if (msg) setBanner(msg); }
      function strike() {
        if (phase !== 'stagger' || done) return;
        crown = Math.max(0, crown - hitDmg); crownEl.textContent = '◆'.repeat(crown);
        boss.classList.remove('hit'); void boss.offsetWidth; boss.classList.add('hit');
        sparkle(field, kx, ky, 14); floatText(area, kx, ky, 'CRACK! −' + hitDmg, 'good'); S.hit(); buzz(60);
        if (crown <= 0) return finish(true);
        strikes++;
        if (isGlob && strikes === 3) spawnHeart();    // a healing heart drifts down — tap it!
        if (isGlob) { aspect = ASPECTS[(ASPECTS.indexOf(aspect) + 1 + ((Math.random() * 5) | 0)) % ASPECTS.length]; applyAspect(); }
        if (canEnrage && !enraged && crown <= Math.ceil(crownMax / 2)) {
          enraged = true; field.classList.add('enraged');
          setTimeout(() => setBanner(isGlob ? '🔥 The crown blazes with fury!' : '😡 ' + (B.name || 'The boss') + ' is furious!'), 300);
          S.bad(); buzz(90);
        }
        enterRecover((B.name || 'The boss') + ' reels!');
      }
      function clearHazards() {
        projs.forEach(p => p.node.remove()); projs.length = 0;
        bolts.forEach(b => b.node.remove()); bolts.length = 0;
        zones.forEach(z => z.node.remove()); zones.length = 0;
        rings.forEach(r => r.node.remove()); rings.length = 0;
        sweeps.forEach(s => s.node.remove()); sweeps.length = 0;
      }

      /* ── per-frame collision updates ── */
      function updateProjs(dt) {
        const h = heroC(), hr = size * 0.42;
        for (let i = projs.length - 1; i >= 0; i--) {
          const p = projs[i]; if (!p || done) break;
          p.x += p.vx * dt; p.y += p.vy * dt;
          p.node.style.left = p.x + 'px'; p.node.style.top = p.y + 'px';
          if (p.x < -40 || p.x > W + 40 || p.y < -40 || p.y > H + 40) { p.node.remove(); projs.splice(i, 1); continue; }
          if (iframe <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < hr + p.r) { p.node.remove(); projs.splice(i, 1); hurt(); }
        }
      }
      function updateBolts(dt) {
        const h = heroC();
        for (let i = bolts.length - 1; i >= 0; i--) {
          const b = bolts[i]; if (!b || done) break;
          b.t -= dt;
          if (b.state === 'warn' && b.t <= 0) { b.state = 'strike'; b.t = 0.2; b.node.classList.remove('warn'); b.node.classList.add('strike'); S.bad(); buzz(20); }
          if (b.state === 'strike') { if (iframe <= 0 && Math.abs(h.x - b.x) < b.bw / 2 + size * 0.2) hurt(); if (b.t <= 0) { b.node.remove(); bolts.splice(i, 1); } }
        }
      }
      function updateZones(dt) {
        const h = heroC(), hr = size * 0.42;
        for (let i = zones.length - 1; i >= 0; i--) {
          const z = zones[i]; if (!z || done) break;
          z.t -= dt;
          if (z.state === 'warn' && z.t <= tele(z)) z.node.classList.add('arm');
          if (z.state === 'warn' && z.t <= 0) {
            z.state = 'slam'; z.t = 0.24; z.node.classList.add('slam'); S.hit(); buzz(20);
            if (iframe <= 0 && Math.hypot(z.x - h.x, z.y - h.y) < z.r * 0.9 + hr * 0.5) hurt();
          } else if (z.state === 'slam' && z.t <= 0) { z.node.remove(); zones.splice(i, 1); }
        }
      }
      const tele = z => 0.3;   // arm cue near the end of the warn window
      function updateRings(dt) {
        const h = heroC(), hr = size * 0.4, band = clamp(size * 0.5, 22, 40);
        for (let i = rings.length - 1; i >= 0; i--) {
          const rg = rings[i]; if (!rg || done) break;
          rg.r += rg.spd * dt;
          rg.node.style.width = rg.node.style.height = rg.r * 2 + 'px';
          if (iframe <= 0 && !rg.hit) {
            const dist = Math.hypot(h.x - kx, h.y - ky);
            if (Math.abs(dist - rg.r) < band + hr * 0.4) {
              const a = Math.atan2(h.y - ky, h.x - kx);
              const diff = Math.atan2(Math.sin(a - rg.gapAng), Math.cos(a - rg.gapAng));
              if (Math.abs(diff) > rg.gapHalf) { rg.hit = true; hurt(); }  // safe if inside the gap arc
            }
          }
          if (rg.r > rg.max) { rg.node.remove(); rings.splice(i, 1); }
        }
      }
      function updateSweeps(dt) {
        const h = heroC(), hr = size * 0.42;
        for (let i = sweeps.length - 1; i >= 0; i--) {
          const s = sweeps[i]; if (!s || done) break;
          s.t -= dt;
          if (s.state === 'warn') {
            // park the warning bar at its entry edge
            if (s.vertical) s.node.style.left = clamp(s.pos, -s.thick, W) + 'px';
            else s.node.style.top = (s.top0 + clamp(s.pos, -s.thick, s.span)) + 'px';
            if (s.t <= 0) { s.state = 'go'; s.node.classList.remove('warn'); s.node.classList.add('go'); S.swipe(); }
            continue;
          }
          s.pos += s.dir * s.spd * dt;
          if (s.vertical) {
            s.node.style.left = s.pos + 'px';
            if (iframe <= 0 && h.x > s.pos - hr && h.x < s.pos + s.thick + hr) {
              const safe = h.y > s.gapPos + hr * 0.5 && h.y < s.gapPos + s.gapLen - hr * 0.5;
              if (!safe) hurt();
            }
          } else {
            const y = s.top0 + s.pos;
            s.node.style.top = y + 'px';
            if (iframe <= 0 && h.y > y - hr && h.y < y + s.thick + hr) {
              const safe = h.x > s.gapPos + hr * 0.5 && h.x < s.gapPos + s.gapLen - hr * 0.5;
              if (!safe) hurt();
            }
          }
          if (s.pos < -s.thick * 2 || s.pos > (s.vertical ? W : s.span) + s.thick * 2) { s.node.remove(); sweeps.splice(i, 1); }
        }
      }
      function tickWater(dt, rising) {
        if (!isGlob || aspect !== 'deluge') return;
        const maxWater = 0.56;
        waterLevel = rising ? Math.min(maxWater, waterLevel + 0.13 * dt) : Math.max(0.05, waterLevel - 0.16 * dt);
        water.style.height = (waterLevel * 100) + '%';
        if (heroC().y > H - waterLevel * H + size * 0.1) { drownT += dt; if (drownT >= 1.0) { drownT = 0; hurt(); } } else drownT = 0;
      }
      function tickVignette() {
        if (!isGlob || aspect !== 'gloom') return;
        const h = heroC(); vig.style.setProperty('--gx', h.x + 'px'); vig.style.setProperty('--gy', h.y + 'px');
      }

      let done = false;
      const stop = loop((dt, now) => {
        if (done) return false;
        iframe = Math.max(0, iframe - dt);
        updateHeart(dt);
        boss.style.left = (kx - kr) + 'px'; boss.style.top = (ky - kr + Math.sin(now / 500) * 6) + 'px';
        tickVignette();

        if (phase === 'intro') { timer -= dt; if (timer <= 0) startWave(); return; }
        if (phase === 'gap' || phase === 'stagger') {
          timer -= dt; updateProjs(dt); updateZones(dt); updateRings(dt); updateSweeps(dt); tickWater(dt, false);
          if (phase === 'stagger' && timer <= 0) enterRecover('The opening closes…');
          else if (phase === 'gap' && timer <= 0) startWave();
          return;
        }
        // wave
        timer -= dt;
        patT -= dt; if (patT <= 0) pickPattern();
        patAcc -= dt; if (patAcc <= 0 && pat) { patAcc = pat.every(); pat.fire(); }
        if (enraged) { burstAcc -= dt; if (burstAcc <= 0) { burstAcc = 1.8; radialBurst('✦', 9, 0.85); } }
        updateProjs(dt); updateBolts(dt); updateZones(dt); updateRings(dt); updateSweeps(dt); tickWater(dt, true);
        if (timer <= 0) enterStagger();
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up); window.removeEventListener('resize', measure);
        clearHazards();
        if (heart) { heart.node.remove(); heart = null; }
        buzz(win ? 60 : 120);
        resolve({ win, stars: win ? (hearts >= heartsMax ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
