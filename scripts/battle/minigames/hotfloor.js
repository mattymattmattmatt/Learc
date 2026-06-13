/* Hot Floor — the tiles heat up! Tiles flash a warning, then erupt in flame.
   TAP a safe tile to hop to it before the one you're on ignites. Survive! */
import { el, clamp, loop, rand, sfx, buzz, floatText, petImg, S } from '../util.js';

export default {
  id: 'hotfloor', name: 'Hot Floor', icon: '🔥',
  howto: 'TAP a cool tile to hop. Don’t be standing on a tile when it bursts into flame!',

  play(area, ctx) {
    return new Promise(resolve => {
      const TIME = 16;
      const COLS = 4, ROWS = 4;
      let hearts = 3, left = TIME, done = false;
      let cr = ROWS - 1, cc = 0;                 // creature tile

      area.innerHTML = `
        <div class="dg-hud"><span id="hearts">${'❤'.repeat(hearts)}</span>
          <div class="dg-time"><div class="dg-fill" id="tf"></div></div></div>
        <div class="hf-grid" id="grid"></div>
        <div class="dg-hint">Tap a cool tile to hop!</div>`;
      const grid = area.querySelector('#grid'), heartsEl = area.querySelector('#hearts'), tf = area.querySelector('#tf');

      const tiles = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const n = el('button', 'hf-tile'); n.dataset.r = r; n.dataset.c = c;
        grid.appendChild(n); tiles.push({ r, c, node: n, state: 'cool', t: 0 });
      }
      const me = el('div', 'hf-me'); me.innerHTML = `<img src="${petImg(ctx.hero)}">`; grid.appendChild(me);
      const tileAt = (r, c) => tiles[r * COLS + c];
      const placeMe = () => { const t = tileAt(cr, cc).node; me.style.left = t.offsetLeft + t.offsetWidth / 2 + 'px'; me.style.top = t.offsetTop + t.offsetHeight / 2 + 'px'; };
      requestAnimationFrame(placeMe);

      grid.addEventListener('pointerdown', e => {
        const b = e.target.closest('.hf-tile'); if (!b || done) return;
        const r = +b.dataset.r, c = +b.dataset.c;
        if (Math.abs(r - cr) + Math.abs(c - cc) > 2) return;   // only hop a short distance
        const t = tileAt(r, c);
        if (t.state === 'lava') { return; }
        cr = r; cc = c; placeMe(); S.ui(); buzz(8);
      });

      let acc = 0, every = clamp(1.05 - ctx.difficulty * 0.055, 0.4, 1.05), iframe = 0;
      const tele = clamp(0.95 - ctx.difficulty * 0.05, 0.4, 0.95);
      function warnWave() {
        const k = Math.min(9, 3 + Math.floor(ctx.difficulty / 2));   // more tiles erupt, always ≥7 safe
        const pool = tiles.filter(t => t.state === 'cool');
        for (let i = 0; i < k && pool.length; i++) {
          const idx = (Math.random() * pool.length) | 0; const t = pool.splice(idx, 1)[0];
          t.state = 'warn'; t.t = tele; t.node.classList.add('warn');
        }
      }

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; iframe = Math.max(0, iframe - dt);
        tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        acc += dt; if (acc >= every) { acc = 0; warnWave(); }
        for (const t of tiles) {
          if (t.state === 'warn') { t.t -= dt; if (t.t <= 0) { t.state = 'lava'; t.t = 0.9; t.node.classList.remove('warn'); t.node.classList.add('lava'); t.node.textContent = '🔥'; S.hit();
            if (iframe <= 0 && t.r === cr && t.c === cc) { iframe = 0.6; hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts)); me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt'); floatText(area, me.offsetLeft, me.offsetTop, '−1', 'bad'); buzz(70); if (hearts <= 0) return end(false); } } }
          else if (t.state === 'lava') { t.t -= dt; if (t.t <= 0) { t.state = 'cool'; t.node.classList.remove('lava'); t.node.textContent = ''; } }
        }
        if (left <= 0) return end(true);
      });

      function end(win) {
        if (done) return false; done = true; stop();
        if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (hearts >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
