// Offline-first service worker. Everything needed to play the 13 main worlds is cached on install.
// Online-only extras (packs/) always come from the network so new bonus content shows up without an app update.
const VERSION = 'mb-v1.9.0';
const LOCAL = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-180.png', './icons/icon-maskable-192.png', './icons/icon-maskable-512.png',
  './js/main.js', './js/config.js', './js/save.js', './js/audio.js', './js/input.js', './js/world.js', './js/worlds.js',
  './js/models.js', './js/fx.js', './js/enemies.js', './js/weapons.js', './js/items.js', './js/hud.js', './js/player.js',
  './js/map.js', './js/warp.js', './js/online.js', './js/net.js', './js/mp.js', './js/vfx.js',
];
const REMOTE = [
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@800;900&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSION);
    await c.addAll(LOCAL);
    await Promise.all(REMOTE.map(async u => {
      try {
        const r = await fetch(u, { mode: 'cors' }); if (!r.ok) return; await c.put(u, r.clone());
        if (u.includes('fonts.googleapis')) { const css = await r.text(); const files = [...css.matchAll(/url\((https:[^)]+)\)/g)].map(m => m[1]); await Promise.all(files.map(f => fetch(f, { mode: 'cors' }).then(x => x.ok && c.put(f, x)).catch(() => {}))); }
      } catch (err) {}
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERSION) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/packs/')) { e.respondWith(fetch(req).catch(() => new Response('{"offline":true}', { status: 503, headers: { 'Content-Type': 'application/json' } }))); return; }
  e.respondWith((async () => {
    const c = await caches.open(VERSION);
    const hit = await c.match(req, { ignoreSearch: req.mode === 'navigate' });
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') return (await c.match('./index.html')) || Response.error();
    return Response.error();
  })());
});
