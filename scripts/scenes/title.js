import { registerRoute } from '../router.js';
import { loadSave }     from '../save.js';

function render(container) {
  container.innerHTML = `
    <div class="title-card">
      <h1>Learc</h1>

      <input id="nameBox"
             type="text"
             maxlength="16"
             autocomplete="off"
             placeholder="Enter your adventurer name"/>

      <button id="playBtn">Start Journey</button>
    </div>
  `;

  const nameBox = container.querySelector('#nameBox');
  container.querySelector('#playBtn').onclick = async () => {
    const name = nameBox.value.trim();
    if (!name) { nameBox.focus(); return; }

    try {
      await loadSave(name);
      location.hash = 'AU-01';          // jump to first map
    } catch (err) {
      alert('Save error – check console'); console.error(err);
    }
  };

  // QoL: focus the textbox automatically
  nameBox.focus();
}

registerRoute('title', render);
export default render;
