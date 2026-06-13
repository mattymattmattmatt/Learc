/* Echo Beat — Yellogen squawks a rhythm; you echo it back.
   LISTEN as the playhead sweeps and the beats flash, then on YOUR TURN tap
   the pad in time as the playhead crosses each remembered beat. It's a
   call-and-response rhythm: nail enough beats across the rounds to win. */
import { clamp, loop, sfx, buzz, petImg, S } from '../util.js';

const SCALE = [392.0, 440.0, 493.88, 587.33, 659.25, 698.46, 783.99, 880.0]; // 8 rising tones

export default {
  id: 'sonicring', name: 'Echo Beat', icon: '🎶',
  howto: 'LISTEN to the squawk pattern, then TAP it back in time. Echo enough beats to win!',

  play(area, ctx) {
    return new Promise(resolve => {
      const bars = 8;
      const beatGap = clamp(0.5 - ctx.difficulty * 0.014, 0.26, 0.5);   // seconds per beat
      const totalRounds = 4;
      const need = 0.6;
      const ON = [3, 4, 4, 5];                                          // beats per round
      const win = clamp(0.46 - ctx.difficulty * 0.012, 0.26, 0.46);     // timing leniency (beats)

      let cellsHTML = '';
      for (let i = 0; i < bars; i++) cellsHTML += `<div class="eb-cell" data-i="${i}"></div>`;
      area.innerHTML = `
        <div class="eb-hud"><span class="eb-round" id="round">Round 1/${totalRounds}</span>
          <span>🎵 <b id="acc">0</b>/<b id="tot">0</b></span></div>
        <div class="eb-stage">
          <img class="eb-foe" id="foe" src="${petImg(ctx.foe)}" alt="">
          <div class="eb-track" id="track">${cellsHTML}<div class="eb-head" id="head"></div></div>
          <div class="eb-banner show" id="banner">Get ready…</div>
        </div>
        <button class="tap-pad eb-pad" id="pad">TAP THE BEAT</button>`;
      const headEl = area.querySelector('#head'), banner = area.querySelector('#banner');
      const pad = area.querySelector('#pad'), foeEl = area.querySelector('#foe');
      const accEl = area.querySelector('#acc'), totEl = area.querySelector('#tot'), roundEl = area.querySelector('#round');
      const cells = [...area.querySelectorAll('.eb-cell')];

      let phase = 'gap', timer = 1.0, after = 'listen', head = 0, roundIdx = 0, done = false;
      let pattern = new Set(), flashed = new Set(), hitSet = new Set(), hits = 0, total = 0;

      const setBanner = (t, cls = '') => { banner.textContent = t; banner.className = 'eb-banner show ' + cls; };
      function genRound() {
        pattern = new Set(); flashed = new Set(); hitSet = new Set();
        const n = ON[Math.min(roundIdx, ON.length - 1)];
        const idx = [...Array(bars).keys()];
        for (let i = idx.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [idx[i], idx[j]] = [idx[j], idx[i]]; }
        idx.slice(0, n).forEach(i => pattern.add(i));
        cells.forEach(c => { c.className = 'eb-cell'; });              // uniform — remember the pattern!
        roundEl.textContent = `Round ${roundIdx + 1}/${totalRounds}`;
      }
      const startListen = () => { genRound(); phase = 'listen'; head = 0; setBanner('🔊 Listen…', 'listen'); };
      const startRepeat = () => { phase = 'repeat'; head = 0; total += pattern.size; totEl.textContent = total; cells.forEach(c => c.classList.remove('lit')); setBanner('🎤 Your turn!', 'go'); };

      const onTap = e => {
        if (e) e.preventDefault();
        if (done || phase !== 'repeat') return;
        const cur = head, i = Math.floor(cur);
        if (i >= 0 && i < bars && pattern.has(i) && !hitSet.has(i) && Math.abs(cur - (i + 0.5)) <= win) {
          hitSet.add(i); hits++; accEl.textContent = hits; cells[i].classList.add('hit'); S.note(SCALE[i]); buzz(14);
          foeEl.classList.remove('hurt'); void foeEl.offsetWidth; foeEl.classList.add('hurt');
        } else { S.bad(); buzz(40); }
      };
      pad.addEventListener('pointerdown', onTap);

      const stop = loop(dt => {
        if (done) return false;
        if (phase === 'gap') { timer -= dt; if (timer <= 0) (after === 'listen' ? startListen() : startRepeat()); return; }
        head += dt / beatGap;
        headEl.style.left = clamp(head / bars * 100, 0, 100) + '%';
        if (phase === 'listen') {
          for (let i = 0; i < bars; i++) if (pattern.has(i) && !flashed.has(i) && head >= i + 0.5) { flashed.add(i); cells[i].classList.add('lit'); S.note(SCALE[i]); }
          if (head >= bars) { phase = 'gap'; timer = 0.55; after = 'repeat'; setBanner('🎤 Repeat it!', 'go'); }
        } else {
          if (head >= bars) {
            roundIdx++;
            if (roundIdx >= totalRounds) return end(hits / Math.max(1, total) >= need);
            phase = 'gap'; timer = 0.7; after = 'listen';
          }
        }
      });

      function end(w) {
        if (done) return false; done = true; stop(); pad.removeEventListener('pointerdown', onTap);
        const acc = hits / Math.max(1, total);
        (w ? S.win : S.lose)(); if (!w) sfx(ctx.foe.sfx, 0.7); buzz(w ? 30 : 60);
        resolve({ win: w, stars: w ? (acc >= 0.9 ? 3 : 2) : 1 });
        return false;
      }
    });
  }
};
