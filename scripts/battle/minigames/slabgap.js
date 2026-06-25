/* Slab Squeeze — Clubbo's fight, a Booksquirm-style gap-threading game.
   Clubbo smashes giant stone slabs that drop from above; each has a single
   GAP. DRAG left/right so you're lined up with the gap when the slab reaches
   you. Thread enough slabs to win; they fall faster and the gaps shrink. */
import { el, loop, clamp, rand, sfx, buzz, floatText, petImg, S } from '../util.js';

export default {
  id: 'slabgap', name: 'Slab Squeeze', icon: '🪨',
  howto: 'DRAG left & right to line up with the GAP in each falling slab. Thread them all — don’t get squished!',

  play(area, ctx) {
    return new Promise(resolve => {
      const d = ctx.difficulty;
      const boss = ctx.foe || {};
      const accent = boss.color || '#5fd47a';
      const goal = 9 + Math.round(d * 0.7);
      const thick = 26;
      let hearts = 3, passed = 0, done = false, iframe = 0, acc = 0;

      area.innerHTML = `
        <div class="sb-hud" style="--accent:${accent}">
          <span id="hearts">${'❤'.repeat(hearts)}</span>
          <span>Cleared <b id="cnt">0</b>/${goal}</span>
        </div>
        <div class="sb-field" id="field">
          <div class="sb-boss"><img src="${petImg(boss)}" draggable="false"></div>
          <div class="sb-hero" id="me"><img src="${petImg(ctx.hero)}" draggable="false"></div>
        </div>
        <div class="dg-hint">Slide into the gap before the slab drops on you!</div>`;
      const field = area.querySelector('#field'), me = area.querySelector('#me');
      const heartsEl = area.querySelector('#hearts'), cntEl = area.querySelector('#cnt');

      let W = 0, H = 0, size = 54, heroY = 0;
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        size = clamp(Math.min(W, H) * 0.15, 42, 68); me.style.width = me.style.height = size + 'px';
        heroY = H - size * 1.5; me.style.top = heroY + 'px'; place();
      };
      let px = 0;
      const place = () => { me.style.left = clamp(px, 0, W - size) + 'px'; };
      measure(); window.addEventListener('resize', measure);
      px = W / 2 - size / 2; place();

      const moveTo = cx => { const r = field.getBoundingClientRect(); px = clamp(cx - r.left - size / 2, 0, W - size); place(); };
      let drag = false;
      const down = e => { drag = true; moveTo(e.clientX); e.preventDefault(); };
      const move = e => { if (drag) { moveTo(e.clientX); e.preventDefault(); } };
      const up = () => { drag = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);

      const slabs = [];
      const fall = () => 95 + d * 15 + passed * 5;
      const every = () => clamp(1.7 - d * 0.06 - passed * 0.02, 0.72, 1.7);
      const holeW = () => clamp(W * (0.36 - d * 0.013) - passed * 4, W * 0.16, W * 0.42);

      function spawn() {
        const hw = holeW();
        const hx = rand(8, Math.max(8, W - hw - 8));
        const n = el('div', 'sb-slab');
        n.style.height = thick + 'px'; n.style.top = -thick + 'px';
        n.style.setProperty('--g0', hx + 'px'); n.style.setProperty('--g1', (hx + hw) + 'px');
        field.appendChild(n);
        slabs.push({ node: n, y: -thick, hx, hw, hit: false });
      }

      const stop = loop(dt => {
        if (done) return false;
        iframe = Math.max(0, iframe - dt);
        acc += dt; if (acc >= every()) { acc = 0; spawn(); }
        const spd = fall();
        for (let i = slabs.length - 1; i >= 0; i--) {
          const s = slabs[i]; if (!s || done) break;
          s.y += spd * dt; s.node.style.top = s.y + 'px';
          if (!s.hit && s.y + thick >= heroY && s.y <= heroY + size) {
            const cx = px + size / 2;
            const inGap = cx > s.hx + size * 0.3 && cx < s.hx + s.hw - size * 0.3;
            if (inGap) {
              s.hit = true; passed++; cntEl.textContent = passed; S.good(); buzz(10);
              s.node.classList.add('cleared');
              if (passed >= goal) return end(true);
            } else if (iframe <= 0) {
              s.hit = true; iframe = 0.9; hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts));
              me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt');
              s.node.classList.add('smash'); S.hit(); buzz(70); floatText(area, cx, heroY, '−1', 'bad');
              if (hearts <= 0) return end(false);
            }
          }
          if (s.y > H + thick) { s.node.remove(); slabs.splice(i, 1); }
        }
      });

      function end(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
        window.removeEventListener('resize', measure); slabs.forEach(s => s.node.remove());
        if (!win) sfx(boss.sfx, 0.7);
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
