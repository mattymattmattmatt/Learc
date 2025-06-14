import { registerRoute } from '../router.js';
import { loadSave, saveProgress } from '../save.js';

let heroesCache = null;
async function getHeroes() {
  if (heroesCache) return heroesCache;
  const res = await fetch('../data/characters.json');
  heroesCache = await res.json();
  return heroesCache;
}

function gridFor(list, habitat) {
  return list
    .filter(h => h.habitat === habitat)
    .map(
      h => `<img src="assets/img/characters/${h.sprite}"
                alt="${h.name}"
                title="${h.power}"
                data-id="${h.id}"
                class="hero-thumb">`
    )
    .join('');
}

async function render(container) {
  const heroes = await getHeroes();

  container.innerHTML = `
    <div class="title-card">
      <h1>Learc</h1>

      <div class="tabs">
        <button data-tab="land" class="tab active">Land</button>
        <button data-tab="sea"  class="tab">Sea</button>
        <button data-tab="sky"  class="tab">Sky</button>
      </div>

      <div class="gallery" id="gallery">${gridFor(heroes, 'land')}</div>

      <input id="nameBox" type="text" maxlength="16"
             placeholder="Enter adventurer name" />

      <button id="playBtn" disabled>Start Journey</button>
    </div>
  `;

  /* tab logic */
  container.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      container.querySelector('.tab.active')?.classList.remove('active');
      btn.classList.add('active');
      container.querySelector('#gallery').innerHTML =
        gridFor(heroes, btn.dataset.tab);
      selectedHero = null;
      playBtn.disabled = true;
    };
  });

  /* hero selection */
  let selectedHero = null;
  const playBtn = container.querySelector('#playBtn');
  container.querySelector('#gallery').addEventListener('click', e => {
    const img = e.target.closest('.hero-thumb');
    if (!img) return;
    container
      .querySelectorAll('.hero-thumb.selected')
      .forEach(i => i.classList.remove('selected'));
    img.classList.add('selected');
    selectedHero = img.dataset.id;
    playBtn.disabled = false;
  });

  /* start button */
  playBtn.onclick = async () => {
    const username = container.querySelector('#nameBox').value.trim();
    if (!username) return container.querySelector('#nameBox').focus();
    await loadSave(username);
    await saveProgress(username, { hero: selectedHero });
    location.hash = 'AU-01';
  };

  container.querySelector('#nameBox').focus();
}

registerRoute('title', render);
export default render;
