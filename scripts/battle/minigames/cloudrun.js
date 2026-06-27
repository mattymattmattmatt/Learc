/* Cloud Runner — Yellogen's game. A one-touch auto-runner: you sprint right
   at a constant pace and your ONLY control is the jump. TAP for a short hop,
   HOLD for a higher, longer leap, release to fall. Clear the hand-built course
   of gaps, spikes and floating blocks to reach the flag. One slip = instant
   death, but you restart at once — the "just one more go" loop. (Skill only;
   difficulty nudges the run speed.) */
import { el, clamp, loop, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'cloudrun', name: 'Cloud Runner', icon: '🏃',
  howto: 'One touch! TAP to hop, HOLD to leap higher. Run to the 🏁 — one slip and you’re back to the start.',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const accent = (ctx.theme && ctx.theme.color) || '#ffd23f';
      const vx = clamp(196 + d * 3.2, 200, 236);                 // run speed (px/s)

      /* ── hand-built level (world px; vertical as a fraction of field H) ──
         plats: solid ground blocks (top .80) + a couple floating slabs.
         spikes: floor hazards (up) / ceiling hazards (down). gaps = empty. */
      const G = 0.80;
      const plats = [
        { x: 0,    w: 720, top: G, solid: true },
        { x: 830,  w: 560, top: G, solid: true },
        { x: 1500, w: 430, top: G, solid: true },
        { x: 2040, w: 170, top: 0.72, solid: false },             // floating block
        { x: 2320, w: 600, top: G, solid: true },
        { x: 3030, w: 150, top: G, solid: true },                 // tiny landing
        { x: 3290, w: 560, top: G, solid: true },
        { x: 3960, w: 160, top: 0.73, solid: false },             // floating block
        { x: 4230, w: 160, top: 0.70, solid: false },             // higher floating block
        { x: 4500, w: 820, top: G, solid: true }
      ];
      const spikes = [
        { x: 548,  w: 26, dir: 'up' },
        { x: 1700, w: 26, dir: 'up' },
        { x: 2440, w: 300, dir: 'down' },                         // ceiling teeth: DON'T over-jump
        { x: 3460, w: 26, dir: 'up' },
        { x: 3650, w: 26, dir: 'up' }
      ];
      const flagX = 5180, startX = 70;

      area.innerHTML = `
        <div class="cr-hud" style="--accent:${accent}">
          <span>🏁 Reach the flag!</span>
          <span class="cr-deaths">wipeouts <b id="dn">0</b></span>
        </div>
        <div class="cr-field" id="field">
          <div class="cr-parallax"></div>
          <div class="cr-world" id="world"></div>
          <div class="cr-char" id="char"><img src="${petImg(ctx.hero)}" draggable="false"></div>
          <div class="cr-flash" id="flash"></div>
          <div class="cr-banner" id="ban"></div>
          <button class="cr-quit" id="quit">✕</button>
        </div>
        <div class="dg-hint">Tap = hop · Hold = big leap</div>`;
      const field = area.querySelector('#field'), world = area.querySelector('#world');
      const charEl = area.querySelector('#char'), flash = area.querySelector('#flash');
      const dnEl = area.querySelector('#dn'), ban = area.querySelector('#ban'), quit = area.querySelector('#quit');

      let W = 0, H = 0, cs = 40;
      const nodes = [];
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        cs = clamp(Math.min(W, H) * 0.085, 28, 46);
        charEl.style.width = charEl.style.height = cs + 'px';
        layout();
      };
      function layout() {
        world.innerHTML = ''; nodes.length = 0;
        const spikeH = H * 0.06;
        for (const p of plats) {
          const n = el('div', 'cr-plat' + (p.solid ? '' : ' float'));
          const topPx = p.top * H;
          n.style.width = p.w + 'px';
          n.style.height = (p.solid ? (H - topPx) : Math.max(16, H * 0.05)) + 'px';
          n._x = p.x; n._top = topPx;
          world.appendChild(n); nodes.push(n);
        }
        for (const s of spikes) {
          const n = el('div', 'cr-spike ' + s.dir);
          n.style.width = s.w + 'px'; n.style.height = spikeH + 'px';
          n._x = s.x; n._top = s.dir === 'up' ? (G * H - spikeH) : 0;
          world.appendChild(n); nodes.push(n);
        }
        const fl = el('div', 'cr-flag', '🏁'); fl._x = flagX; fl._top = G * H - H * 0.16; nodes.push(fl); world.appendChild(fl);
      }
      measure(); window.addEventListener('resize', measure);

      // ── runner state ──
      const charHF = () => cs / H;
      let cx = startX, cyF = G - cs / H, vyF = 0, grounded = true, curPlat = plats[0];
      let holding = false, holdT = 0, deaths = 0, done = false, dead = false, won = false;
      const V0 = 1.72, gHold = 3.4, gFall = 7.8, HOLD_MAX = 0.28;

      function reset() {
        cx = startX; cyF = G - charHF(); vyF = 0; grounded = true; curPlat = plats[0];
        holding = false; holdT = 0; dead = false;
      }
      function jumpDown() {
        if (done || dead) return;
        if (grounded) { vyF = -V0; grounded = false; holding = true; holdT = 0; S.tick(); buzz(8); }
      }
      function jumpUp() { holding = false; }
      const onDown = e => { if (e.target === quit) return; e.preventDefault(); jumpDown(); };
      const onUp = e => { jumpUp(); };
      field.addEventListener('pointerdown', onDown);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
      quit.addEventListener('pointerdown', e => { e.stopPropagation(); finish(false); });

      function die() {
        if (dead || done) return;
        dead = true; deaths++; dnEl.textContent = deaths;
        S.lose(); buzz(90); sfx(ctx.foe.sfx, 0.5);
        flash.classList.remove('on'); void flash.offsetWidth; flash.classList.add('on');
        charEl.classList.add('dead');
        setTimeout(() => { if (done) return; charEl.classList.remove('dead'); reset(); }, 380);
      }

      // expose read-only state so an automated playtest can time its jumps
      try { window.__cr = { get x() { return cx; }, get grounded() { return grounded; }, get deaths() { return deaths; }, get done() { return done; }, plats, spikes, flagX, get vx() { return vx; }, get cs() { return cs; } }; } catch {}

      function platUnder(x, x2) {
        let best = null;
        for (const p of plats) if (x2 > p.x && x < p.x + p.w) { if (!best || p.top < best.top) best = p; }
        return best;
      }

      const stop = loop(dt => {
        if (done) return false;
        if (!dead) {
          cx += vx * dt;
          // vertical physics
          if (!grounded) {
            holdT += dt;
            const g = (holding && vyF < 0 && holdT < HOLD_MAX) ? gHold : gFall;
            vyF += g * dt; cyF += vyF * dt;
          }
          const prevBottom = cyF + charHF() - vyF * dt;   // (approx) bottom last frame
          const bottom = cyF + charHF();
          // landing
          if (vyF >= 0) {
            for (const p of plats) {
              if (cx + cs > p.x && cx < p.x + p.w && prevBottom <= p.top + 0.02 && bottom >= p.top) {
                cyF = p.top - charHF(); vyF = 0; grounded = true; curPlat = p; break;
              }
            }
          }
          // walked off the edge?
          if (grounded) {
            if (cx + cs * 0.4 > curPlat.x + curPlat.w || cx + cs * 0.6 < curPlat.x) grounded = false;
          }
          // fell into a gap
          if (bottom > 1.06) return die();
          // spike collisions
          const cb = cyF + charHF(), ct = cyF;
          for (const s of spikes) {
            if (!(cx + cs > s.x && cx < s.x + s.w)) continue;
            if (s.dir === 'up' && cb > G - 0.05) return die();           // low enough to hit floor teeth
            if (s.dir === 'down' && ct < 0.28) return die();             // leapt too high into the ceiling teeth
          }
          if (cx >= flagX) return win();
        }
        render();
      });

      function render() {
        const camX = cx - W * 0.30;
        for (const n of nodes) n.style.transform = `translate3d(${(n._x - camX)}px, ${n._top}px, 0)`;
        charEl.style.transform = `translate3d(${W * 0.30}px, ${cyF * H}px, 0)`;
      }
      function setBanner(t) { ban.textContent = t; ban.classList.add('show'); }

      function win() {
        if (done) return false; won = true;
        setBanner('🏁 Cleared!'); S.win(); buzz(40);
        return finish(true);
      }
      function finish(winFlag) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp); window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('resize', measure);
        try { delete window.__cr; } catch {}
        if (!winFlag) sfx(ctx.foe.sfx, 0.7);
        resolve({ win: winFlag, stars: winFlag ? (deaths === 0 ? 3 : deaths <= 3 ? 2 : 1) : 1 });
        return false;
      }
    });
  }
};
