/* Dive Dodge — the foe dive-bombs from above. Red zones flash where it's about
   to slam — DRAG out of them before impact! Survive the barrage to win. */
import { el, clamp, loop, rand, sfx, buzz, floatText, petImg, S } from '../util.js';

export default {
  id: 'divedodge', name: 'Dive Dodge', icon: '☄️',
  howto: 'DRAG out of the red zones before the foe slams down on them!',

  play(area, ctx) {
    return new Promise(resolve => {
      const TIME = 15;
      let hearts = 3, left = TIME, done = false;

      area.innerHTML = `
        <div class="dg-hud"><span id="hearts">${'❤'.repeat(hearts)}</span>
          <div class="dg-time"><div class="dg-fill" id="tf"></div></div></div>
        <div class="dv-field" id="field">
          <div class="dv-hero" id="me"><img src="${petImg(ctx.hero)}"></div>
        </div>
        <div class="dg-hint">Drag out of the red zones!</div>`;
      const field = area.querySelector('#field'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), tf = area.querySelector('#tf');

      let W = 0, H = 0, size = 52;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; size = clamp(Math.min(W, H) * 0.15, 42, 70); me.style.width = me.style.height = size + 'px'; };
      measure(); window.addEventListener('resize', measure);
      let px = W / 2 - size / 2, py = H / 2 - size / 2;
      const place = () => { me.style.transform = `translate(${px}px,${py}px)`; };
      place();
      const moveTo = (cx, cy) => { const r = field.getBoundingClientRect(); px = clamp(cx - r.left - size / 2, 0, W - size); py = clamp(cy - r.top - size / 2, 0, H - size); place(); };
      let drag = false;
      const down = e => { drag = true; moveTo(e.clientX, e.clientY); e.preventDefault(); };
      const move = e => { if (drag) { moveTo(e.clientX, e.clientY); e.preventDefault(); } };
      const up = () => { drag = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);

      const zones = [];
      const tele = clamp(1.2 - ctx.difficulty * 0.05, 0.5, 1.2);
      let acc = 0, every = clamp(1.3 - ctx.difficulty * 0.07, 0.42, 1.3), iframe = 0;
      function spawnWave() {
        const k = 1 + Math.floor(Math.min(ctx.difficulty, 12) / 4) + (Math.random() < 0.4 ? 1 : 0);
        for (let i = 0; i < k; i++) {
          const r = clamp(Math.min(W, H) * (0.16 + ctx.difficulty * 0.006), 50, 130);
          const x = rand(r, W - r), y = rand(r, H - r);
          const n = el('div', 'dv-zone'); n.style.left = x + 'px'; n.style.top = y + 'px'; n.style.width = n.style.height = r * 2 + 'px';
          field.appendChild(n);
          zones.push({ node: n, x, y, r, slamAt: tele, slammed: false });
        }
      }

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; iframe = Math.max(0, iframe - dt);
        tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        acc += dt; if (acc >= every) { acc = 0; spawnWave(); }
        const hx = px + size / 2, hy = py + size / 2, hr = size * 0.4;
        for (let i = zones.length - 1; i >= 0; i--) {
          const z = zones[i]; z.slamAt -= dt;
          if (z.slamAt <= tele * 0.35) z.node.classList.add('arm');
          if (!z.slammed && z.slamAt <= 0) {
            z.slammed = true; z.node.classList.add('slam'); S.hit(); buzz(20);
            if (iframe <= 0 && Math.hypot(z.x - hx, z.y - hy) < z.r + hr * 0.5) {
              iframe = 0.8; hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts));
              me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt');
              floatText(area, hx, hy, '−1', 'bad'); buzz(70);
              if (hearts <= 0) return end(false);
            }
            const nn = z.node; setTimeout(() => nn.remove(), 260); zones.splice(i, 1);
          }
        }
        if (left <= 0) return end(true);
      });

      function end(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        window.removeEventListener('resize', measure);
        zones.forEach(z => z.node.remove());
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
