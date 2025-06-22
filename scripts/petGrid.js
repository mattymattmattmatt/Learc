/* petGrid.js
   Click-to-pick helper used by AU-01 puzzle scene
   Expects a container of <img data-id="petId"> thumbnails.
*/

export function pickPet(gridEl) {
  return new Promise(resolve => {
    gridEl.addEventListener('click', handler, { once: true });

    function handler(e) {
      const img = e.target.closest('img[data-id]');
      if (!img) { gridEl.addEventListener('click', handler, { once: true }); return; }

      // visual highlight
      gridEl.querySelectorAll('.hero-thumb.selected')
            .forEach(el => el.classList.remove('selected'));
      img.classList.add('selected');

      resolve(img.dataset.id);
    }
  });
}
