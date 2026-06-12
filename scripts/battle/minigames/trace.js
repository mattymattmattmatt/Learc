/* Break the Trance — the gaze locks you in shifting sigils. DRAG your finger
   through the glowing dots in order to trace each rune. Every rune is a
   different shape — complete them all before the timer runs out to snap free. */
import { el, clamp, loop, shuffle, sfx, buzz, sparkle, S } from '../util.js';

const SHAPES = [
  [[.5, .06], [.69, .66], [.16, .28], [.84, .28], [.31, .66], [.5, .06]],   // 5-point star
  [[.2, .2], [.8, .2], [.8, .8], [.2, .8], [.2, .2]],                       // square
  [[.15, .2], [.85, .2], [.15, .8], [.85, .8]],                            // Z
  [[.12, .8], [.32, .2], [.5, .7], [.68, .2], [.88, .8]],                  // crown / M
  [[.2, .85], [.2, .42], [.5, .15], [.8, .42], [.8, .85], [.2, .85]],      // house
  [[.5, .12], [.85, .5], [.5, .88], [.15, .5], [.5, .12]],                 // diamond
  [[.6, .1], [.36, .52], [.56, .52], [.34, .9]],                          // lightning bolt
  [[.15, .5], [.35, .16], [.55, .5], [.75, .84], [.9, .5]],               // wave
  [[.2, .8], [.5, .16], [.8, .8], [.3, .4], [.7, .4], [.2, .8]]            // tangled triangle
];

export default {
  id: 'trace', name: 'Break the Trance', icon: '🌀',
  howto: 'DRAG through the glowing dots in order. Each rune is different — trace them all in time!',

  play(area, ctx) {
    return new Promise(resolve => {
      const need = Math.min(6, 3 + Math.floor(ctx.difficulty / 3));   // sigils to complete (3..6)
      const TIME = clamp(21 - ctx.difficulty * 0.4, 14.5, 21);        // ~2.4s per sigil at worst
      let doneCount = 0, left = TIME, done = false, isDown = false;
      let queue = shuffle(SHAPES.map((_, i) => i)), lastShape = -1;

      area.innerHTML = `
        <div class="tr-hud"><span>🌀 <b id="sc">0</b>/${need}</span>
          <div class="tr-time"><div class="tr-fill" id="tf"></div></div></div>
        <div class="tr-field" id="field"><svg class="tr-svg" id="svg"></svg></div>
        <div class="dg-hint">Hold & drag through the dots in order!</div>`;
      const field = area.querySelector('#field'), svg = area.querySelector('#svg'), scEl = area.querySelector('#sc'), tf = area.querySelector('#tf');

      let W = 0, H = 0, pts = [], cur = 0, dots = [];
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; };
      measure(); window.addEventListener('resize', measure);

      function nextShape() {
        if (!queue.length) { queue = shuffle(SHAPES.map((_, i) => i)); if (queue[0] === lastShape) queue.push(queue.shift()); }
        const idx = queue.shift(); lastShape = idx; return SHAPES[idx];
      }
      function loadSigil() {
        svg.innerHTML = ''; dots.forEach(d => d.remove()); dots = []; cur = 0;
        const shape = nextShape();
        const pad = Math.min(W, H) * 0.15;
        pts = shape.map(([nx, ny]) => ({ x: pad + nx * (W - 2 * pad), y: pad + ny * (H - 2 * pad) }));
        const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        poly.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
        poly.setAttribute('class', 'tr-path'); svg.appendChild(poly);
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        glow.setAttribute('class', 'tr-glow'); glow.id = 'glow'; svg.appendChild(glow);
        pts.forEach((p, i) => { const d = el('div', 'tr-dot' + (i === 0 ? ' next' : '')); d.style.left = p.x + 'px'; d.style.top = p.y + 'px'; field.appendChild(d); dots.push(d); });
      }
      const updateGlow = () => { const g = svg.querySelector('#glow'); g.setAttribute('points', pts.slice(0, cur + 1).map(p => `${p.x},${p.y}`).join(' ')); };
      requestAnimationFrame(loadSigil);

      const radius = () => clamp(Math.min(W, H) * 0.072, 24, 46);
      const test = e => {
        if (done || !pts.length) return; const r = field.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        if (Math.hypot(x - pts[cur].x, y - pts[cur].y) < radius()) {
          dots[cur].classList.remove('next'); dots[cur].classList.add('hit');
          sparkle(field, pts[cur].x, pts[cur].y, 4); S.tick(); buzz(8);
          cur++; updateGlow();
          if (cur >= pts.length) {
            doneCount++; scEl.textContent = doneCount; S.good(); buzz(20);
            if (doneCount >= need) return finish(true);
            loadSigil();
          } else { dots[cur].classList.add('next'); }
        }
      };
      const down = e => { isDown = true; test(e); e.preventDefault(); };
      const move = e => { if (isDown) test(e); e.preventDefault(); };
      const up = () => { isDown = false; };
      field.addEventListener('pointerdown', down);
      field.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        if (left <= 0) return finish(false);
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); field.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        window.removeEventListener('resize', measure);
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (left > TIME * 0.4 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
