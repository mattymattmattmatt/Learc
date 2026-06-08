/* Break the Trance — the gaze freezes you in a sigil. DRAG your finger through
   the glowing dots in order to trace each rune. Complete them all before the
   timer runs out to snap free. */
import { el, clamp, loop, sfx, buzz, sparkle, S } from '../util.js';

const SHAPES = [
  [[.12, .8], [.32, .2], [.5, .7], [.68, .2], [.88, .8]],        // M / crown
  [[.15, .5], [.35, .18], [.55, .5], [.75, .82], [.9, .5]],      // wave
  [[.2, .8], [.5, .18], [.8, .8], [.2, .8]],                     // triangle
  [[.5, .12], [.85, .5], [.5, .88], [.15, .5], [.5, .12]],       // diamond
  [[.15, .25], [.85, .25], [.3, .8], [.5, .2], [.7, .8], [.15, .25]] // star-ish zigzag
];

export default {
  id: 'trace', name: 'Break the Trance', icon: '🌀',
  howto: 'DRAG through the glowing dots in order to trace each rune before time runs out!',

  play(area, ctx) {
    return new Promise(resolve => {
      const need = 2 + Math.floor(ctx.difficulty / 4);     // sigils to complete
      const TIME = clamp(16 - ctx.difficulty * 0.4, 9, 16);
      let doneCount = 0, left = TIME, done = false;

      area.innerHTML = `
        <div class="tr-hud"><span>🌀 <b id="sc">0</b>/${need}</span>
          <div class="tr-time"><div class="tr-fill" id="tf"></div></div></div>
        <div class="tr-field" id="field"><svg class="tr-svg" id="svg"></svg></div>
        <div class="dg-hint">Trace through the dots in order!</div>`;
      const field = area.querySelector('#field'), svg = area.querySelector('#svg'), scEl = area.querySelector('#sc'), tf = area.querySelector('#tf');

      let W = 0, H = 0, pts = [], cur = 0, dots = [];
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; };
      measure(); window.addEventListener('resize', measure);

      function loadSigil() {
        svg.innerHTML = ''; dots.forEach(d => d.remove()); dots = []; cur = 0;
        const shape = SHAPES[(Math.random() * SHAPES.length) | 0];
        const pad = Math.min(W, H) * 0.16;
        pts = shape.map(([nx, ny]) => ({ x: pad + nx * (W - 2 * pad), y: pad + ny * (H - 2 * pad) }));
        // faint full path
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        poly.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
        poly.setAttribute('class', 'tr-path'); svg.appendChild(poly);
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        glow.setAttribute('class', 'tr-glow'); glow.id = 'glow'; svg.appendChild(glow);
        pts.forEach((p, i) => { const d = el('div', 'tr-dot'); d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; field.appendChild(d); dots.push(d); });
        dots[0].classList.add('next');
      }
      const updateGlow = () => { const g = svg.querySelector('#glow'); g.setAttribute('points', pts.slice(0, cur + 1).map(p => `${p.x},${p.y}`).join(' ')); };
      requestAnimationFrame(loadSigil);

      const radius = () => clamp(Math.min(W, H) * 0.09, 30, 60);
      const test = e => {
        if (done || !pts.length) return; const r = field.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        if (Math.hypot(x - pts[cur].x, y - pts[cur].y) < radius()) {
          dots[cur].classList.remove('next'); dots[cur].classList.add('hit'); sparkle(field, pts[cur].x, pts[cur].y, 4); S.tick(); buzz(8);
          cur++; updateGlow();
          if (cur >= pts.length) {
            doneCount++; scEl.textContent = doneCount; S.good(); buzz(20);
            if (doneCount >= need) return finish(true);
            loadSigil();
          } else dots[cur].classList.add('next');
        }
      };
      const down = e => { test(e); e.preventDefault(); };
      const move = e => { test(e); e.preventDefault(); };
      field.addEventListener('pointerdown', down);
      field.addEventListener('pointermove', move);

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        if (left <= 0) return finish(false);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); field.removeEventListener('pointermove', move);
        window.removeEventListener('resize', measure);
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (left > TIME * 0.4 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
