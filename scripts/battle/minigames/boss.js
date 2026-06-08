/* The Gilded King — a three-phase gauntlet. Win all three back-to-back.
   Lose any phase and the whole duel restarts (costing a life). */
import { sfx, buzz, shuffle, S } from '../util.js';
import powerstrike from './powerstrike.js';
import memory from './memory.js';
import dodge from './dodge.js';
import charge from './charge.js';
import swipe from './swipe.js';
import balance from './balance.js';
import catchgame from './catch.js';
import slingshot from './slingshot.js';
import sharpshooter from './sharpshooter.js';

/* a curated pool of games that play well at max difficulty; the King
   draws three different trials each attempt, so the finale stays fresh */
const POOL = [
  { game: powerstrike, name: 'Crown of Fury',    sub: 'Break the King’s guard!' },
  { game: charge,      name: 'Gilded Cannon',    sub: 'Charge the crown-breaker!' },
  { game: memory,      name: 'Echoing Throne',   sub: 'Recall the royal sigils!' },
  { game: dodge,       name: 'Tarnished Storm',  sub: 'Survive the crown’s wrath!' },
  { game: swipe,       name: 'Decree of Blades', sub: 'Answer every command!' },
  { game: balance,     name: 'Weight of a Crown', sub: 'Do not falter!' },
  { game: catchgame,   name: 'Falling Realm',    sub: 'Save what you can!' },
  { game: slingshot,   name: 'Siege the Throne',  sub: 'Strike the crown down!' },
  { game: sharpshooter,name: 'Royal Gauntlet',    sub: 'Pick off the guard!' }
];

export default {
  id: 'boss', name: 'The Gilded King', icon: '👑',
  howto: 'THREE trials, back to back. Win them ALL — the King yields nothing.',

  async play(area, ctx) {
    const phases = shuffle(POOL).slice(0, 3);
    let kingHp = phases.length;
    for (let i = 0; i < phases.length; i++) {
      const ph = phases[i];
      await banner(area, i + 1, phases.length, ph, kingHp);
      const res = await ph.game.play(area, { ...ctx });
      if (!res.win) { sfx(ctx.foe.sfx, 0.8); S.lose(); return { win: false, stars: 1 }; }
      kingHp--; buzz(40); S.win(); sfx(ctx.hero.sfx, 0.8);
    }
    return { win: true, stars: 3 };
  }
};

function banner(area, n, total, ph, kingHp) {
  return new Promise(resolve => {
    area.innerHTML = `
      <div class="boss-banner">
        <div class="boss-crown">👑</div>
        <div class="boss-hp">${'♛'.repeat(kingHp)}${'·'.repeat(total - kingHp)}</div>
        <div class="boss-phase">Phase ${n} / ${total}</div>
        <h2 class="boss-name">${ph.name}</h2>
        <p class="boss-sub">${ph.sub}</p>
      </div>`;
    setTimeout(resolve, 1500);
  });
}
