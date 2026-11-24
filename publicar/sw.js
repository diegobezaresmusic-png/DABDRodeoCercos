// Service worker: la app abre al instante y funciona sin señal en el campo.
// Todo sale primero de lo guardado en el teléfono. Las páginas y el cerco se actualizan por detrás para la próxima vez;
// la búsqueda de cambios del cerco (?fresco) va directo a internet. Una versión nueva de la app se instala sola y avisa.
const VERSION = 'd95d914840f6';
const CACHE = 'cerco-' + VERSION;
const PRECARGA = ["/", "/manifest.webmanifest", "/datos/cerco.json", "/datos/rancho.jpg", "/cerco.js", "/red-mapa.js", "/fallas.js", "/fallas-mapa.js", "/mapa/", "/fallas/", "/editor/", "/config.js", "/nube.js", "/iconos/apple-touch-icon.png", "/iconos/icono-192.png", "/iconos/icono-512.png", "/iconos/icono-maskable-192.png", "/iconos/icono-maskable-512.png", "/iconos/logo.png"];

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

  const guardar = (clave, r) => { if (r && r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(clave, copia)); } return r; };
  if (url.pathname === '/datos/cerco.json' && url.searchParams.has('fresco')) {   // buscar cambios: directo a internet
    e.respondWith(fetch(req).then(r => guardar('/datos/cerco.json', r)));
    return;
  }
  if (req.mode === 'navigate' || req.destination === 'document' || url.pathname === '/datos/cerco.json') {
    const red = fetch(req).then(r => guardar(req, r));   // por detrás, para la próxima vez
    e.waitUntil(red.catch(() => {}));
    e.respondWith(caches.match(req, {ignoreSearch: true}).then(hit => hit || red.catch(() => caches.match('/'))));
    return;
  }
  e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
    if (res.ok || res.type === 'opaque') { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
    return res;
  })));
});
