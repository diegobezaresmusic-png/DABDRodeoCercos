// Service worker: la app funciona sin señal en el campo.
// HTML: primero la red (para ver cambios), si no hay señal usa la copia guardada.
// Imágenes, íconos y fuentes: primero la copia guardada.
const VERSION = '3f4866fe764a';
const CACHE = 'cerco-' + VERSION;
const PRECARGA = ["/", "/manifest.webmanifest", "/mapa/", "/mapa/rancho.jpg", "/editor/", "/editor/rancho-cel.jpg", "/config.js", "/nube.js", "/iconos/apple-touch-icon.png", "/iconos/icono-192.png", "/iconos/icono-512.png", "/iconos/icono-maskable-192.png", "/iconos/icono-maskable-512.png"];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.startsWith('cerco-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fuente = /(^|\.)(fonts\.googleapis\.com|fonts\.gstatic\.com|cdn\.jsdelivr\.net)$/.test(url.hostname);
  if (url.origin !== location.origin && !fuente) return;  // p. ej. Supabase: siempre en vivo

  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(fetch(req)
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(req, copia)); return r; })
      .catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('/'))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return res;
  })));
});
