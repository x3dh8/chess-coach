// Works offline: keeps a copy of the app and Stockfish on the phone.
const V = 'chess-v3';
const BASE = new URL('./', self.location).pathname;
const FILES = ['./', 'index.html', 'app.js', 'board.js', 'pieces.js', 'rules.js', 'book.js', 'engine.js', 'bots.js', 'people.js', 'faces.js', 'analysis.js', 'openings.js', 'sound.js', 'review.js', 'puzzles.js', 'puzzles-data.js', 'manifest.json', 'icon-180.png', 'icon-192.png', 'engine/stockfish-18-lite-single.js', 'engine/stockfish-18-lite-single.wasm'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(FILES)).then(() => self.skipWaiting())) });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k.startsWith('chess-')).map(k => caches.delete(k)))).then(() => self.clients.claim())) });
// Network first (so updates show up), the saved copy when offline.
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(BASE)) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(V).then(x => x.put(e.request, c)) } return r }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
