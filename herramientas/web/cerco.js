// Fuente única del cerco para TODAS las secciones (mapa y editor).
//
//   1. La nube (Supabase, doc cerco/red) es la verdad.
//   2. /datos/cerco.json es la copia de la nube al momento de publicar: la usa quien no tiene sesión o no tiene señal.
//   3. En el dispositivo hay UNA sola copia (localStorage "cerco-red"), compartida por mapa y editor.
//      Recuerda de qué versión de la nube salió ("base"), para que una copia vieja nunca tape una más nueva.
(() => {
  'use strict';
  const CLAVE = 'cerco-red', RESPALDO = 'cerco-red-respaldo', VIEJAS = ['cerco-editor-v3', 'cerco-mapa-red'];
  const valida = j => j && j.net && Array.isArray(j.net.wires) ? j : null;
  const leer = k => { try { return valida(JSON.parse(localStorage.getItem(k) || 'null')); } catch (e) { return null; } };
  const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  function leerLocal() { return leer(CLAVE) || leer(VIEJAS[0]); }   // la clave vieja del editor se lee una vez y se migra
  function escribirLocal(o) {
    try { localStorage.setItem(CLAVE, JSON.stringify({net: o.net, savedAt: o.savedAt, base: o.base || 0})); VIEJAS.forEach(k => localStorage.removeItem(k)); } catch (e) {}
  }
  const pendientes = l => !!l && (l.savedAt || 0) > (l.base || 0) + 1;   // editada aquí después de su última sincronización
  function respaldar(l) { try { localStorage.setItem(RESPALDO, JSON.stringify(l)); } catch (e) {} }

  async function publicada() {
    try { const r = await fetch('/datos/cerco.json', {cache: 'no-cache'}); if (r.ok) return valida(await r.json()); } catch (e) {}
    return null;
  }
  // La copia del dispositivo solo vale si salió de una versión de la nube igual o más nueva que la publicada.
  function elegir(pub, l) {
    if (l && l.base && (!pub || l.base >= (pub.savedAt || 0))) return {net: l.net, savedAt: l.savedAt, base: l.base, desde: 'dispositivo'};
    if (pub) return {net: pub.net, savedAt: pub.savedAt || 0, base: pub.savedAt || 0, desde: 'publicada', descartada: l && !igual(l.net, pub.net) ? l : null, respaldar: !!(l && pendientes(l) && !igual(l.net, pub.net))};
    return l ? {net: l.net, savedAt: l.savedAt, base: l.base || 0, desde: 'dispositivo'} : null;
  }
  async function inicial() {
    const r = elegir(await publicada(), leerLocal());
    if (r && r.descartada) { if (r.respaldar) respaldar(r.descartada); escribirLocal({net: r.net, savedAt: r.base, base: r.base}); }
    return r;
  }

  const conTiempo = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('tiempo')), ms))]);
  async function nube() {   // {doc, remota} o null si no hay sesión o conexión
    try {
      const use = window.claude && window.claude.use ? window.claude.use('db') : null;
      const db = use ? await Promise.race([use, new Promise(r => setTimeout(() => r(null), 8000))]) : null;
      if (!db) return null;
      const doc = db.doc('cerco/red'), snap = await conTiempo(doc.get(), 10000), d = snap.exists ? snap.data() : null;
      return {doc, remota: valida(d)};
    } catch (e) { return {doc: null, remota: null, error: e}; }
  }
  // Guarda en el dispositivo una versión que vino de la nube. Si aquí había cambios sin subir que no salen de esa versión, se respaldan.
  function tomarDeNube(remota) {
    const l = leerLocal();
    const respaldada = !!(l && pendientes(l) && l.base !== remota.savedAt && !igual(l.net, remota.net));
    if (respaldada) respaldar(l);
    escribirLocal({net: remota.net, savedAt: remota.savedAt, base: remota.savedAt});
    return respaldada;
  }

  window.Cerco = {leerLocal, escribirLocal, pendientes, respaldar, publicada, elegir, inicial, nube, tomarDeNube, igual};
})();
