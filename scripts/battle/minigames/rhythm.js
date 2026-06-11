/* Rhythm Rush — a Guitar-Hero-style lane game. Notes fall down four
   coloured lanes toward the strum line; tap each lane as its note lands.
   Every lane is a musical pitch, so hitting the notes in order actually
   plays the tune. Nail enough of the song to out-perform the foe. */
import { el, clamp, loop, sfx, buzz, floatText, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

const L = 4;
const LANE_FREQ = [523.25, 587.33, 659.25, 783.99];          // C5 D5 E5 G5 — all consonant
const LANE_COLOR = ['#5fe39a', '#ff5a86', '#ffd23f', '#5cc6ff'];

/* songs as [lane, beats] — lane 0..3 maps to the pitches above.
   Pentatonic-ish, so any hit sounds musical and the melody is recognisable. */
const SONGS = [
  { name: 'Mary’s Lamb', notes: [[2,1],[1,1],[0,1],[1,1],[2,1],[2,1],[2,2],[1,1],[1,1],[1,2],[2,1],[3,1],[3,2],[2,1],[1,1],[0,1],[1,1],[2,1],[2,1],[2,1],[2,1],[1,1],[1,1],[2,1],[1,1],[0,2]] },
  { name: 'Skybound',    notes: [[0,1],[2,1],[3,1],[2,1],[0,1],[2,1],[3,2],[3,1],[2,1],[1,1],[2,1],[3,1],[2,1],[1,2],[0,1],[1,1],[2,1],[3,1],[2,2]] },
  { name: 'Tideroll',    notes: [[3,1],[2,1],[1,1],[0,1],[1,1],[2,1],[3,1],[2,1],[3,1],[3,1],[2,2],[1,1],[0,1],[1,1],[2,1],[1,1],[0,2]] }
];

export default {
  id: 'rhythm', name: 'Rhythm Rush', icon: '🎸',
  howto: 'Tap each lane the moment its note reaches the line — play the whole tune to win!',

  play(area, ctx) {
    return new Promise(resolve => {
      const song = SONGS[(Math.random() * SONGS.length) | 0];
      const beatGap = clamp(0.6 - ctx.difficulty * 0.022, 0.34, 0.6);   // tempo
      const fall = clamp(1.7 - ctx.difficulty * 0.05, 1.05, 1.7);       // travel time top→line
      const need = 0.62;

      // build the note timeline
      const notes = []; let t = fall + 0.6;            // lead-in so the first gem can fall
      for (const [lane, beats] of song.notes) { notes.push({ lane, hitT: t, spawnT: t - fall, node: null, judged: false, cy: 0 }); t += beats * beatGap; }
      const total = notes.length;

      area.innerHTML = `
        ${stageHTML(ctx, 'gh')}
        <div class="gh-hud"><span>🎵 <b id="acc">0</b>/${total}</span><span class="gh-song">♪ ${song.name}</span><span id="combo" class="rh-combo"></span></div>
        <div class="gh-board" id="board">
          ${Array.from({ length: L }, (_, i) => `<div class="gh-lane" data-lane="${i}" style="--c:${LANE_COLOR[i]}"><span class="gh-fret"></span></div>`).join('')}
          <div class="gh-hitline" id="hitline"></div>
        </div>`;
      const board = area.querySelector('#board'), hitline = area.querySelector('#hitline');
      const accEl = area.querySelector('#acc'), comboEl = area.querySelector('#combo');
      const heroEl = area.querySelector('.hero'), foeEl = area.querySelector('.foe');
      const laneEls = [...board.querySelectorAll('.gh-lane')];

      let BH = 0, hitY = 0, aRect = null, bRect = null, laneW = 0, gemH = 40;
      const measure = () => {
        bRect = board.getBoundingClientRect(); aRect = area.getBoundingClientRect();
        BH = bRect.height; laneW = bRect.width / L; gemH = laneW * 0.76;
        hitY = BH - clamp(BH * 0.11, 38, 60); hitline.style.top = hitY + 'px';
      };
      measure(); window.addEventListener('resize', measure);
      const GOOD = () => clamp(BH * 0.09, 22, 58);
      const PERFECT = () => GOOD() * 0.45;

      let spawned = 0, hits = 0, judged = 0, combo = 0, maxCombo = 0, done = false;
      const t0 = performance.now();
      const updateCombo = () => { comboEl.textContent = combo >= 2 ? `🔥 ${combo}` : ''; };
      const floatAt = (lane, txt, cls) => floatText(area, (bRect.left - aRect.left) + laneW * (lane + 0.5), (bRect.top - aRect.top) + hitY - 14, txt, cls);

      const flashFret = i => { const f = laneEls[i].querySelector('.gh-fret'); f.classList.remove('active'); void f.offsetWidth; f.classList.add('active'); setTimeout(() => f.classList.remove('active'), 110); };

      const onLane = i => {
        if (done) return;
        flashFret(i);
        let best = null, bd = 1e9;
        for (const n of notes) { if (n.judged || !n.node || n.lane !== i) continue; const d = Math.abs(n.cy - hitY); if (d < bd) { bd = d; best = n; } }
        if (best && bd <= GOOD()) {
          best.judged = true; judged++; hits++; combo++; maxCombo = Math.max(maxCombo, combo);
          const perfect = bd <= PERFECT();
          best.node.classList.add('hit'); hitFlash(foeEl); buzz(perfect ? 18 : 10);
          S.note(LANE_FREQ[i]);                          // ← the tune plays as you hit!
          floatAt(i, perfect ? 'PERFECT!' : 'good', perfect ? 'good' : '');
          accEl.textContent = hits; updateCombo();
          const nn = best.node; setTimeout(() => nn.remove(), 180);
        }
      };
      laneEls.forEach((laneEl, i) => laneEl.addEventListener('pointerdown', e => { e.preventDefault(); onLane(i); }));

      const stop = loop((dt, now) => {
        if (done) return false;
        const elapsed = (now - t0) / 1000;
        while (spawned < total && elapsed >= notes[spawned].spawnT) {
          const n = notes[spawned]; const g = el('div', 'gh-gem'); laneEls[n.lane].appendChild(g); n.node = g; spawned++;
        }
        for (const n of notes) {
          if (n.judged || !n.node) continue;
          n.cy = ((elapsed - n.spawnT) / fall) * hitY;
          n.node.style.transform = `translateY(${n.cy - gemH / 2}px)`;
          if (n.cy > hitY + GOOD()) {
            n.judged = true; judged++; combo = 0; updateCombo();
            n.node.classList.add('miss'); hitFlash(heroEl); S.bad();
            const nn = n.node; setTimeout(() => nn.remove(), 220);
          }
        }
        if (judged >= total) return end();
      });

      function end() {
        if (done) return false; done = true; stop();
        window.removeEventListener('resize', measure);
        notes.forEach(n => n.node && n.node.remove());
        const acc = hits / total, win = acc >= need;
        if (!win) sfx(ctx.foe.sfx, 0.7); buzz(win ? 30 : 60);
        resolve({ win, stars: win ? (acc >= 0.9 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
