// Service worker: guarda o jogo no aparelho para abrir sem internet.
// VERSION e ASSETS são gerados por `node tools/stamp.mjs` — não edite à mão.
// @stamp-start
const VERSION = 'd2064cbb38d9';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icon-180.png',
  'icon-512.png',
  'src/art.js',
  'src/audio.js',
  'src/board.js',
  'src/boxes.js',
  'src/game.js',
  'src/levels.js',
  'src/main.js',
  'src/render.js',
  'src/solver.js'
];
// @stamp-end

const CACHE = `formigas-${VERSION}`;
const FONTS = 'formigas-fontes';

self.addEventListener('install', (event) => {
  // baixa a versão inteira antes de assumir: nunca mistura arquivo velho com novo
  // cache: 'reload' pula o cache HTTP do servidor, que poderia devolver arquivo de versão anterior
  const reqs = ASSETS.map((u) => new Request(u, { cache: 'reload' }));
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(reqs)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // fonte do Google: guarda na primeira vez, depois usa a cópia
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONTS).then(async (c) => {
        const hit = await c.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        c.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true })
        || (req.mode === 'navigate' ? await c.match('./index.html') : null);
      return hit || fetch(req);
    }),
  );
});
