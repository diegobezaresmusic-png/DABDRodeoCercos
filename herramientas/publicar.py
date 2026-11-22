# Genera la carpeta publicar/ que sube Cloudflare.
# Envuelve las páginas del mapa y del editor (construir.py) en un documento completo con los metadatos de PWA,
# y escribe UNA sola vez lo que comparten: datos/cerco.json (el cerco, bajado de la nube), datos/rancho.jpg (la foto)
# y cerco.js (cómo se carga el cerco). Además íconos, manifest y service worker.
#
# Uso (desde la raíz del proyecto):  python herramientas/publicar.py
import hashlib, json, shutil
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / 'publicar'
NOMBRE = 'Cerco del Rancho'
COLOR = '#15201A'

APPS = {
    'mapa':   {'titulo': 'Mapa del Cerco',   'scripts': ['/red-mapa.js']},
    'editor': {'titulo': 'Editor del Cerco', 'scripts': []},
}


def cabeza(titulo, scripts=()):
    return f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="{COLOR}">
<meta name="description" content="{titulo} — mapa y editor del cerco eléctrico del rancho.">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/iconos/icono-192.png" type="image/png">
<link rel="apple-touch-icon" href="/iconos/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Cerco">
<style>:root{{color-scheme:light dark}}body{{margin:0}}img{{max-width:100%}}[hidden]{{display:none!important}}</style>
<script src="/config.js"></script>
<script src="/nube.js"></script>
<script src="/cerco.js"></script>
''' + ''.join(f'<script src="{s}"></script>\n' for s in scripts) + '''</head>
<body>
'''


PIE = '''
<script>
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW', e)));
}
</script>
</body>
</html>
'''

INICIO = f'''<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="{COLOR}">
<title>{NOMBRE}</title>
<link rel="manifest" href="/manifest.webmanifest">
<link rel="icon" href="/iconos/icono-192.png" type="image/png">
<link rel="apple-touch-icon" href="/iconos/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Cerco">
<style>
:root{{--bg:#EEF2EE;--panel:#fff;--fg:#15201A;--muted:#55645A;--rule:#CBD5CC;--accent:#F2B705;--accent-fg:#1D1600;color-scheme:light}}
@media (prefers-color-scheme:dark){{:root{{--bg:#0F1311;--panel:#1A201C;--fg:#EEF2EC;--muted:#A3AFA6;--rule:#35403A;--accent:#FFC93C;--accent-fg:#1B1503;color-scheme:dark}}}}
*{{box-sizing:border-box}}
body{{margin:0;min-height:100dvh;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  display:grid;place-items:center;padding:max(24px,env(safe-area-inset-top)) 16px max(24px,env(safe-area-inset-bottom))}}
main{{width:100%;max-width:440px;display:grid;gap:14px}}
h1{{margin:0 0 4px;font-size:26px;display:flex;align-items:center;gap:10px}}
h1 img{{width:40px;height:40px;border-radius:10px}}
p{{margin:0;color:var(--muted)}}
a.op{{display:block;padding:18px 18px;border-radius:14px;background:var(--panel);border:1px solid var(--rule);color:inherit;text-decoration:none}}
a.op strong{{display:block;font-size:19px}}
a.op.pri{{background:var(--accent);color:var(--accent-fg);border-color:transparent}}
a.op.pri span{{color:inherit;opacity:.8}}
a.op span{{color:var(--muted);font-size:14px}}
a.op:focus-visible{{outline:3px solid var(--accent);outline-offset:3px}}
#instalar{{font-size:14px}}
.cuenta{{border-top:1px solid var(--rule);padding-top:14px;display:grid;gap:10px}}
.cuenta h2{{margin:0;font-size:16px}}
.cuenta form{{display:grid;gap:8px}}
.cuenta input{{font:inherit;padding:12px;border-radius:10px;border:1px solid var(--rule);background:var(--panel);color:var(--fg)}}
.cuenta button{{font:600 16px system-ui,sans-serif;padding:12px;border-radius:10px;border:1px solid var(--rule);background:var(--panel);color:var(--fg);cursor:pointer}}
.cuenta button.pri{{background:var(--accent);color:var(--accent-fg);border-color:transparent}}
.cuenta .err{{color:#D3261B}}
@media (prefers-color-scheme:dark){{.cuenta .err{{color:#FF6B5E}}}}
</style>
<script src="/config.js"></script>
<script src="/nube.js"></script>
</head>
<body>
<main>
  <h1><img src="/iconos/icono-192.png" alt="">{NOMBRE}</h1>
  <p>Elige qué quieres abrir.</p>
  <a class="op pri" href="/mapa/"><strong>Ver el mapa</strong><span>Circuitos, switches y correcciones.</span></a>
  <a class="op" href="/editor/"><strong>Editar el cerco</strong><span>Mover tramos, puertas y energizadores.</span></a>
  <p id="instalar"></p>
  <section class="cuenta" id="cuenta" hidden>
    <h2>Sincronizar entre dispositivos</h2>
    <p id="c-estado">Revisando…</p>
    <form id="c-form" hidden>
      <input id="c-correo" type="email" autocomplete="username" placeholder="Correo" required>
      <input id="c-clave" type="password" autocomplete="current-password" placeholder="Contraseña" required>
      <button class="pri" type="submit">Iniciar sesión</button>
      <p class="err" id="c-err" role="alert"></p>
    </form>
    <button type="button" id="c-salir" hidden>Cerrar sesión</button>
  </section>
</main>
<script>
const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const ya = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const t = document.getElementById('instalar');
if (!ya) t.textContent = ios
  ? 'Para instalarla: en Safari toca Compartir y luego "Agregar a pantalla de inicio".'
  : 'Para instalarla: en Chrome abre el menú ⋮ y toca "Instalar app".';
if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {{}}));
(async () => {{
  const N = window.CercoNube; if (!N || !N.configurada) return;
  const $ = id => document.getElementById(id);
  $('cuenta').hidden = false;
  const pintar = async () => {{
    let s = null; try {{ s = await N.sesion(); }} catch (e) {{ $('c-estado').textContent = 'Sin conexión. Puedes usar la app; se guardará en este dispositivo.'; return; }}
    $('c-form').hidden = !!s; $('c-salir').hidden = !s;
    $('c-estado').textContent = s ? 'Sesión iniciada como ' + s.user.email + '. Tus cambios se guardan en la nube.' : 'Sin sesión: los cambios se guardan solo en este dispositivo.';
  }};
  $('c-form').addEventListener('submit', async e => {{
    e.preventDefault(); $('c-err').textContent = '';
    try {{ await N.entrar($('c-correo').value.trim(), $('c-clave').value); $('c-clave').value = ''; }}
    catch (err) {{ $('c-err').textContent = /Invalid login/i.test(err.message) ? 'Correo o contraseña incorrectos.' : (err.message || 'No se pudo iniciar sesión.'); }}
    pintar();
  }});
  $('c-salir').addEventListener('click', async () => {{ await N.salir(); pintar(); }});
  pintar();
}})();
</script>
</body>
</html>
'''

# Cloudflare Pages lee este archivo para poner cabeceras HTTP.
HEADERS = '''/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=(self)

/sw.js
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache

/*.html
  Cache-Control: no-cache

/config.js
  Cache-Control: no-cache

/nube.js
  Cache-Control: no-cache

/cerco.js
  Cache-Control: no-cache

/red-mapa.js
  Cache-Control: no-cache

/datos/cerco.json
  Cache-Control: no-cache
'''

SW = '''// Service worker: la app funciona sin señal en el campo.
// HTML: primero la red (para ver cambios), si no hay señal usa la copia guardada.
// Imágenes, íconos y fuentes: primero la copia guardada.
const VERSION = '__VERSION__';
const CACHE = 'cerco-' + VERSION;
const PRECARGA = __PRECARGA__;

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
  const fuente = /(^|\\.)(fonts\\.googleapis\\.com|fonts\\.gstatic\\.com|cdn\\.jsdelivr\\.net)$/.test(url.hostname);
  if (url.origin !== location.origin && !fuente) return;  // p. ej. Supabase: siempre en vivo

  if (req.mode === 'navigate' || req.destination === 'document' || url.pathname === '/datos/cerco.json') {   // el cerco: siempre el más nuevo si hay señal
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
'''


def iconos(dest):
    from PIL import Image, ImageDraw
    dest.mkdir(parents=True, exist_ok=True)

    def dibujar(tam, margen):
        # Fondo oscuro, rayo ámbar y dos postes con alambre: "cerco eléctrico".
        im = Image.new('RGBA', (tam, tam), COLOR)
        d = ImageDraw.Draw(im)
        s = lambda v: margen + v * (tam - 2 * margen)
        ancho = max(2, round(tam * 0.035))
        for x in (0.14, 0.86):
            d.rounded_rectangle([s(x - 0.04), s(0.30), s(x + 0.04), s(0.92)], radius=ancho, fill='#C9D3CB')
        for y in (0.46, 0.66, 0.84):
            d.line([s(0.14), s(y), s(0.86), s(y)], fill='#8FA396', width=ancho)
        d.polygon([(s(0.58), s(0.06)), (s(0.30), s(0.56)), (s(0.48), s(0.56)),
                   (s(0.40), s(0.96)), (s(0.72), s(0.42)), (s(0.53), s(0.42))], fill='#F2B705')
        return im

    for tam in (192, 512):
        dibujar(tam, round(tam * 0.06)).save(dest / f'icono-{tam}.png')
        dibujar(tam, round(tam * 0.18)).save(dest / f'icono-maskable-{tam}.png')
    dibujar(180, 14).convert('RGB').save(dest / 'apple-touch-icon.png')


def main():
    from construir import paginas, cerco_de_la_nube
    anterior = SALIDA / 'datos' / 'cerco.json'
    cerco = cerco_de_la_nube() or (json.loads(anterior.read_text(encoding='utf-8')) if anterior.exists() else None)
    if not cerco:
        raise SystemExit('No hay cerco: ni en la nube ni en una publicación anterior.')
    if SALIDA.exists():
        shutil.rmtree(SALIDA)
    SALIDA.mkdir()
    archivos = ['/', '/manifest.webmanifest']

    # lo que comparten todas las secciones: una sola copia de cada cosa
    (SALIDA / 'datos').mkdir()
    (SALIDA / 'datos' / 'cerco.json').write_text(json.dumps(cerco, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    shutil.copy2(RAIZ / 'fuente' / 'rancho.jpg', SALIDA / 'datos' / 'rancho.jpg')
    for js in ('cerco.js', 'nube.js'):
        shutil.copy2(RAIZ / 'herramientas' / 'web' / js, SALIDA / js)
    shutil.copy2(RAIZ / 'fuente' / 'red-mapa.js', SALIDA / 'red-mapa.js')
    archivos += ['/datos/cerco.json', '/datos/rancho.jpg', '/cerco.js', '/red-mapa.js']

    for app, html in paginas().items():
        cfg = APPS[app]
        (SALIDA / app).mkdir()
        (SALIDA / app / 'index.html').write_text(cabeza(cfg['titulo'], cfg['scripts']) + html + PIE, encoding='utf-8')
        archivos.append(f'/{app}/')
    print(f"cerco publicado: {len(cerco['net']['wires'])} alambres")

    (SALIDA / 'index.html').write_text(INICIO, encoding='utf-8')
    cfg_ruta = RAIZ / 'config.nube.json'
    cfg = json.loads(cfg_ruta.read_text(encoding='utf-8')) if cfg_ruta.exists() else {}
    if 'service_role' in json.dumps(cfg) or str(cfg.get('clave', '')).startswith('sb_secret_'):
        raise SystemExit('config.nube.json tiene una clave secreta. Usa solo la clave publica (anon / publishable).')
    cfg = {k: cfg[k] for k in ('url', 'clave', 'proyecto') if cfg.get(k)}
    (SALIDA / 'config.js').write_text('window.CERCO_NUBE = ' + json.dumps(cfg) + ';\n', encoding='utf-8')
    archivos += ['/config.js', '/nube.js']
    iconos(SALIDA / 'iconos')
    archivos += [f'/iconos/{p.name}' for p in sorted((SALIDA / 'iconos').iterdir())]

    manifest = {
        'name': NOMBRE, 'short_name': 'Cerco', 'lang': 'es',
        'description': 'Mapa y editor del cerco eléctrico del rancho.',
        'id': '/', 'start_url': '/', 'scope': '/', 'display': 'standalone',
        'orientation': 'any', 'background_color': COLOR, 'theme_color': COLOR,
        'icons': [
            {'src': '/iconos/icono-192.png', 'sizes': '192x192', 'type': 'image/png'},
            {'src': '/iconos/icono-512.png', 'sizes': '512x512', 'type': 'image/png'},
            {'src': '/iconos/icono-maskable-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'maskable'},
            {'src': '/iconos/icono-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'},
        ],
        'shortcuts': [
            {'name': 'Ver el mapa', 'url': '/mapa/'},
            {'name': 'Editar el cerco', 'url': '/editor/'},
        ],
    }
    (SALIDA / 'manifest.webmanifest').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    (SALIDA / '_headers').write_text(HEADERS, encoding='utf-8')

    # La versión cambia cuando cambia cualquier archivo publicado: así el celular baja la nueva.
    h = hashlib.sha256()
    for p in sorted(SALIDA.rglob('*')):
        if p.is_file():
            h.update(p.relative_to(SALIDA).as_posix().encode()); h.update(p.read_bytes())
    sw = SW.replace('__VERSION__', h.hexdigest()[:12]).replace('__PRECARGA__', json.dumps(archivos))
    (SALIDA / 'sw.js').write_text(sw, encoding='utf-8')

    total = sum(p.stat().st_size for p in SALIDA.rglob('*') if p.is_file())
    print(f'publicar/ listo: {len(archivos)} recursos precargados, {total/1024:.0f} KB en total, nube ' + ('configurada' if cfg.get('url') else 'SIN configurar (solo telefono)'))


if __name__ == '__main__':
    main()
