/* router.js  – hash-based scene manager                                  *
 * ---------------------------------------------------------------------- *
 * 1.  Each scene calls  registerRoute('#hash', renderFn)                 *
 * 2.  initRouter() reads location.hash and renders the matching scene.   *
 * 3.  Changing location.hash anywhere in the code swaps scenes.          */

import { stopBGM } from './bgm.js';   // fade any track between scenes

const routes = Object.create(null);

/* scenes register themselves here */
export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

/* render the current hash (or fallback to #title) */
function renderCurrent() {
  const hash   = location.hash.slice(1) || 'title';
  const render = routes[hash] || routes['title'];
  const mount  = document.getElementById('app');

  if (!render) { console.error(`Route "${hash}" not found.`); return; }

  stopBGM();           // stop previous music before drawing new scene
  render(mount);
}

/* Navigate to a route. If it's the SAME hash we're already on
   (e.g. puzzle slot 1 → puzzle slot 2), no hashchange event would
   fire, so we force a re-render explicitly. */
export function navigate(route) {
  if (location.hash.slice(1) === route) renderCurrent();
  else location.hash = route;
}

/* call once after all scenes are imported */
export function initRouter() {
  addEventListener('hashchange', renderCurrent);
  renderCurrent();
}
