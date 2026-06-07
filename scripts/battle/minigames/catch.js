/* Star Catch — drag your creature along the bottom to catch falling stars.
   Hit your quota before time runs out, but dodge the falling bombs! */
import { el, clamp, loop, rand, sfx, buzz, sparkle, floatText, petImg, S } from '../util.js';

export default {
  id: 'catch', name: 'Star Catch', icon: '🧺',
  howto: 'Drag left & right to CATCH the falling stars ⭐. Avoid the bombs 💣!',

  play(area, ctx) {
    return new Promise(resolve => {
      const goal = 8 + ctx.difficulty;          // stars needed
      const TIME = 16;
      let caught = 0, hearts = 3, left = TIME, done = false;

      area.innerHTML = `
        <div class="ct-hud"><span>⭐ <b id="sc">0</b>/${goal}</span>
          <span id="hearts">${'❤'.repeat(hearts)}</span>
          <div class="ct-time"><div class="ct-fill" id="tf"></div></div></div>
        <div class="ct-field" id="field">
          <img class="ct-hero" id="me" src="${petImg(ctx.hero)}" draggable="false"></div>
        <div class="dg-hint">Drag to catch!</div>`;
      const field = area.querySelector('#field'), me = area.querySelector('#me');
      const scEl = area.querySelector('#sc'), heartsEl = area.querySelector('#hearts'), tf = area.querySelector('#tf');

      let W = 0, H = 0, size = 60;
      const measure = () => { const r = field.getBoundingClientRect(); W = r.width; H = r.height; size = clamp(W * 0.17, 44, 78); me.style.width = size + 'px'; };
      measure(); window.addEventListener('resize', measure);
      let mx = W / 2;
      const placeMe = () => { me.style.left = clamp(mx - size / 2, 0, W - size) + 'px'; };
      placeMe();

      const moveTo = cx => { const r = field.getBoundingClientRect(); mx = clamp(cx - r.left, size / 2, W - size / 2); placeMe(); };
      let drag = false;
      const down = e => { drag = true; moveTo(e.clientX); e.preventDefault(); };
      const move = e => { if (drag) { moveTo(e.clientX); e.preventDefault(); } };
      const up = () => { drag = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      const items = [];
      const fall = 150 + ctx.difficulty * 24;
      const bombChance = clamp((ctx.difficulty - 2) * 0.05, 0, 0.35);
      let acc = 0, every = clamp(0.8 - ctx.difficulty * 0.04, 0.4, 0.8);

      function spawn() {
        const bomb = Math.random() < bombChance;
        const n = el('div', 'ct-item' + (bomb ? ' bomb' : ''), bomb ? '💣' : '⭐');
        const x = rand(10, Math.max(12, W - 40));
        n.style.left = x + 'px'; n.style.top = '-30px';
        field.appendChild(n);
        items.push({ n, x, y: -30, bomb });
      }

      const stop = loop((dt) => {
        if (done) return false;
        left -= dt; tf.style.width = clamp((left / TIME) * 100, 0, 100) + '%';
        acc += dt; if (acc >= every) { acc = 0; spawn(); }
        const catchY = H - size, hx = mx;
        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i]; it.y += fall * dt; it.n.style.top = it.y + 'px';
          const within = it.y > catchY - 14 && it.y < H && Math.abs(it.x + 14 - hx) < size * 0.6;
          if (within) {
            it.n.remove(); items.splice(i, 1);
            if (it.bomb) { hearts--; heartsEl.textContent = '❤'.repeat(Math.max(0, hearts)); me.classList.remove('hurt'); void me.offsetWidth; me.classList.add('hurt'); S.hit(); buzz(60); floatText(area, hx, catchY, '−1', 'bad'); if (hearts <= 0) return end(false); }
            else { caught++; scEl.textContent = caught; S.catch(); buzz(12); sparkle(field, it.x + 14, catchY, 5); if (caught >= goal) return end(true); }
          } else if (it.y > H + 30) { it.n.remove(); items.splice(i, 1); }
        }
        if (left <= 0) return end(caught >= goal);
      });

      function end(win) {
        if (done) return false; done = true;
        stop(); field.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        window.removeEventListener('resize', measure); items.forEach(it => it.n.remove());
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (hearts >= 3 && left > 1 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
