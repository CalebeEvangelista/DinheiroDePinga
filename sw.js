// Troque a versão a cada deploy para forçar a atualização do cache
const CACHE = 'dinheiro-de-pinga-v2';
const FB = 'https://www.gstatic.com/firebasejs/10.13.0/';
const ASSETS = [
  './', './index.html', './manifest.json', './favicon.png', './apple-touch-icon.png',
  './icon-192.png', './icon-512.png', './icon-512-maskable.png',
  FB + 'firebase-app.js', FB + 'firebase-auth.js', FB + 'firebase-firestore.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(ASSETS.map((u) => cache.add(u).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // nunca cachear chamadas do Firestore/Auth (dados em tempo real)
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('firebaseapp.com')) return;

  // bibliotecas versionadas e fontes/ícones: cache primeiro
  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok || res.type === 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }))
    );
    return;
  }

  // arquivos do app: rede primeiro, cache como fallback (offline)
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
