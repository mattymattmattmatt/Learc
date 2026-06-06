/* petGrid.js
   Click-to-pick helper for any grid of `[data-id]` pet buttons.
   Resolves with the chosen pet id, after applying a visual highlight.
   Uses event delegation so the grid's innerHTML can be re-rendered
   (e.g. habitat filtering) without losing the handler.
*/

export function pickPet(gridEl) {
  return new Promise(resolve => {
    function handler(e) {
      const btn = e.target.closest('[data-id]');
      if (!btn || !gridEl.contains(btn)) return;
      if (btn.disabled || btn.classList.contains('resting')) return;  // resting companion

      gridEl.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      btn.classList.add('selected');

      gridEl.removeEventListener('click', handler);
      // brief beat so the highlight is visible before the scene swaps
      setTimeout(() => resolve(btn.dataset.id), 160);
    }
    gridEl.addEventListener('click', handler);
  });
}
