/* _stage.js — shared bits for minigames: the two combatants + HP pips */
import { petImg, el } from '../util.js';

export function stageHTML(ctx, extraClass = '') {
  return `
    <div class="stage ${extraClass}">
      <div class="fighter hero">
        <img src="${petImg(ctx.hero)}" alt="${ctx.hero.name}">
        <span class="fname">${ctx.hero.name}</span>
      </div>
      <div class="vs">VS</div>
      <div class="fighter foe">
        <img src="${petImg(ctx.foe)}" alt="${ctx.foe.name}">
        <span class="fname">${ctx.foe.name}</span>
      </div>
    </div>`;
}

/* a row of pips (HP / lives) */
export function pips(n, full = '●', empty = '○') { return full.repeat(n); }

/* hit-flash a fighter element */
export function hitFlash(node) {
  if (!node) return;
  node.classList.remove('hit'); void node.offsetWidth; node.classList.add('hit');
}
