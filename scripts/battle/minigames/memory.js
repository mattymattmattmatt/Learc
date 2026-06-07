/* Memory Echo — the foe flashes a pattern of elemental runes; repeat it
   back. One mistake and you lose. The pattern grows with difficulty. */
import { el, wait, sfx, buzz } from '../util.js';
import { stageHTML, hitFlash } from './_stage.js';

const PADS = [
  { c: 'pad-fire',  e: '🔥' },
  { c: 'pad-water', e: '💧' },
  { c: 'pad-leaf',  e: '🍃' },
  { c: 'pad-bolt',  e: '⚡' }
];

export default {
  id: 'memory', name: 'Memory Echo', icon: '🧠',
  howto: 'Watch the runes light up, then tap them back in the SAME order.',

  play(area, ctx) {
    return new Promise(resolve => {
      const len = Math.min(8, 3 + Math.floor(ctx.difficulty / 2));   // 3..8
      const showMs = Math.max(280, 620 - ctx.difficulty * 34);
      const seq = Array.from({ length: len }, () => (Math.random() * 4) | 0);

      area.innerHTML = `
        ${stageHTML(ctx, 'mem')}
        <div class="mem-status" id="st">Watch carefully…</div>
        <div class="mem-grid">
          ${PADS.map((p, i) => `<button class="mem-pad ${p.c}" data-i="${i}" disabled>${p.e}</button>`).join('')}
        </div>`;
      const st = area.querySelector('#st');
      const pads = [...area.querySelectorAll('.mem-pad')];
      const foeEl = area.querySelector('.foe'), heroEl = area.querySelector('.hero');

      const light = i => { pads[i].classList.add('lit'); sfx(null); setTimeout(() => pads[i].classList.remove('lit'), showMs * 0.6); };

      async function playSeq() {
        await wait(500);
        for (const i of seq) { light(i); await wait(showMs); }
        st.textContent = 'Your turn! Repeat the pattern.';
        pads.forEach(p => p.disabled = false);
        listen();
      }

      let pos = 0;
      function listen() {
        pads.forEach(p => p.onclick = () => {
          const i = +p.dataset.i;
          p.classList.add('lit'); setTimeout(() => p.classList.remove('lit'), 160);
          if (i === seq[pos]) {
            pos++; buzz(12);
            if (pos >= seq.length) finish(true);
          } else {
            hitFlash(heroEl); finish(false);
          }
        });
      }

      function finish(win) {
        pads.forEach(p => { p.disabled = true; p.onclick = null; });
        st.textContent = win ? 'Perfect echo! 🎉' : 'Wrong rune! 💥';
        sfx(win ? ctx.hero.sfx : ctx.foe.sfx, 0.7);
        if (win) hitFlash(foeEl);
        buzz(win ? 30 : 60);
        setTimeout(() => resolve({ win, stars: win ? 3 : 1 }), 700);
      }

      playSeq();
    });
  }
};
