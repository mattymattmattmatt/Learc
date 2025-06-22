import { registerRoute } from '../router.js';
import { playBGM }       from '../bgm.js';

function render(container) {
  container.innerHTML = `
    <div class="title-card title-only">
      <h1 style="color:#e11d48;margin-bottom:1rem">Game Over</h1>
      <button id="restart" class="big-btn">Back to Title</button>
    </div>
  `;
  fitCard();
  addEventListener('resize', fitCard);
  addEventListener('orientationchange', fitCard);

  container.querySelector('#restart').onclick = () => {
    location.hash = 'title';
  };
}

function fitCard() {
  const card = document.querySelector('.title-card');
  if (!card) return;
  const s = Math.min((innerWidth*0.95)/400, (innerHeight*0.95)/250, 1);
  card.style.transform = `scale(${s})`;
  card.style.transformOrigin = 'center center';
}

registerRoute('gameover', render);
export default render;
