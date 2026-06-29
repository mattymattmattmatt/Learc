/* Quick Draw — a reaction duel, best of 3.
   Wait for STRIKE!, then tap. Faster than your foe wins the round.
   Tap too early and you flinch (round lost). */
import { el, clamp, rand, sfx, buzz, wait, S } from '../util.js';
import { stageHTML, hitFlash } from './stage.js';

export default {
  id: 'quickdraw', name: 'Quick Draw', icon: '⚡',
  howto: 'Wait for “STRIKE!” then TAP as fast as you can. Don’t tap too early!',

  play(area, ctx) {
    return new Promise(resolve => {
      let pWins = 0, fWins = 0, round = 0;
      const winAt = 5;                                            // first to 5 — a proper duel, not over in a blink
      const foeTime = clamp(640 - ctx.difficulty * 40, 185, 720); // ms — 185 floor stays humanly beatable

      const RKEY = 'realm:rt';
      const getRec = () => { try { return parseInt(localStorage.getItem(RKEY) || '0', 10) || 0; } catch { return 0; } };
      let record = getRec();

      area.innerHTML = `
        ${stageHTML(ctx, 'qd')}
        <div class="qd-zone" id="z">
          <div class="qd-msg" id="msg">Get ready…</div>
        </div>
        <div class="qd-score" id="sc">You 0 — 0 ${ctx.foe.name}</div>
        <div class="qd-record" id="rec"></div>`;
      const z = area.querySelector('#z'), msg = area.querySelector('#msg'), sc = area.querySelector('#sc');
      const recEl = area.querySelector('#rec');
      const heroEl = area.querySelector('.hero'), foeEl = area.querySelector('.foe');
      const renderRec = flash => {
        recEl.innerHTML = record ? `🏆 Fastest draw: <b>${record}ms</b>` : '🏆 Fastest draw: <b>—</b>';
        if (flash) { recEl.classList.remove('nr'); void recEl.offsetWidth; recEl.classList.add('nr'); }
      };
      renderRec(false);

      const next = () => {
        round++;
        z.className = 'qd-zone';
        msg.textContent = 'Wait for it…';
        let armed = false, started = 0, done = false;
        const delay = rand(1100, 3200);
        let foeTimer, signalTimer;

        const finishRound = (playerWon, txt) => {
          if (done) return; done = true;
          z.removeEventListener('pointerdown', onTap);
          clearTimeout(signalTimer); clearTimeout(foeTimer);
          if (playerWon) { pWins++; hitFlash(foeEl); S.good(); }
          else { fWins++; hitFlash(heroEl); S.bad(); }
          buzz(playerWon ? 25 : 50);
          msg.textContent = txt;
          z.classList.add(playerWon ? 'win' : 'lose');
          sc.textContent = `You ${pWins} — ${fWins} ${ctx.foe.name}`;
          setTimeout(() => {
            if (pWins >= winAt || fWins >= winAt) {   // first to 5 wins the duel
              const win = pWins >= winAt;
              resolve({ win, stars: win ? (fWins <= 1 ? 3 : 2) : 1 });
            } else next();
          }, 850);
        };

        const onTap = () => {
          if (done) return;
          if (!armed) { finishRound(false, 'Too early! You flinched 😵'); return; }
          const rt = Math.round(performance.now() - started);
          if (record === 0 || rt < record) {            // a new personal fastest draw!
            record = rt; try { localStorage.setItem(RKEY, String(rt)); } catch {}
            renderRec(true); S.star();
            finishRound(rt < foeTime, `🏆 NEW RECORD! ${rt}ms`);
            return;
          }
          finishRound(rt < foeTime, rt < foeTime ? `STRIKE! ${rt}ms — you win!` : `${rt}ms… too slow!`);
        };
        z.addEventListener('pointerdown', onTap);

        signalTimer = setTimeout(() => {
          if (done) return;
          armed = true; started = performance.now();
          z.classList.add('strike'); msg.textContent = 'STRIKE!';
          S.go();                                  // hear the signal, not just see it
          // the foe also "draws" after its reaction time
          foeTimer = setTimeout(() => finishRound(false, `${ctx.foe.name} struck first!`), foeTime);
        }, delay);
      };

      wait(300).then(next);
    });
  }
};
