import { registerRoute } from '../router.js';
import { playBGM, stopBGM } from '../bgm.js';
import { state }         from '../state.js';
import { hideHUD }       from '../hud.js';

const KING = 'assets/img/king_intro.gif';

function computeEnding() {
  const { gold, heat } = state;
  if (gold >= 80 && heat <= 10) {
    return {
      key: 'golden', title: 'Golden Triumph', emoji: '👑',
      bgm: 'intro',
      text: `You return to Liitokala with ${gold}% of the royal gold and barely a whisper of suspicion behind you. The King names you Royal World Tracker, and your legend is sung in thirty nations. A true and shining triumph!`
    };
  }
  if (gold < 30 || heat >= 26) {
    return {
      key: 'fall', title: 'The Fall Guy', emoji: '⛓️',
      bgm: 'gameover',
      text: `You stumble home with only ${gold}% of the gold and a trail of suspicion (Heat ${heat}) blazing behind you. The False Vizier pins the whole theft on you. The King, betrayed and furious, has you cast out in disgrace.`
    };
  }
  return {
    key: 'middle', title: 'The Indentured Middle', emoji: '⚖️',
    bgm: 'intro',
    text: `You recover ${gold}% of the gold — enough to spare your life, not enough for glory. The King keeps you on, half-trusted, to work off what's still missing. A quiet, complicated ending… perhaps you'll do better next time.`
  };
}

function render(container) {
  stopBGM();
  hideHUD();
  const e = computeEnding();
  playBGM(e.bgm);

  container.innerHTML = `
    <div class="card ending-card ending-${e.key}">
      <div class="map-emoji">${e.emoji}</div>
      <h1 class="game-title small">${e.title}</h1>
      <img src="${KING}" alt="The King" class="king-img small">
      <p class="body-text">${e.text}</p>
      <div class="summary-stats">
        <div><span class="hud-icon">🪙</span><b>${state.gold}%</b><small>Final Gold</small></div>
        <div><span class="hud-icon">🔥</span><b>${state.heat}</b><small>Final Heat</small></div>
      </div>
      <button id="again" class="big-btn">Play Again</button>
    </div>`;

  container.querySelector('#again').onclick = () => { location.hash = 'title'; };
}

registerRoute('ending', render);
export default render;
