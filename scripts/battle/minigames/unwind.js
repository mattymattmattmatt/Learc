/* Break Free — Chocker's coils have you! A sweep spins around the coil;
   TAP the instant it lines up with a glowing link to snap it. Snap every
   link to wriggle loose before the squeeze crushes you. Mistimed taps let
   the coil tighten. */
import { el, clamp, loop, rand, sfx, buzz, petImg, S } from '../util.js';

export default {
  id: 'unwind', name: 'Break Free', icon: '🌀',
  howto: 'TAP the moment the spinning sweep lines up with a glowing link — snap them all before you’re crushed!',

  play(area, ctx) {
    return new Promise(resolve => {
      const links = 4 + Math.floor(ctx.difficulty / 3);          // 4..7 links
      let snapped = 0, squeeze = 0, done = false;
      const spin = 1.7 + ctx.difficulty * 0.16;                  // sweep speed (rad/s)
      const tol = clamp(0.42 - ctx.difficulty * 0.02, 0.16, 0.42); // angular hit window
      const squeezeRate = 0.045 + ctx.difficulty * 0.006;
      const slipPenalty = 0.06;

      area.innerHTML = `
        <div class="bf-hud"><span>Snap <b id="sn">0</b>/${links}</span>
          <div class="bf-sqbar"><div class="bf-sqfill" id="sq"></div></div></div>
        <div class="bf-field" id="field">
          <div class="bf-ring" id="ring">
            <div class="bf-hero"><img src="${petImg(ctx.hero)}" draggable="false"></div>
            <div class="bf-ptr" id="ptr"></div>
          </div>
        </div>
        <div class="dg-hint">Tap when the sweep hits a glowing link!</div>`;
      const field = area.querySelector('#field'), ring = area.querySelector('#ring'), ptr = area.querySelector('#ptr');
      const snEl = area.querySelector('#sn'), sqEl = area.querySelector('#sq');

      let ringR = 90, R = 70;
      const linkData = [];
      { const base = Math.random() * 6.283; for (let i = 0; i < links; i++) linkData.push({ angle: (base + i * (6.283 / links) + rand(-0.22, 0.22)) % 6.283, snapped: false, node: null }); }
      const placeLinks = () => {
        linkData.forEach(l => {
          if (!l.node) { l.node = el('div', 'bf-link'); ring.appendChild(l.node); }
          l.node.style.left = (ringR + Math.cos(l.angle) * R) + 'px';
          l.node.style.top = (ringR + Math.sin(l.angle) * R) + 'px';
        });
      };
      const measure = () => { const r = ring.getBoundingClientRect(); ringR = r.width / 2; R = ringR * 0.82; ptr.style.width = R + 'px'; placeLinks(); };
      measure(); window.addEventListener('resize', measure);

      let ang = 0;
      const norm = a => { a %= 6.283; if (a < 0) a += 6.283; return a; };
      const adiff = (a, b) => { let d = Math.abs(norm(a) - norm(b)); if (d > 3.1416) d = 6.283 - d; return d; };

      const onTap = e => {
        e.preventDefault(); if (done) return;
        let best = null, bd = 1e9;
        for (const l of linkData) { if (l.snapped) continue; const d = adiff(ang, l.angle); if (d < bd) { bd = d; best = l; } }
        if (best && bd <= tol) {
          best.snapped = true; snapped++; snEl.textContent = snapped; best.node.classList.add('snapped');
          S.tick(); buzz(20); ring.classList.remove('snap'); void ring.offsetWidth; ring.classList.add('snap');
          if (snapped >= links) return finish(true);
        } else {
          squeeze = clamp(squeeze + slipPenalty, 0, 1); S.bad(); buzz(50);
          ptr.classList.remove('slip'); void ptr.offsetWidth; ptr.classList.add('slip');
        }
      };
      field.addEventListener('pointerdown', onTap);

      const stop = loop(dt => {
        if (done) return false;
        ang = norm(ang + spin * dt);
        ptr.style.transform = `rotate(${ang}rad)`;
        squeeze = clamp(squeeze + squeezeRate * dt, 0, 1);
        sqEl.style.width = squeeze * 100 + '%';
        ring.style.setProperty('--sq', (1 - squeeze * 0.16).toFixed(3));
        ring.classList.toggle('danger', squeeze > 0.7);
        if (squeeze >= 1) return finish(false);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', onTap); window.removeEventListener('resize', measure);
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 80);
        resolve({ win, stars: win ? (squeeze < 0.45 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
