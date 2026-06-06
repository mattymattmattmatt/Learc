import { registerRoute } from '../router.js';
import { playBGM, stopBGM } from '../bgm.js';
import { state, computeScore, bestScore, recordScore } from '../state.js';
import { hideHUD }       from '../hud.js';

const KING = 'assets/img/king_intro.gif';

function computeEnding() {
  const { gold, heat, captured } = state;
  if (captured) {
    return { key: 'fall', title: 'Caught Red-Handed', emoji: '🚨', bgm: 'gameover',
      text: `The thieves' allies cornered you at Heat ${heat}. You're hauled before the court with only ${gold}% of the gold to your name. The False Vizier pins the whole theft on you — and the King believes him.` };
  }
  if (gold >= 80 && heat <= 15) {
    return { key: 'golden', title: 'Golden Triumph', emoji: '👑', bgm: 'intro',
      text: `You return to Liitokala with ${gold}% of the royal gold and barely a whisper of suspicion behind you. The King names you Royal World Tracker, and your legend is sung in thirty nations!` };
  }
  if (gold < 30 || heat >= 70) {
    return { key: 'fall', title: 'The Fall Guy', emoji: '⛓️', bgm: 'gameover',
      text: `You limp home with only ${gold}% of the gold and a trail of suspicion (Heat ${heat}) blazing behind you. The King, betrayed and furious, casts you out in disgrace.` };
  }
  return { key: 'middle', title: 'The Indentured Middle', emoji: '⚖️', bgm: 'intro',
    text: `You recover ${gold}% of the gold — enough to spare your life, not enough for glory. The King keeps you on, half-trusted, to work off what's still missing.` };
}

function gradeFor(score) {
  if (score >= 9000) return 'S';
  if (score >= 6500) return 'A';
  if (score >= 4000) return 'B';
  if (score >= 2000) return 'C';
  return 'D';
}

function render(container) {
  stopBGM();
  hideHUD();
  const e = computeEnding();
  playBGM(e.bgm);

  const score = computeScore();
  const prevBest = bestScore();
  const isBest = recordScore(score);
  const grade = gradeFor(score);

  container.innerHTML = `
    <div class="card ending-card ending-${e.key}">
      <div class="map-emoji">${e.emoji}</div>
      <h1 class="game-title small">${e.title}</h1>
      <img src="${KING}" alt="The King" class="king-img small">
      <p class="body-text">${e.text}</p>
      <div class="grade-row">
        <div class="grade grade-${grade}">${grade}</div>
        <div class="score-block">
          <div class="score-line"><b>${score.toLocaleString()}</b> pts ${isBest ? '<span class="newbest">★ NEW BEST</span>' : ''}</div>
          <small>Best: ${Math.max(prevBest, score).toLocaleString()}</small>
        </div>
      </div>
      <div class="summary-stats">
        <div><span class="hud-icon">🪙</span><b>${state.gold}%</b><small>Gold</small></div>
        <div><span class="hud-icon">🔥</span><b>${state.heat}</b><small>Heat</small></div>
        <div><span class="hud-icon">⚡</span><b>×${state.maxCombo}</b><small>Best Combo</small></div>
      </div>
      <button id="again" class="big-btn">Play Again</button>
    </div>`;

  container.querySelector('#again').onclick = () => { location.hash = 'title'; };
}

registerRoute('ending', render);
export default render;
