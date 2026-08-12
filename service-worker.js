/* Battle of the Realm — offline-capable service worker.
   App shell (HTML/JS/CSS/data) is NETWORK-FIRST so new versions apply on
   the next load, falling back to cache offline. Heavy media (creature art,
   audio) is cache-first with a background refresh. Bump CACHE on breaking
   changes to flush old caches. */

const CACHE = 'botr-v20';

const CORE = [
  './',
  'index.html',
  'styles/battle.css',
  'manifest.webmanifest',
  'assets/img/icons/favicon.png',
  'assets/img/icons/icon-192.png',
  'assets/img/icons/apple-touch-icon.png',
  'scripts/data/pets.json',
  'assets/audio/sfx/manifest.json',
  'scripts/battle/main.js',
  'scripts/battle/data.js',
  'scripts/battle/state.js',
  'scripts/battle/util.js',
  'scripts/battle/leaderboard.js',
  'scripts/battle/meta.js',
  'scripts/battle/collection.js',
  'scripts/battle/viewer.js',
  'scripts/vendor/three.module.min.js',
  'scripts/vendor/three.core.min.js',
  'scripts/vendor/loaders/GLTFLoader.js',
  'scripts/vendor/utils/BufferGeometryUtils.js',
  'scripts/vendor/utils/SkeletonUtils.js',
  'scripts/vendor/controls/OrbitControls.js',
  'scripts/vendor/environments/RoomEnvironment.js',
  'scripts/vendor/libs/meshopt_decoder.module.js',
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
  'scripts/battle/minigames/boss.js',
  'scripts/battle/minigames/bossduel.js',
  'scripts/battle/minigames/pedalrace.js',
  'scripts/battle/minigames/ropejump.js',
  'scripts/battle/minigames/slabgap.js',
  'scripts/battle/minigames/pitchwail.js',
  'scripts/battle/minigames/cloudrun.js',
  'scripts/battle/minigames/screech.js',
  'scripts/battle/minigames/reelin.js'
];

/* the app shell: anything that defines game logic or layout */
const isShell = url =>
  url.pathname.endsWith('/') ||
  /\.(html|js|css|json|webmanifest)$/.test(url.pathname);

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

/* the display fonts come from Google Fonts — cache them so an installed
   game keeps its look offline (opaque responses are fine to cache) */
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    if (FONT_HOSTS.includes(url.hostname)) {
      e.respondWith(caches.open(CACHE).then(async c => {
        const hit = await c.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone());
          return res;
        } catch { return Response.error(); }
      }));
    }
    return;   // Firebase & co → straight to network
  }

  e.respondWith(caches.open(CACHE).then(async c => {
    if (isShell(url)) {
      // network-first: always current when online, cached when offline
      try {
        const res = await fetch(req);
        if (res && res.ok) c.put(req, res.clone());
        return res;
      } catch {
        const hit = await c.match(req);
        if (hit) return hit;
        if (req.mode === 'navigate') {
          const shell = await c.match('index.html');
          if (shell) return shell;
        }
        return Response.error();
      }
    }
    // media: cache-first with a silent background refresh
    const hit = await c.match(req);
    const net = fetch(req)
      .then(res => { if (res && res.ok) c.put(req, res.clone()); return res; })
      .catch(() => null);
    return hit || (await net) || Response.error();
  }));
});
