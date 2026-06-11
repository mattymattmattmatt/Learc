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
      const foeTime = clamp(640 - ctx.difficulty * 44, 150, 720); // ms

      area.innerHTML = `
        ${stageHTML(ctx, 'qd')}
        <div class="qd-zone" id="z">
          <div class="qd-msg" id="msg">Get ready…</div>
        </div>
        <div class="qd-score" id="sc">You 0 — 0 ${ctx.foe.name}</div>`;
      const z = area.querySelector('#z'), msg = area.querySelector('#msg'), sc = area.querySelector('#sc');
      const heroEl = area.querySelector('.hero'), foeEl = area.querySelector('.foe');

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
            if (pWins >= 2 || fWins >= 2) {
              const win = pWins >= 2;
              resolve({ win, stars: win ? (fWins === 0 ? 3 : 2) : 1 });
            } else next();
          }, 850);
        };

        const onTap = () => {
          if (done) return;
          if (!armed) { finishRound(false, 'Too early! You flinched 😵'); return; }
          const rt = performance.now() - started;
          finishRound(rt < foeTime, rt < foeTime
            ? `STRIKE! ${Math.round(rt)}ms — you win!`
            : `${Math.round(rt)}ms… too slow!`);
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
