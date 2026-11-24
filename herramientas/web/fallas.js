// Fallas del cerco: datos compartidos por la sección de Fallas, el mapa y el inicio.
//
//   nube (Supabase): colección "fallas" (una falla por documento) y colección "fotos" (la foto aparte, para que la
//   lista cargue rápido y la foto solo se baje al abrir la falla).
//   dispositivo: una copia de todas las fallas (se ven al instante y sin señal) y una fila de "por subir".
//
// En el campo casi nunca hay señal: reportar o reparar siempre guarda primero en el teléfono, y se sube sola
// en cuanto hay internet (al abrir la app, al volver a ella o cuando regresa la señal).
(() => {
  'use strict';
  const K_COPIA = 'cerco-fallas', K_COLA = 'cerco-fallas-cola', K_NOMBRE = 'cerco-nombre', K_FOTO = 'cerco-foto-';
  const LIMITE = 10000;

  /* ---------- tipos de falla ----------
     efecto: corte      -> lo que sigue después de la falla se queda sin corriente
             descarga   -> la corriente baja en todo el circuito (el alambre toca tierra)
             energizador-> todo el circuito de ese energizador sin corriente
             fisico     -> daño sin efecto en la corriente */
  const TIPOS = [
    {id: 'alambre', nombre: 'Alambre roto', efecto: 'corte',
      icono: '<path d="M2 13h6.5M15.5 11H22"/><path d="m8.5 13 2-3 1.5 3.5 2-4 1.5 1.5" stroke-width="1.8"/>'},
    {id: 'poste', nombre: 'Poste caído', efecto: 'descarga',
      icono: '<path d="M3 20h18"/><path d="m7 19 9-13"/><path d="M10.5 11.5 14 14M13 7.8l3 2.2"/>'},
    {id: 'aislador', nombre: 'Aislador roto', efecto: 'descarga',
      icono: '<path d="M12 3v18"/><rect x="7.5" y="7" width="9" height="6" rx="2"/><path d="m10 7 1.5 3-1 3M3 10h4.5M16.5 10H21"/>'},
    {id: 'hierba', nombre: 'Hierba o rama tocando', efecto: 'descarga',
      icono: '<path d="M2 8h20"/><path d="M6 21c0-5 1-9 3-12M12 21V7M18 21c0-5-1-9-3-12"/><path d="M12 12c-2-1-3-3-3-5M12 15c2-1 3.5-3 3.5-5"/>'},
    {id: 'baja', nombre: 'Corriente baja', efecto: 'descarga',
      icono: '<path d="M11 2 4 13h6l-1 9 7-11h-6z"/><path d="M19 14v7M16.5 18.5 19 21l2.5-2.5"/>'},
    {id: 'sin', nombre: 'Sin corriente', efecto: 'corte',
      icono: '<path d="M11 2 4 13h6l-1 9 7-11h-6z"/><path d="m3 3 18 18"/>'},
    {id: 'puerta', nombre: 'Puerta dañada', efecto: 'fisico',
      icono: '<rect x="3" y="6" width="18" height="13" rx="1.5"/><path d="M8 6v13M16 6v13M3 12.5h18"/><path d="m17 2 4 4M21 2l-4 4" stroke-width="1.8"/>'},
    {id: 'switch', nombre: 'Switch dañado', efecto: 'corte',
      icono: '<circle cx="12" cy="13" r="7"/><path d="m9 15.5 6-5"/><path d="M12 2v3" stroke-width="2.4"/>'},
    {id: 'energizador', nombre: 'Energizador apagado', efecto: 'energizador',
      icono: '<rect x="3" y="5" width="18" height="15" rx="2.5"/><path d="M12 8.5v4.5"/><path d="M8.6 10.3a4.8 4.8 0 1 0 6.8 0"/>'},
  ];
  const TIPO = Object.fromEntries(TIPOS.map(t => [t.id, t]));
  const URGENCIA = {corte: 0, energizador: 0, descarga: 1, fisico: 2};
  const tipoDe = f => TIPO[f && f.tipo] || {id: 'otro', nombre: 'Falla', efecto: 'fisico', icono: '<circle cx="12" cy="12" r="8"/>'};
  const iconoSvg = (t, clase) => `<svg class="${clase || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t.icono}</svg>`;

  /* ---------- copia en el dispositivo ---------- */
  const leerJ = (k, def) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? def : v; } catch (e) { return def; } };
  const ponerJ = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  let copia = leerJ(K_COPIA, {});          // {id: falla}
  let cola = leerJ(K_COLA, []);            // [{id, foto?:'id-de-foto'}]  lo que falta subir
  const lista = () => Object.keys(copia).map(id => Object.assign({id}, copia[id]));
  const pendientes = () => lista().filter(f => f.estado !== 'reparada');

  const nombre = () => { try { return localStorage.getItem(K_NOMBRE) || ''; } catch (e) { return ''; } };
  const ponerNombre = n => { try { localStorage.setItem(K_NOMBRE, n); } catch (e) {} };
  const nuevoId = () => 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  /* ---------- nube ---------- */
  const oyentes = new Set();
  let db = null, conectando = null, enNube = false, sinSesion = false, subiendo = false, errorNube = null;
  const avisar = () => oyentes.forEach(f => { try { f(estado()); } catch (e) { console.warn(e); } });
  const estado = () => ({fallas: lista(), porSubir: cola.length, enNube, sinSesion, errorNube});
  const conTiempo = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('sin respuesta')), ms))]);

  function conectar() {
    if (conectando) return conectando;
    conectando = (async () => {
      try {
        const use = window.claude && window.claude.use ? window.claude.use('db') : null;
        db = use ? await Promise.race([use, new Promise(r => setTimeout(() => r(null), LIMITE))]) : null;
      } catch (e) { db = null; }
      let hay = false; try { hay = !!localStorage.getItem('cerco-sesion'); } catch (e) {}
      sinSesion = !db && !hay;
      if (!db) { errorNube = hay ? 'sin respuesta' : null; avisar(); conectando = null; return null; }
      enNube = true; errorNube = null;
      db.collection('fallas').onSnapshot(snap => {
        const nuevas = {};
        snap.docs.forEach(d => { nuevas[d.id] = d.data(); });
        cola.forEach(c => { if (copia[c.id]) nuevas[c.id] = copia[c.id]; });   // lo que aún no se sube manda
        copia = nuevas; ponerJ(K_COPIA, copia); errorNube = null; avisar();
      }, () => { errorNube = 'sin respuesta'; avisar(); });
      subir();
      return db;
    })();
    return conectando;
  }

  async function subir() {
    if (!db || subiendo || !cola.length) return;
    subiendo = true;
    try {
      while (cola.length) {
        const c = cola[0];
        if (c.foto) {
          const img = leerFoto(c.foto);
          if (img) await conTiempo(db.doc('fotos/' + c.foto).set({img}), 30000);
        } else if (c.borrar) {
          await conTiempo(db.doc('fallas/' + c.id).delete(), LIMITE);
          try { await db.doc('fotos/' + c.id).delete(); await db.doc('fotos/' + c.id + '-r').delete(); } catch (e) {}
        } else if (copia[c.id]) {
          await conTiempo(db.doc('fallas/' + c.id).set(copia[c.id]), LIMITE);
        }
        cola.shift(); ponerJ(K_COLA, cola); avisar();
      }
      errorNube = null;
    } catch (e) {
      errorNube = 'sin respuesta';
      console.warn('Fallas: no se pudo subir', e && e.message);
    } finally { subiendo = false; avisar(); }
  }
  addEventListener('online', () => { conectar(); subir(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') subir(); });

  /* ---------- fotos ---------- */
  const leerFoto = id => { try { return localStorage.getItem(K_FOTO + id); } catch (e) { return null; } };
  // Reduce la foto para que pese poco (unos 100–200 KB) y se pueda subir con poca señal.
  function comprimir(archivo, lado = 1280, calidad = 0.7) {
    return new Promise((ok, mal) => {
      const url = URL.createObjectURL(archivo), img = new Image();
      img.onload = () => {
        const k = Math.min(1, lado / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', calidad));
      };
      img.onerror = () => { URL.revokeObjectURL(url); mal(new Error('No se pudo leer la foto')); };
      img.src = url;
    });
  }
  async function foto(id) {
    const local = leerFoto(id);
    if (local) return local;
    const base = await conectar();
    if (!base) return null;
    try { const s = await conTiempo(base.doc('fotos/' + id).get(), 20000); return s.exists ? s.data().img : null; }
    catch (e) { return null; }
  }

  /* ---------- guardar ---------- */
  // Devuelve {ok, soloAqui}: ok=false si el teléfono ya no tiene espacio para guardarla.
  function guardar(id, datos, fotoUrl, fotoId) {
    if (fotoUrl) {
      try { localStorage.setItem(K_FOTO + fotoId, fotoUrl); }
      catch (e) { return {ok: false, motivo: 'La foto no cabe en el teléfono. Guarda sin foto o sube primero lo pendiente.'}; }
    }
    copia[id] = datos;
    if (!ponerJ(K_COPIA, copia)) return {ok: false, motivo: 'El teléfono no tiene espacio para guardar.'};
    if (fotoUrl) cola.push({id, foto: fotoId});
    cola = cola.filter(c => c.foto || c.id !== id); cola.push({id});
    ponerJ(K_COLA, cola); avisar();
    conectar().then(subir);
    return {ok: true};
  }
  function reportar(f, fotoUrl) {
    const id = nuevoId();
    const n = lista().reduce((m, x) => Math.max(m, +x.n || 0), 0) + 1;
    const datos = Object.assign({n, estado: 'pendiente', creado: new Date().toISOString(), reporto: nombre(), foto: !!fotoUrl}, f);
    return Object.assign(guardar(id, datos, fotoUrl, id), {id});
  }
  function reparar(id, extra, fotoUrl) {
    const f = copia[id]; if (!f) return {ok: false, motivo: 'Esa falla ya no existe.'};
    const datos = Object.assign({}, f, {estado: 'reparada', reparado: new Date().toISOString(), reparo: nombre(), notaRep: extra.nota || '', fotoRep: !!fotoUrl});
    return guardar(id, datos, fotoUrl, id + '-r');
  }
  function reabrir(id) {
    const f = copia[id]; if (!f) return {ok: false};
    const datos = Object.assign({}, f, {estado: 'pendiente'}); delete datos.reparado; delete datos.reparo; delete datos.notaRep; delete datos.fotoRep;
    return guardar(id, datos);
  }
  function borrar(id) {
    delete copia[id]; ponerJ(K_COPIA, copia);
    cola = cola.filter(c => c.id !== id && c.foto !== id && c.foto !== id + '-r'); cola.push({id, borrar: true});
    try { localStorage.removeItem(K_FOTO + id); localStorage.removeItem(K_FOTO + id + '-r'); } catch (e) {}
    ponerJ(K_COLA, cola); avisar(); conectar().then(subir);
    return {ok: true};
  }
  // Cuando una foto ya está en la nube, se borra del teléfono para no llenarlo.
  function limpiarFotos() {
    const vivas = new Set(cola.filter(c => c.foto).map(c => c.foto));
    try { Object.keys(localStorage).forEach(k => { if (k.startsWith(K_FOTO) && !vivas.has(k.slice(K_FOTO.length)) && enNube) localStorage.removeItem(k); }); } catch (e) {}
  }

  function alCambiar(f) { oyentes.add(f); f(estado()); conectar(); return () => oyentes.delete(f); }
  oyentes.add(() => { if (!cola.some(c => c.foto)) limpiarFotos(); });

  window.Fallas = {TIPOS, TIPO, URGENCIA, tipoDe, iconoSvg, lista, pendientes, nombre, ponerNombre, comprimir, foto,
    reportar, reparar, reabrir, borrar, alCambiar, conectar, subir, estado};
})();
