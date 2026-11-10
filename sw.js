// Service worker: keeps a copy of every file so the installed app works offline.
// VERSION, FILES, AUDIO_VERSION, AUDIO and EXTRA are written by `node tools/sw-version.mjs`;
// a test fails if they're stale.

const VERSION = '084d033dbfab';
const AUDIO_VERSION = 'daf3c0d48ac4';
const FILES = [
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/icon.svg',
  '/',
  'manifest.webmanifest',
  'src/cycle.js',
  'src/main.js',
  'src/settings.js',
  'src/sound.js',
  'src/sounds.js',
  'styles.css',
];
// The sound files (about 0.5 MB each), cached apart and only when they change.
const AUDIO = [
  'audio/bonfire.mp3',
  'audio/night.mp3',
  'audio/rain.mp3',
  'audio/stream.mp3',
  'audio/thunderstorm.mp3',
];
// The shared theme and line-art library, pinned to a commit so they never change.
const EXTRA = [
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/theme.css',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/index.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/index.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/rng.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/color.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/space.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/flow-trails.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/wave-lines.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/harmonograph.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/gear-curves.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/rose.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/knot.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/wire-solids.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/attractor.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/times-tables.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/star-polygons.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/circle-lattice.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/star-tiling.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/rhomb-tiling.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/hyperbolic.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/voronoi.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/fractal-curves.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/meander.js',
  'https://cdn.jsdelivr.net/gh/nickprignano/prignano-theme@c799cd939ad41f46d0bf3863116e01cc2e573d58/art/styles/epicycles.js',
];
const CACHE = `vibes-${VERSION}`;
const AUDIO_CACHE = `vibes-audio-${AUDIO_VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // cache: 'reload' skips the browser's HTTP cache, so a new version never keeps old files.
      await cache.addAll(FILES.map((url) => new Request(url, { cache: 'reload' })));
      await Promise.allSettled(EXTRA.map((url) => cache.add(url)));
      // A sound file that fails to download is fetched when first played instead.
      const audio = await caches.open(AUDIO_CACHE);
      await Promise.allSettled(AUDIO.map(async (url) => (await audio.match(url)) || audio.add(new Request(url, { cache: 'reload' }))));
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE && key !== AUDIO_CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// The page posts this when Update is pressed.
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Every page is the one app page, cached as "/".
      const cached = request.mode === 'navigate'
        ? await cache.match('/')
        : await caches.match(request, { ignoreSearch: new URL(request.url).origin === location.origin });
      return cached || fetch(request);
    })(),
  );
});
