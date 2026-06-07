/* The Gilded King — a three-phase gauntlet. Win all three back-to-back.
   Lose any phase and the whole duel restarts (costing a life). */
import { el, wait, sfx, buzz } from '../util.js';
import powerstrike from './powerstrike.js';
import memory from './memory.js';
import dodge from './dodge.js';

const PHASES = [
  { game: powerstrike, name: 'Crown of Fury', sub: 'Break the King’s guard!' },
  { game: memory,      name: 'Echoing Throne', sub: 'Recall the royal sigils!' },
  { game: dodge,       name: 'Tarnished Storm', sub: 'Survive the crown’s wrath!' }
];

export default {
  id: 'boss', name: 'The Gilded King', icon: '👑',
  howto: 'THREE trials, back to back. Win them ALL — the King yields nothing.',

  async play(area, ctx) {
    let kingHp = PHASES.length;
    for (let i = 0; i < PHASES.length; i++) {
      const ph = PHASES[i];
      await banner(area, i + 1, PHASES.length, ph, kingHp);
      const res = await ph.game.play(area, { ...ctx, difficulty: 10 });
      if (!res.win) { sfx(ctx.foe.sfx, 0.8); return { win: false, stars: 1 }; }
      kingHp--; buzz(40); sfx(ctx.hero.sfx, 0.8);
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
