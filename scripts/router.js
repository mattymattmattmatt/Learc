// scripts/router.js
const routes = {};

export function registerRoute(hash, loaderFn) {
  routes[hash] = loaderFn;
}

export function initRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();         // run once on first load
}

function handleRoute() {
  const hash = location.hash.slice(1) || 'title';
  const loader = routes[hash] || routes['title'];
  loader(document.getElementById('app'));
}
