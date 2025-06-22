import { registerRoute } from '../router.js';
import { playBGM, stopBGM } from '../bgm.js';

function render(container){
  stopBGM(); playBGM('gameover');
  container.innerHTML=`
    <div class="title-card title-only">
      <h1 style="color:#e11d48;margin-bottom:1rem">Game Over</h1>
      <button id="restart" class="big-btn">Back to Title</button>
    </div>`;
  container.querySelector('#restart').onclick=()=>{location.hash='title';};
}

registerRoute('gameover',render);
export default render;
