/* The Gilded King — a bespoke 1-on-1 boss duel. Survive the crown's attack
   waves (drag your hero to dodge), then STRIKE the crown while it's exposed.
   Crack it enough times to win; lose all three hearts and you fall.
   Each crack makes the King fight harder. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, petImg, KING_GIF, S } from '../util.js';

const PATTERNS = ['rain', 'radial', 'aimed', 'spiral'];

export default {
  id: 'kingfight', name: 'The Gilded King', icon: '👑',
  howto: 'DRAG to dodge the King’s attacks, then TAP the crown when it glows to strike!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;                       // ~10 normal, ~6 story
      const crownMax = clamp(Math.round(d * 0.5) + 1, 4, 6);
      let crown = crownMax, hearts = 3, done = false;

      area.innerHTML = `
        <div class="kf-hud">
          <span class="kf-hearts" id="hearts">${'❤'.repeat(hearts)}</span>
          <span class="kf-crown" id="crown">${'♛'.repeat(crown)}</span>
        </div>
        <div class="kf-field" id="field">
          <div class="kf-king" id="king"><img src="${KING_GIF}" alt="King"></div>
          <div class="kf-reticle" id="reticle" hidden></div>
          <div class="kf-hero" id="me"><img src="${petImg(ctx.hero)}" draggable="false"></div>
          <div class="kf-banner" id="banner">The Gilded King!</div>
        </div>`;
      const field = area.querySelector('#field'), king = area.querySelector('#king');
      const reticle = area.querySelector('#reticle'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), crownEl = area.querySelector('#crown');
      const banner = area.querySelector('#banner');

      let W = 0, H = 0, size = 56, kx = 0, ky = 0, kr = 60;
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        size = clamp(Math.min(W, H) * 0.15, 42, 70); me.style.width = me.style.height = size + 'px';
        kr = clamp(Math.min(W, H) * 0.16, 48, 80);
        king.style.width = king.style.height = kr * 2 + 'px';
        kx = W / 2; ky = H * 0.17;
      };
      measure(); window.addEventListener('resize', measure);

      // hero position (drag)
      let px = W / 2 - size / 2, py = H * 0.74;
      const placeMe = () => { me.style.transform = `translate(${px}px,${py}px)`; };
      placeMe();
      let dragging = false;
      const heroC = () => ({ x: px + size / 2, y: py + size / 2 });
      const moveHero = (cx, cy) => {
        const r = field.getBoundingClientRect();
        px = clamp(cx - r.left - size / 2, 0, W - size);
        py = clamp(cy - r.top - size / 2, H * 0.32, H - size);   // hero stays in lower area
        placeMe();
      };
      const down = e => {
        e.preventDefault();
        if (phase === 'stagger') {                    // tapping the glowing crown = strike
          const r = field.getBoundingClientRect();
          if (Math.hypot(e.clientX - r.left - kx, e.clientY - r.top - ky) < kr * 1.25) { strike(); return; }
        }
        dragging = true; moveHero(e.clientX, e.clientY);
      };
      const move = e => { if (dragging) { moveHero(e.clientX, e.clientY); e.preventDefault(); } };
      const up = () => { dragging = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      // ── state machine ──
      let phase = 'intro', timer = 1.3, pattern = 'rain', waveIdx = 0, iframe = 0, sacc = 0, spin = 0;
      const projs = [];
      const broken = () => crownMax - crown;
      const pspeed = () => 120 + d * 14 + broken() * 16;
      const banners = { rain: '☔ DODGE!', radial: '✦ DODGE!', aimed: '🎯 DODGE!', spiral: '🌀 DODGE!' };

      function setBanner(txt, cls = '') { banner.textContent = txt; banner.className = 'kf-banner show ' + cls; setTimeout(() => banner.classList.remove('show'), 1100); }

      function startWave() {
        phase = 'wave'; pattern = PATTERNS[waveIdx % PATTERNS.length]; waveIdx++;
        timer = clamp(4.6 - broken() * 0.18, 3.2, 4.6); sacc = 0;
        king.classList.remove('stagger'); reticle.hidden = true;
        setBanner(banners[pattern]);
        field.dataset.phase = 'wave';
      }
      function enterStagger() {
        phase = 'stagger'; timer = 1.9; projs.forEach(p => p.node.remove()); projs.length = 0;
        king.classList.add('stagger'); reticle.hidden = false;
        reticle.style.left = kx + 'px'; reticle.style.top = ky + 'px'; reticle.style.width = reticle.style.height = kr * 2.6 + 'px';
        setBanner('⚔ STRIKE THE CROWN!', 'strike');
        field.dataset.phase = 'stagger';
      }
      function strike() {
        if (phase !== 'stagger' || done) return;
        crown--; crownEl.textContent = '♛'.repeat(Math.max(0, crown));
        king.classList.remove('hit'); void king.offsetWidth; king.classList.add('hit');
        sparkle(field, kx, ky, 12); floatText(area, kx, ky, 'CRACK! −1', 'good'); S.hit(); buzz(60);
        phase = 'gap'; timer = 0.7; reticle.hidden = true; field.dataset.phase = 'gap';
        if (crown <= 0) finish(true);
      }

      function spawnShard(x, y, vx, vy, cls = '') { const n = el('div', 'kf-shard ' + cls); n.style.left = x + 'px'; n.style.top = y + 'px'; field.appendChild(n); projs.push({ node: n, x, y, vx, vy }); }
      function emit(dt) {
        const sp = pspeed();
        if (pattern === 'rain') {
          sacc -= dt; if (sacc <= 0) { sacc = clamp(0.42 - d * 0.02, 0.16, 0.42); const n = 1 + (broken() >= 3 ? 1 : 0); for (let i = 0; i < n; i++) spawnShard(rand(10, W - 10), -12, rand(-40, 40), sp * 0.9); }
        } else if (pattern === 'radial') {
          sacc -= dt; if (sacc <= 0) { sacc = clamp(0.95 - d * 0.03, 0.55, 0.95); const N = 8 + broken() * 2; spin += 0.5; for (let i = 0; i < N; i++) { const a = (i / N) * 6.283 + spin; spawnShard(kx, ky, Math.cos(a) * sp * 0.7, Math.sin(a) * sp * 0.7); } }
        } else if (pattern === 'aimed') {
          sacc -= dt; if (sacc <= 0) { sacc = clamp(0.5 - d * 0.02, 0.26, 0.5); const h = heroC(); const a = Math.atan2(h.y - ky, h.x - kx); for (let k = -1; k <= 1; k++) { const aa = a + k * 0.18; spawnShard(kx, ky, Math.cos(aa) * sp, Math.sin(aa) * sp); } }
        } else { // spiral
          sacc -= dt; if (sacc <= 0) { sacc = 0.07; spin += 0.42; const a = spin; spawnShard(kx, ky, Math.cos(a) * sp * 0.8, Math.sin(a) * sp * 0.8); const a2 = spin + Math.PI; spawnShard(kx, ky, Math.cos(a2) * sp * 0.8, Math.sin(a2) * sp * 0.8); }
        }
      }

      const stop = loop((dt, now) => {
        if (done) return false;
        iframe = Math.max(0, iframe - dt);
        king.style.left = (kx - kr) + 'px'; king.style.top = (ky - kr + Math.sin(now / 500) * 6) + 'px';

        if (phase === 'intro') { timer -= dt; if (timer <= 0) startWave(); return; }
        if (phase === 'gap') { timer -= dt; if (timer <= 0) startWave(); return; }
        if (phase === 'stagger') { timer -= dt; if (timer <= 0) { reticle.hidden = true; startWave(); } return; }

        // phase === 'wave'
        timer -= dt; emit(dt);
        const h = heroC(), hr = size * 0.42;
        for (let i = projs.length - 1; i >= 0; i--) {
          const p = projs[i]; p.x += p.vx * dt; p.y += p.vy * dt;
          p.node.style.left = p.x + 'px'; p.node.style.top = p.y + 'px';
          if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) { p.node.remove(); projs.splice(i, 1); continue; }
          if (iframe <= 0 && Math.hypot(p.x - h.x, p.y - h.y) < hr + 7) {
            p.node.remove(); projs.splice(i, 1);
            hearts--; iframe = 1.0; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts));
            me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt');
            S.hit(); buzz(70); floatText(area, h.x, h.y, '−1', 'bad');
            if (hearts <= 0) return finish(false);
          }
        }
        if (timer <= 0) enterStagger();
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        window.removeEventListener('resize', measure);
        projs.forEach(p => p.node.remove());
        (win ? S.win : S.lose)(); buzz(win ? 60 : 120);   // the King has no entrance voice yet
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
