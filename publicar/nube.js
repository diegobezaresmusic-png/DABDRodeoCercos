// Conecta el mapa y el editor con Supabase.
//
// El mapa y el editor ya saben guardar en una "base compartida" a través de window.claude.use('db')
// (la interfaz de Artifacts de Claude). Este archivo ofrece esa misma interfaz, pero con Supabase.
// Sin configuración (config.js vacío), o sin sesión iniciada, no hace nada y la app guarda en el teléfono.
(() => {
  'use strict';
  const cfg = window.CERCO_NUBE || {};
  const LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
  const configurada = !!(cfg.url && cfg.clave);

  let cliente = null;
  function cargarLib() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve();
    return new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = LIB; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = ok; s.onerror = () => mal(new Error('No se pudo cargar Supabase'));
      document.head.appendChild(s);
      setTimeout(() => mal(new Error('Supabase tardó demasiado')), 6000);
    });
  }
  async function obtenerCliente() {
    if (!configurada) return null;
    if (!cliente) {
      await cargarLib();
      cliente = window.supabase.createClient(cfg.url, cfg.clave, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'cerco-sesion' },
      });
    }
    return cliente;
  }

  async function proyectoDe(sb) {
    if (cfg.proyecto) return cfg.proyecto;
    const guardado = localStorage.getItem('cerco-proyecto');
    if (guardado) return guardado;
    const { data, error } = await sb.from('miembros').select('proyecto_id').limit(1).maybeSingle();
    if (error) throw error;
    if (!data) throw new Error('Tu cuenta no tiene acceso a ningún proyecto todavía.');
    try { localStorage.setItem('cerco-proyecto', data.proyecto_id); } catch (e) {}
    return data.proyecto_id;
  }

  const nuevoId = () => 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function crearDb(sb, pid) {
    const tabla = () => sb.from('documentos');
    const doc = ruta => {
      const [coleccion, docId] = ruta.split('/');
      const filtro = q => q.eq('proyecto_id', pid).eq('coleccion', coleccion).eq('doc_id', docId);
      return {
        async get() {
          const { data, error } = await filtro(tabla().select('datos')).maybeSingle();
          if (error) throw error;
          return { exists: !!data, data: () => (data ? data.datos : undefined) };
        },
        async set(datos) {
          const { error } = await tabla().upsert({ proyecto_id: pid, coleccion, doc_id: docId, datos });
          if (error) throw error;
        },
        async delete() {
          const { error } = await filtro(tabla().delete());
          if (error) throw error;
        },
      };
    };
    const collection = coleccion => ({
      async add(datos) { const id = nuevoId(); await doc(coleccion + '/' + id).set(datos); return { id }; },
      onSnapshot(alCambiar, alFallar) {
        let vivo = true;
        const leer = async () => {
          const { data, error } = await tabla().select('doc_id, datos').eq('proyecto_id', pid).eq('coleccion', coleccion);
          if (!vivo) return;
          if (error) { if (alFallar) alFallar(error); return; }
          alCambiar({ metadata: { fromCache: false }, docs: data.map(r => ({ id: r.doc_id, data: () => r.datos })) });
        };
        leer();
        const canal = sb.channel('cerco-' + coleccion + '-' + nuevoId())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'documentos', filter: 'proyecto_id=eq.' + pid },
            p => { const r = p.new && p.new.coleccion ? p.new : p.old; if (!r || r.coleccion === coleccion) leer(); })
          .subscribe();
        const alVolver = () => { if (document.visibilityState === 'visible') leer(); };
        addEventListener('online', leer);
        document.addEventListener('visibilitychange', alVolver);
        return () => { vivo = false; sb.removeChannel(canal); removeEventListener('online', leer); document.removeEventListener('visibilitychange', alVolver); };
      },
    });
    return { doc, collection };
  }

  async function conectar() {
    const sb = await obtenerCliente();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    if (!data.session) { avisarSinSesion(); return null; }
    return crearDb(sb, await proyectoDe(sb));
  }

  function avisarSinSesion() {
    if (location.pathname === '/' || sessionStorage.getItem('cerco-aviso')) return;
    try { sessionStorage.setItem('cerco-aviso', '1'); } catch (e) {}
    const d = document.createElement('div');
    d.setAttribute('role', 'status');
    d.style.cssText = 'position:fixed;z-index:9999;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 8px);' +
      'max-width:min(92vw,420px);padding:10px 14px;border-radius:12px;background:#15201A;color:#EEF2EC;font:14px/1.35 system-ui,sans-serif;' +
      'box-shadow:0 6px 24px rgba(0,0,0,.3);display:flex;gap:10px;align-items:center';
    d.innerHTML = '<span>Sin sesión: los cambios se guardan solo en este dispositivo. <a href="/" style="color:#FFC93C">Iniciar sesión</a></span>' +
      '<button type="button" aria-label="Cerrar" style="border:0;background:none;color:inherit;font-size:20px;cursor:pointer">×</button>';
    d.querySelector('button').onclick = () => d.remove();
    const poner = () => document.body.appendChild(d);
    document.body ? poner() : addEventListener('DOMContentLoaded', poner);
    setTimeout(() => d.remove(), 12000);
  }

  // Para la pantalla de inicio: iniciar y cerrar sesión.
  window.CercoNube = {
    configurada,
    async sesion() { const sb = await obtenerCliente(); if (!sb) return null; return (await sb.auth.getSession()).data.session; },
    async entrar(correo, clave) {
      const sb = await obtenerCliente();
      const { error } = await sb.auth.signInWithPassword({ email: correo, password: clave });
      if (error) throw error;
      try { localStorage.removeItem('cerco-proyecto'); } catch (e) {}
      await proyectoDe(sb);
    },
    async salir() {
      const sb = await obtenerCliente();
      if (sb) await sb.auth.signOut();
      try { localStorage.removeItem('cerco-proyecto'); } catch (e) {}
    },
  };

  if (configurada) {
    let promesa = null;
    window.claude = { use: nombre => nombre === 'db' ? (promesa = promesa || conectar().catch(e => { console.warn('Nube:', e.message || e); return null; })) : Promise.resolve(null) };
  }
})();
