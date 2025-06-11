// scripts/scenes/title.js
import { loadSave } from '../save.js';
import { registerRoute } from '../router.js';

function render(container) {
  container.innerHTML = `
    <h1>Animal Heroes</h1>
    <input id="nameBox" placeholder="Enter your username" />
    <button id="playBtn">Play</button>
  `;

  container.querySelector('#playBtn').onclick = async () => {
    const name = container.querySelector('#nameBox').value.trim();
    if (!name) return alert('Pick a name!');
    const profile = await loadSave(name);
    console.log('Loaded save:', profile);
    location.hash = 'AU-01';           // jump to first scene
  };
}

registerRoute('title', render);
export default render;
