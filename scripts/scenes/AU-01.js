import { registerRoute } from '../router.js';

function render(container) {
  container.innerHTML = `<h2>Australia – Level 1</h2>
                         <p>(stub scene – add choices here)</p>
                         <button id="back">Back to title</button>`;
  container.querySelector('#back').onclick = () => (location.hash = 'title');
}

registerRoute('AU-01', render);
export default render;
