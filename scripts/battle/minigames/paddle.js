/* Fin Smash — a brick-breaker. Slide your fin-paddle to keep the ball alive
   and shatter all of the foe's fins. Drop the ball three times and you lose. */
import { el, clamp, loop, rand, sfx, buzz, sparkle, petImg, S } from '../util.js';

export default {
  id: 'paddle', name: 'Fin Smash', icon: '🏓',
  howto: 'Drag the paddle to bounce the ball and smash every brick. Don’t drop it!',

  play(area, ctx) {
    return new Promise(resolve => {
      let balls = 3, done = false;
      area.innerHTML = `
        <div class="pd-hud"><span id="balls">${'●'.repeat(balls)}</span><span>Bricks <b id="bk">0</b></span></div>
        <div class="pd-field" id="field">
          <div class="pd-ball" id="ball"></div>
          <div class="pd-paddle" id="paddle"></div>
        </div>
        <div class="dg-hint">Drag to move the paddle!</div>`;
      const field = area.querySelector('#field'), ballEl = area.querySelector('#ball'), paddle = area.querySelector('#paddle');
      const ballsEl = area.querySelector('#balls'), bkEl = area.querySelector('#bk');

      let W = 0, H = 0, pw = 90, ph = 14, br = 9;
      const bricks = [];
      const cols = 5, rows = clamp(2 + Math.floor(ctx.difficulty / 4), 2, 5);
      let px = 0, ball = { x: 0, y: 0, vx: 0, vy: 0 }, spd = 0, launched = false;
      let held = 0, pendingA = 0;          // brief pause before a (re)served ball flies off

      const buildBricks = () => {
        bricks.forEach(b => b.node.remove()); bricks.length = 0;
        const m = 8, bw = (W - m * (cols + 1)) / cols, bh = clamp(H * 0.05, 16, 26);
        const colors = ['#ff5a86', '#ffd23f', '#5cc6ff', '#5fe39a'];
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const n = el('div', 'pd-brick'); const x = m + c * (bw + m), y = 50 + r * (bh + m);
          n.style.cssText = `left:${x}px;top:${y}px;width:${bw}px;height:${bh}px;background:${colors[r % colors.length]}`;
          field.appendChild(n); bricks.push({ node: n, x, y, w: bw, h: bh });
        }
        bkEl.textContent = bricks.length;
      };
      const resetBall = () => { ball.x = px + pw / 2; ball.y = H - 60; ball.vx = 0; ball.vy = 0; pendingA = rand(-0.6, 0.6) - Math.PI / 2; held = 0.5; launched = true; };
      const measure = () => {
        const r = field.getBoundingClientRect(); W = r.width; H = r.height;
        pw = clamp(W * 0.24, 70, 140); ph = 14; br = clamp(Math.min(W, H) * 0.028, 8, 13);
        spd = clamp(H * (0.95 + ctx.difficulty * 0.05), 480, 1200);
        paddle.style.width = pw + 'px'; paddle.style.height = ph + 'px';
        ballEl.style.width = ballEl.style.height = br * 2 + 'px';
        px = clamp(px || W / 2 - pw / 2, 0, W - pw);
        buildBricks();
      };
      measure(); window.addEventListener('resize', measure);
      resetBall();

      const placePaddle = () => { paddle.style.left = px + 'px'; paddle.style.top = (H - 22) + 'px'; };
      placePaddle();
      const moveTo = cx => { const r = field.getBoundingClientRect(); px = clamp(cx - r.left - pw / 2, 0, W - pw); placePaddle(); };
      let drag = false;
      const down = e => { drag = true; moveTo(e.clientX); e.preventDefault(); };
      const move = e => { if (drag) { moveTo(e.clientX); e.preventDefault(); } };
      const up = () => { drag = false; };
      field.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);

      const stop = loop((dt) => {
        if (done) return false;
        if (held > 0) {                    // ball waits on the paddle, then launches
          held -= dt;
          ball.x = px + pw / 2; ball.y = H - 60;
          ballEl.style.left = (ball.x - br) + 'px'; ballEl.style.top = (ball.y - br) + 'px';
          if (held <= 0) { ball.vx = Math.cos(pendingA) * spd; ball.vy = Math.sin(pendingA) * spd; }
          return;
        }
        ball.x += ball.vx * dt; ball.y += ball.vy * dt;
        if (ball.x < br) { ball.x = br; ball.vx = Math.abs(ball.vx); }
        if (ball.x > W - br) { ball.x = W - br; ball.vx = -Math.abs(ball.vx); }
        if (ball.y < br) { ball.y = br; ball.vy = Math.abs(ball.vy); }
        // paddle
        const py = H - 22;
        if (ball.vy > 0 && ball.y + br > py && ball.y < py + ph && ball.x > px - br && ball.x < px + pw + br) {
          const hitp = clamp((ball.x - (px + pw / 2)) / (pw / 2), -1, 1);  // -1..1
          const ang = hitp * 1.05;                       // launch angle off vertical (max ~60°)
          ball.vx = Math.sin(ang) * spd; ball.vy = -Math.abs(Math.cos(ang) * spd);
          ball.y = py - br - 1;
          S.ui(); buzz(8);
        }
        // bricks
        for (let i = bricks.length - 1; i >= 0; i--) {
          const b = bricks[i];
          if (ball.x > b.x - br && ball.x < b.x + b.w + br && ball.y > b.y - br && ball.y < b.y + b.h + br) {
            b.node.classList.add('pop'); const nn = b.node; setTimeout(() => nn.remove(), 150); bricks.splice(i, 1);
            sparkle(field, ball.x, ball.y, 5); S.good(); buzz(12); bkEl.textContent = bricks.length;
            // bounce vertically (simple)
            ball.vy = -ball.vy;
            if (bricks.length === 0) return finish(true);
            break;
          }
        }
        ballEl.style.left = (ball.x - br) + 'px'; ballEl.style.top = (ball.y - br) + 'px';
        if (ball.y > H + br * 2) {
          balls--; ballsEl.textContent = '●'.repeat(Math.max(0, balls)); S.bad(); buzz(60);
          if (balls <= 0) return finish(false);
          resetBall();
        }
      });

      function finish(win) {
        if (done) return false; done = true; stop();
        field.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up); window.removeEventListener('resize', measure);
        (win ? S.win : S.lose)(); if (!win) sfx(ctx.foe.sfx, 0.7);
        resolve({ win, stars: win ? (balls >= 3 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
