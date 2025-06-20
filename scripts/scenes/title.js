import { registerRoute } from '../router.js';

function render(container) {
  container.innerHTML = `
    <div class="title-card title-only">
      <button id="startBtn" class="big-btn">Start Game</button>
    </div>
  `;

  fitCard();
  addEventListener('resize', fitCard);
  addEventListener('orientationchange', fitCard);

  container.querySelector('#startBtn').onclick = () => {
    location.hash = 'intro';
  };
}

/* re-use the existing scaler */
function fitCard() {
  const card = document.querySelector('.title-card');
  if (!card) return;
  const s = Math.min((innerWidth*0.95)/500, (innerHeight*0.95)/300, 1);
  card.style.transform = `scale(${s})`;
  card.style.transformOrigin = 'center center';
}

registerRoute('title', render);
export default render;
