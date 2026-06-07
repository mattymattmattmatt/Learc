/* Rhythm Duel — notes fall toward the line. TAP when a note hits the
   glowing line. Land enough clean hits to out-perform the foe. */
import { el, clamp, loop, sfx, buzz, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'rhythm', name: 'Rhythm Duel', icon: '🎵',
  howto: 'TAP the pad the moment a note reaches the line. Keep the beat!',

  play(area, ctx) {
    return new Promise(resolve => {
      const total = 12 + ctx.difficulty;          // notes
      const gap = clamp(0.85 - ctx.difficulty * 0.04, 0.42, 0.85);   // seconds between notes
      const fall = clamp(1.7 - ctx.difficulty * 0.06, 1.0, 1.7);     // seconds to reach line
      const need = 0.6;                            // accuracy to win

      area.innerHTML = `
        ${stageHTML(ctx, 'rh')}
        <div class="rh-acc" id="acc">Hits 0 / ${total}</div>
        <div class="rh-lane" id="lane"><div class="rh-line" id="line"></div></div>
        <button class="tap-pad" id="pad">TAP TO THE BEAT</button>`;
      const lane = area.querySelector('#lane'), pad = area.querySelector('#pad');
      const accEl = area.querySelector('#acc'), heroEl = area.querySelector('.hero'), foeEl = area.querySelector('.foe');

      let H = 0; const measure = () => { H = lane.getBoundingClientRect().height; };
      measure(); window.addEventListener('resize', measure);
      const HIT_Y = () => H * 0.82;
      const WIN_PX = () => clamp(H * 0.10, 26, 60);

      const notes = [];
      let spawned = 0, hits = 0, judged = 0, t0 = performance.now(), done = false;
      let nextSpawn = 0.4;

      const stop = loop((dt, now) => {
        if (done) return false;
        const elapsed = (now - t0) / 1000;
        if (spawned < total && elapsed >= nextSpawn) {
          spawned++; nextSpawn += gap;
          const n = el('div', 'rh-note', '🎵');
          n.style.transform = 'translateY(-30px)';
          lane.appendChild(n);
          notes.push({ node: n, born: now, judged: false });
        }
        for (let i = notes.length - 1; i >= 0; i--) {
          const note = notes[i];
          const p = (now - note.born) / (fall * 1000);   // 0..1 at line
          const y = -30 + p * (HIT_Y() + 30);
          note.node.style.transform = `translateY(${y}px)`;
          note.y = y;
          if (!note.judged && y > HIT_Y() + WIN_PX()) {   // passed the line untapped
            note.judged = true; judged++; miss(note);
            cleanup(note, i);
          }
        }
        if (judged >= total) return end();
      });

      function miss(note) { note.node.classList.add('miss'); hitFlash(heroEl); S.bad(); }
      function cleanup(note, i) { setTimeout(() => note.node.remove(), 180); if (i != null) notes.splice(i, 1); }

      const onTap = e => {
        e.preventDefault(); if (done) return;
        pad.classList.remove('mash'); void pad.offsetWidth; pad.classList.add('mash');
        // nearest un-judged note to the line
        let best = null, bestD = 1e9, bi = -1;
        notes.forEach((n, i) => { if (n.judged) return; const d = Math.abs(n.y - HIT_Y()); if (d < bestD) { bestD = d; best = n; bi = i; } });
        if (best && bestD <= WIN_PX()) {
          best.judged = true; judged++; hits++;
          best.node.classList.add('hit'); hitFlash(foeEl); buzz(14); S.good();
          accEl.textContent = `Hits ${hits} / ${total}`;
          cleanup(best, bi);
        }
      };
      pad.addEventListener('pointerdown', onTap);

      function end() {
        if (done) return false; done = true;
        stop(); pad.removeEventListener('pointerdown', onTap);
        window.removeEventListener('resize', measure);
        notes.forEach(n => n.node.remove());
        const acc = hits / total;
        const win = acc >= need;
        sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7); buzz(win ? 30 : 60);
        resolve({ win, stars: win ? (acc >= 0.9 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
