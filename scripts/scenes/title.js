import { registerRoute } from '../router.js';
import { loadSave, saveProgress } from '../save.js';
import heroes from '../data/characters.json' assert { type: 'json' };

/* helper: build gallery */
function gridFor(habitat) {
  return heroes
    .filter(h => h.habitat === habitat)
    .map(
      h => `<img src="/assets/img/characters/${h.sprite}"
                alt="${h.name}"
                title="${h.power}"
                data-id="${h.id}"
                class="hero-thumb">`
    )
    .join('');
}

function render(container) {
  container.innerHTML = `
    <div class="title-card">
      <h1>Learc</h1>

      <div class="tabs">
        <button data-tab="land"   class="tab active">Land</button>
        <button data-tab="sea"    class="tab">Sea</button>
        <button data-tab="sky"    class="tab">Sky</button>
      </div>

      <div class="gallery" id="gallery">
        ${gridFor('land')}
      </div>

      <input id="nameBox" type="text"
             maxlength="16" placeholder="Enter adventurer name" />

      <button id="playBtn" disabled>Start Journey</button>
    </div>
  `;

  /* --- tab switching --- */
  container.querySelectorAll('.tab').forEach(btn => {
    btn.onclick = () => {
      container.querySelector('.tab.active')?.classList.remove('active');
      btn.classList.add('active');
      container.querySelector('#gallery').innerHTML = gridFor(btn.dataset.tab);
      selectedHero = null;
      playBtn.disabled = true;
    };
  });

  /* --- hero selection --- */
  let selectedHero = null;
  const playBtn = container.querySelector('#playBtn');
  container
    .querySelector('#gallery')
    .addEventListener('click', e => {
      const img = e.target.closest('.hero-thumb');
      if (!img) return;
      container
        .querySelectorAll('.hero-thumb.selected')
        .forEach(i => i.classList.remove('selected'));
      img.classList.add('selected');
      selectedHero = img.dataset.id;
      playBtn.disabled = false;
    });

  /* --- continue button --- */
  playBtn.onclick = async () => {
    const username = container.querySelector('#nameBox').value.trim();
    if (!username) return container.querySelector('#nameBox').focus();

    const profile = await loadSave(username);
    await saveProgress(username, { hero: selectedHero });
    console.log('Loaded & saved profile', profile);
    location.hash = 'AU-01';            // jump to first episode
  };

  container.querySelector('#nameBox').focus();
}

registerRoute('title', render);
export default render;
