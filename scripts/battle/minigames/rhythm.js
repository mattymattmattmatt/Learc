/* Rhythm Duel — gems drop on a steady beat. TAP when one reaches the
   glowing ring. Nail the timing for PERFECTs, build a combo, and the
   hits play a little tune. Out-perform the foe to win. */
import { el, clamp, loop, sfx, buzz, floatText, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

const MELODY = [523.25, 587.33, 659.25, 783.99, 659.25, 587.33, 783.99, 880.0]; // C D E G E D G A
const COLORS = ['#ff5a86', '#ffd23f', '#5cc6ff', '#5fe39a', '#c08bff'];

export default {
  id: 'rhythm', name: 'Rhythm Duel', icon: '🎵',
  howto: 'TAP the moment a gem lands on the ring. Perfect timing builds a combo!',

  play(area, ctx) {
    return new Promise(resolve => {
      const total = 12 + ctx.difficulty;
      const gap = clamp(0.82 - ctx.difficulty * 0.035, 0.45, 0.82);  // beat interval
      const fall = clamp(1.7 - ctx.difficulty * 0.05, 1.05, 1.7);
      const need = 0.6;

      area.innerHTML = `
        ${stageHTML(ctx, 'rh')}
        <div class="rh-hud"><span>🎯 <b id="acc">0</b>/${total}</span><span id="combo" class="rh-combo"></span></div>
        <div class="rh-lane" id="lane">
          <div class="rh-ring" id="ring"></div>
          <div class="rh-line" id="line"></div>
        </div>
        <button class="tap-pad" id="pad">TAP TO THE BEAT</button>`;
      const lane = area.querySelector('#lane'), pad = area.querySelector('#pad'), ring = area.querySelector('#ring');
      const accEl = area.querySelector('#acc'), comboEl = area.querySelector('#combo');
      const heroEl = area.querySelector('.hero'), foeEl = area.querySelector('.foe');

      let H = 0, W = 0;
      const measure = () => { const r = lane.getBoundingClientRect(); H = r.height; W = r.width; };
      measure(); window.addEventListener('resize', measure);
      const HIT_Y = () => H * 0.8;
      const GOOD = () => clamp(H * 0.11, 24, 64);
      const PERFECT = () => clamp(H * 0.05, 12, 30);

      const notes = [];
      let spawned = 0, hits = 0, judged = 0, combo = 0, maxCombo = 0;
      let t0 = performance.now(), done = false, nextSpawn = 0.5, beatAcc = 0;

      const stop = loop((dt, now) => {
        if (done) return false;
        const elapsed = (now - t0) / 1000;
        // beat pulse on the ring
        beatAcc += dt;
        if (beatAcc >= gap) { beatAcc -= gap; ring.classList.remove('beat'); void ring.offsetWidth; ring.classList.add('beat'); }
        if (spawned < total && elapsed >= nextSpawn) {
          spawned++; nextSpawn += gap;
          const n = el('div', 'rh-gem');
          n.style.background = COLORS[spawned % COLORS.length];
          n.style.left = '50%';
          n.style.transform = 'translate(-50%,-26px)';
          lane.appendChild(n);
          notes.push({ node: n, born: now, judged: false, y: -26 });
        }
        for (let i = notes.length - 1; i >= 0; i--) {
          const note = notes[i];
          const p = (now - note.born) / (fall * 1000);
          const y = -26 + p * (HIT_Y() + 26);
          note.node.style.transform = `translate(-50%,${y}px)`;
          note.y = y;
          if (!note.judged && y > HIT_Y() + GOOD()) {
            note.judged = true; judged++; combo = 0; updateCombo();
            note.node.classList.add('miss'); hitFlash(heroEl); S.bad();
            cleanup(note, i);
          }
        }
        if (judged >= total) return end();
      });

      function updateCombo() { comboEl.textContent = combo >= 2 ? `🔥 ${combo} combo` : ''; }
      function cleanup(note, i) { setTimeout(() => note.node.remove(), 200); if (i != null) notes.splice(i, 1); }

      const onTap = e => {
        e.preventDefault(); if (done) return;
        pad.classList.remove('mash'); void pad.offsetWidth; pad.classList.add('mash');
        let best = null, bestD = 1e9, bi = -1;
        notes.forEach((n, i) => { if (n.judged) return; const d = Math.abs(n.y - HIT_Y()); if (d < bestD) { bestD = d; best = n; bi = i; } });
        if (best && bestD <= GOOD()) {
          best.judged = true; judged++; hits++; combo++; maxCombo = Math.max(maxCombo, combo);
          const perfect = bestD <= PERFECT();
          best.node.classList.add('hit'); hitFlash(foeEl); buzz(perfect ? 18 : 10);
          S.note(MELODY[(hits - 1) % MELODY.length] * (perfect ? 1 : 1));
          const a = area.getBoundingClientRect(), l = lane.getBoundingClientRect();
          floatText(area, l.left + W / 2 - a.left, l.top + HIT_Y() - a.top - 14, perfect ? 'PERFECT!' : 'good', perfect ? 'good' : '');
          accEl.textContent = hits; updateCombo();
          cleanup(best, bi);
        }
      };
      pad.addEventListener('pointerdown', onTap);

      function end() {
        if (done) return false; done = true;
        stop(); pad.removeEventListener('pointerdown', onTap);
        window.removeEventListener('resize', measure);
        notes.forEach(n => n.node.remove());
        const acc = hits / total, win = acc >= need;
        (win ? S.win : S.lose)(); sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7); buzz(win ? 30 : 60);
        resolve({ win, stars: win ? (acc >= 0.9 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
