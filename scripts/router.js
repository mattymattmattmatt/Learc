/* router.js  – simple hash-based scene manager
   Usage:
     import { registerRoute, initRouter } from './router.js';

     registerRoute('title', renderTitle);
     registerRoute('intro', renderIntro);
     …etc…

     initRouter();   // call once after all scenes are imported
*/

const routes = Object.create(null);

/* scene modules call this to register themselves */
export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

/* private helper → render whichever hash is active */
function renderCurrent() {
  const hash = location.hash.slice(1) || 'title';     // default route
  const route = routes[hash] || routes['title'];      // fallback safe-guard
  const mount = document.getElementById('app');

  if (!mount) throw new Error('#app mount point missing');
  if (!route) throw new Error(`Route "${hash}" not found`);

  route(mount);   // scene renders into #app
}

/* set up listener + initial render */
export function initRouter() {
  addEventListener('hashchange', renderCurrent);
  renderCurrent();    // first load
}
