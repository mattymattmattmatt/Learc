/* Battle of the Realm — offline-first service worker.
   Precache the app shell (HTML/CSS/JS/data); creature art and audio are
   cached on first use (stale-while-revalidate), after which the whole
   game runs without a network. Bump CACHE to invalidate old caches. */

const CACHE = 'botr-v1';

const CORE = [
  './',
  'index.html',
  'styles/battle.css',
  'manifest.webmanifest',
  'scripts/data/pets.json',
  'scripts/battle/main.js',
  'scripts/battle/data.js',
  'scripts/battle/state.js',
  'scripts/battle/util.js',
  'scripts/battle/leaderboard.js',
  'scripts/battle/meta.js',
  'scripts/battle/minigames/index.js',
  'scripts/battle/minigames/stage.js',
  'scripts/battle/minigames/quickdraw.js',
  'scripts/battle/minigames/tugofwar.js',
  'scripts/battle/minigames/powerstrike.js',
  'scripts/battle/minigames/memory.js',
  'scripts/battle/minigames/dodge.js',
  'scripts/battle/minigames/blitz.js',
  'scripts/battle/minigames/rhythm.js',
  'scripts/battle/minigames/catch.js',
  'scripts/battle/minigames/swipe.js',
  'scripts/battle/minigames/charge.js',
  'scripts/battle/minigames/balance.js',
  'scripts/battle/minigames/slingshot.js',
  'scripts/battle/minigames/sharpshooter.js',
  'scripts/battle/minigames/freezeframe.js',
  'scripts/battle/minigames/glider.js',
  'scripts/battle/minigames/iceslide.js',
  'scripts/battle/minigames/paddle.js',
  'scripts/battle/minigames/sonicring.js',
  'scripts/battle/minigames/divedodge.js',
  'scripts/battle/minigames/clawdrop.js',
  'scripts/battle/minigames/hotfloor.js',
  'scripts/battle/minigames/snaketrail.js',
  'scripts/battle/minigames/unwind.js',
  'scripts/battle/minigames/trace.js',
  'scripts/battle/minigames/kingfight.js',
  'scripts/battle/minigames/boss.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(CORE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* same-origin GET → stale-while-revalidate; everything else (Google Fonts,
   Firebase) goes straight to the network untouched. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req)
      .then(res => { if (res && res.ok) c.put(req, res.clone()); return res; })
      .catch(() => null);
    if (hit) return hit;
    const fresh = await net;
    if (fresh) return fresh;
    if (req.mode === 'navigate') {
      const shell = await c.match('index.html');
      if (shell) return shell;
    }
    return Response.error();
  }));
});
