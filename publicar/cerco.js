// Fuente única del cerco para TODAS las secciones (mapa y editor).
//
//   1. La nube (Supabase, doc cerco/red) es la verdad.
//   2. /datos/cerco.json es la copia de la nube al momento de publicar: la usa quien no tiene sesión o no tiene señal.
//   3. En el dispositivo hay UNA sola copia (localStorage "cerco-red"), compartida por mapa y editor.
//      Recuerda de qué versión de la nube salió ("base"), para que una copia vieja nunca tape una más nueva.
//
// Rapidez: si el dispositivo ya tiene el cerco, se muestra al instante y los cambios se buscan por detrás.
// Solo cuando no hay nada guardado se espera a internet, con pantalla de "Cargando…" y, si no contesta, "Sin respuesta · Reintentar".
(() => {
  'use strict';
  const CLAVE = 'cerco-red', RESPALDO = 'cerco-red-respaldo', VIEJAS = ['cerco-editor-v3', 'cerco-mapa-red'];
  const LIMITE = 10000;   // ms que se espera a internet antes de decir "Sin respuesta"
  const valida = j => j && j.net && Array.isArray(j.net.wires) ? j : null;
  const leer = k => { try { return valida(JSON.parse(localStorage.getItem(k) || 'null')); } catch (e) { return null; } };
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function leerLocal() { return leer(CLAVE) || leer(VIEJAS[0]); }   // la clave vieja del editor se lee una vez y se migra
  function escribirLocal(o) {
    try { localStorage.setItem(CLAVE, JSON.stringify({net: o.net, savedAt: o.savedAt, base: o.base || 0})); VIEJAS.forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }
  const pendientes = l => !!l && (l.savedAt || 0) > (l.base || 0) + 1;   // editada aquí después de su última sincronización
  function respaldar(l) { try { localStorage.setItem(RESPALDO, JSON.stringify(l)); } catch (e) {} }
  const haySesion = () => { try { return !!localStorage.getItem('cerco-sesion'); } catch (e) { return false; } };

  /* ---------- avisos en pantalla (los mismos en todas las secciones) ---------- */
  const CSS = `.cz-capa{position:fixed;inset:0;z-index:9000;display:grid;place-items:center;background:rgba(10,16,13,.72);backdrop-filter:blur(2px);font:16px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#EEF2EC}
.cz-caja{display:grid;justify-items:center;gap:14px;max-width:min(86vw,340px);padding:26px 22px;border-radius:18px;background:#15201A;box-shadow:0 12px 40px rgba(0,0,0,.4);text-align:center}
.cz-caja p{margin:0}.cz-caja small{color:#A3AFA6;font-size:14px}
.cz-giro{width:34px;height:34px;border-radius:50%;border:3.5px solid rgba(255,255,255,.18);border-top-color:#FFC93C;animation:cz-giro .8s linear infinite}
.cz-pastilla{position:fixed;z-index:8999;left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 16px);display:flex;gap:10px;align-items:center;max-width:min(92vw,440px);padding:9px 10px 9px 14px;border-radius:14px;background:#15201A;color:#EEF2EC;font:14px/1.35 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;box-shadow:0 8px 28px rgba(0,0,0,.35)}
.cz-pastilla .cz-giro{width:16px;height:16px;border-width:2.5px;flex:none}
.cz-boton{flex:none;border:0;border-radius:10px;padding:10px 14px;background:#FFC93C;color:#1B1503;font:700 15px system-ui,sans-serif;cursor:pointer}
.cz-x{flex:none;border:0;background:none;color:inherit;font-size:20px;line-height:1;padding:4px 6px;cursor:pointer}
.cz-pastilla.cz-arriba{bottom:auto;top:calc(env(safe-area-inset-top,0px) + 64px)}
@keyframes cz-giro{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){.cz-giro{animation-duration:2.4s}}`;
  function estilos() { if (document.getElementById('cz-estilos')) return; const s = document.createElement('style'); s.id = 'cz-estilos'; s.textContent = CSS; document.head.appendChild(s); }
  const poner = n => { estilos(); (document.body || document.documentElement).appendChild(n); return n; };
  const quitar = cls => document.querySelectorAll('.' + cls).forEach(n => n.remove());

  // Pantalla completa: mientras se descarga el cerco por primera vez, o cuando no hubo respuesta.
  function pantalla(tipo, alReintentar) {
    quitar('cz-capa'); if (!tipo) return;
    const c = document.createElement('div'); c.className = 'cz-capa'; c.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    c.innerHTML = tipo === 'error'
      ? '<div class="cz-caja"><p><b>Sin respuesta</b></p><small>No se pudo descargar el mapa. Revisa tu señal e inténtalo otra vez.</small><button type="button" class="cz-boton">Reintentar</button></div>'
      : '<div class="cz-caja"><div class="cz-giro" aria-hidden="true"></div><p>Cargando el mapa…</p></div>';
    if (tipo === 'error') c.querySelector('button').onclick = alReintentar;
    poner(c);
    if (tipo === 'error') c.querySelector('button').focus();
  }
  // Pastilla abajo, sin estorbar: "Buscando cambios…", "Sin respuesta · Reintentar", "El cerco cambió · Actualizar".
  function aviso(texto, op = {}) {
    quitar('cz-pastilla'); if (!texto) return null;
    const d = document.createElement('div'); d.className = 'cz-pastilla' + (op.arriba ? ' cz-arriba' : ''); d.setAttribute('role', 'status');
    if (op.cargando) d.insertAdjacentHTML('beforeend', '<div class="cz-giro" aria-hidden="true"></div>');
    const t = document.createElement('span'); t.textContent = texto; d.appendChild(t);
    if (op.boton) { const b = document.createElement('button'); b.type = 'button'; b.className = 'cz-boton'; b.textContent = op.boton; b.onclick = () => { d.remove(); op.accion(); }; d.appendChild(b); }
    if (op.cerrar !== false && !op.cargando) { const x = document.createElement('button'); x.type = 'button'; x.className = 'cz-x'; x.setAttribute('aria-label', 'Cerrar'); x.textContent = '×'; x.onclick = () => d.remove(); d.appendChild(x); }
    poner(d);
    if (op.duracion) setTimeout(() => d.remove(), op.duracion);
    return d;
  }

  /* ---------- descargas con límite de tiempo ---------- */
  async function publicada(op = {}) {   // op.fresca: pasar por encima de lo guardado e ir a internet
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), LIMITE);
    try {
      const r = await fetch('/datos/cerco.json' + (op.fresca ? '?fresco=' + Date.now() : ''), {cache: op.fresca ? 'no-store' : 'default', signal: ctl.signal});
      return r.ok ? valida(await r.json()) : null;
    } catch (e) { return null; } finally { clearTimeout(t); }
  }
  const conTiempo = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('tiempo')), ms))]);
  // {doc, remota} con sesión; null sin sesión; {error} si hay sesión pero no hubo respuesta
  async function nube() {
    try {
      const use = window.claude && window.claude.use ? window.claude.use('db') : null;
      const db = use ? await Promise.race([use, new Promise(r => setTimeout(() => r(null), LIMITE))]) : null;
      if (!db) return haySesion() ? {doc: null, remota: null, error: new Error('sin respuesta')} : null;
      const doc = db.doc('cerco/red'), snap = await conTiempo(doc.get(), LIMITE), d = snap.exists ? snap.data() : null;
      return {doc, remota: valida(d)};
    } catch (e) { return {doc: null, remota: null, error: e}; }
  }

  /* ---------- qué cerco usar ---------- */
  // La copia del dispositivo solo vale si salió de una versión de la nube igual o más nueva que la publicada.
  function elegir(pub, l) {
    if (l && l.base && (!pub || l.base >= (pub.savedAt || 0))) return {net: l.net, savedAt: l.savedAt, base: l.base, desde: 'dispositivo'};
    if (pub) return {net: pub.net, savedAt: pub.savedAt || 0, base: pub.savedAt || 0, desde: 'publicada', descartada: l && !igual(l.net, pub.net) ? l : null, respaldar: !!(l && pendientes(l) && !igual(l.net, pub.net))};
    return l ? {net: l.net, savedAt: l.savedAt, base: l.base || 0, desde: 'dispositivo'} : null;
  }
  // El cerco para dibujar YA. Con copia en el dispositivo: al instante. Sin copia: "Cargando…" y, si falla, "Sin respuesta · Reintentar".
  async function inicial() {
    const l = leerLocal();
    if (l && l.base) return elegir(null, l);
    let r = null;
    const t = setTimeout(() => pantalla('cargando'), 250);   // si tarda, que se note que está cargando
    for (let intento = 0; !r; intento++) {
      // al reintentar se pide con dirección única: así no queda en fila detrás de una descarga anterior que se quedó colgada
      const pub = await publicada({fresca: intento > 0});
      if (pub) r = elegir(pub, l);
      else { clearTimeout(t); await new Promise(ok => pantalla('error', () => { pantalla('cargando'); ok(); })); }
    }
    clearTimeout(t); pantalla(null);
    if (r.descartada) { if (r.respaldar) respaldar(r.descartada); escribirLocal({net: r.net, savedAt: r.base, base: r.base}); }
    else if (r.desde === 'publicada') escribirLocal({net: r.net, savedAt: r.base, base: r.base});
    return r;
  }
  // Guarda en el dispositivo una versión que vino de la nube. Si aquí había cambios sin subir que no salen de esa versión, se respaldan.
  function tomarDeNube(remota) {
    const l = leerLocal();
    const respaldada = !!(l && pendientes(l) && l.base !== remota.savedAt && !igual(l.net, remota.net));
    if (respaldada) respaldar(l);
    escribirLocal({net: remota.net, savedAt: remota.savedAt, base: remota.savedAt});
    return respaldada;
  }
  // Por detrás: ¿hay una versión más nueva que la que se está mostrando? (en la nube o en la publicada)
  // Devuelve {nueva} si la hay (ya guardada en el dispositivo), {} si no, o {error} si no hubo respuesta.
  async function buscarCambios(actual, n) {
    n = n === undefined ? await nube() : n;
    const pub = await publicada({fresca: true});
    if ((!n || n.error) && !pub) return {error: true};
    const candidatas = [n && n.remota, pub].filter(Boolean).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
    const mejor = candidatas[0];
    if (mejor && (mejor.savedAt || 0) > (actual.base || 0) && !igual(mejor.net, actual.net)) { tomarDeNube(mejor); return {nueva: mejor, nube: n}; }
    return {nube: n, error: !!(n && n.error)};
  }

  window.Cerco = {leerLocal, escribirLocal, pendientes, respaldar, publicada, elegir, inicial, nube, tomarDeNube, buscarCambios, igual, aviso, pantalla};
})();
