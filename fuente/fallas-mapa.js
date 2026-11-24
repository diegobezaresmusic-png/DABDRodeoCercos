// Fallas sobre el mapa. Lo usa la misma página del mapa (template2.html) en dos modos:
//   /fallas/  -> reportar, ver qué se queda sin corriente, marcar como reparada
//   /mapa/    -> solo muestra los pines de las fallas pendientes y un acceso a la sección de Fallas
// Los datos salen de /fallas.js (window.Fallas).
window.FALLAS_MAPA = function (api) {
  'use strict';
  const F = window.Fallas; if (!F) return;
  const {L, ALL, EN, el, NS, ptsStr, fmtM, fmtKm, along, fullPts, toSvg, view, svg, $} = api;
  const FALLAS = api.MODO === 'fallas';

  /* ---------- estilos ---------- */
  const css = document.createElement('style');
  css.textContent = `
.f-card h2{display:flex;align-items:center;justify-content:space-between;gap:8px}
.f-cuenta{font:600 12px/1 var(--f-data);padding:4px 8px;border-radius:99px;background:var(--red);color:#fff;letter-spacing:0}
.f-cuenta.cero{background:var(--ok)}
.f-resumen{margin:0 0 10px;display:grid;gap:4px;font-size:13.5px}
.f-resumen .r{display:flex;gap:8px;align-items:center}
.f-resumen i{flex:none;width:10px;height:10px;border-radius:50%}
.f-big{width:100%;min-height:50px;border:0;border-radius:12px;background:#D3261E;color:#fff;font:700 17px var(--f-body);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 6px 16px rgba(211,38,30,.25)}
.f-big svg{width:22px;height:22px}
.f-big[aria-pressed="true"]{background:var(--chip);color:var(--fg);box-shadow:none}
.f-big.ok{background:var(--ok);box-shadow:0 6px 16px rgba(47,138,78,.25)}
.f-big.sec{background:var(--chip);color:var(--fg);box-shadow:none;border:1px solid var(--rule)}
.f-big:focus-visible,.f-tab:focus-visible,.f-tipo:focus-visible,.f-x:focus-visible,.f-row:focus-visible,.f-link:focus-visible{outline:3px solid var(--amber);outline-offset:2px}
.f-sync{margin:8px 0 0;color:var(--muted);font-size:12.5px}
.f-sync.alerta{color:var(--amber-ink)}
.f-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin:12px 0 4px;padding:3px;border-radius:10px;background:var(--chip)}
.f-tab{border:0;border-radius:8px;padding:8px 6px;background:none;color:var(--muted);font:600 13.5px var(--f-body);cursor:pointer}
.f-tab[aria-selected="true"]{background:var(--panel);color:var(--fg);box-shadow:0 1px 3px rgba(0,0,0,.15)}
.f-list{list-style:none;margin:0;padding:0;display:grid}
.f-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;width:100%;padding:10px 4px;border:0;border-top:1px solid var(--rule);background:none;color:inherit;text-align:left;font:inherit;cursor:pointer}
.f-list li:first-child .f-row{border-top:0}
.f-row:hover,.f-row.hl{background:color-mix(in srgb,var(--amber) 10%,transparent)}
.f-ico{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#fff}
.f-ico svg{width:22px;height:22px}
.f-ico.corte,.f-ico.energizador{background:#D3261E}.f-ico.descarga{background:#E79A00;color:#1d1300}.f-ico.fisico{background:#2E6BE6}.f-ico.reparada{background:#6B746E}
.f-row b{display:block;font-size:14.5px;line-height:1.2}
.f-row small{display:block;color:var(--muted);font-size:12.5px;line-height:1.3;margin-top:2px}
.f-row .f-mini{color:var(--muted);font:500 12px var(--f-data);white-space:nowrap}
.f-vacio{margin:10px 0 4px;color:var(--muted);font-size:13.5px}
.f-link{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;border-radius:10px;background:var(--chip);color:var(--fg);border:1px solid var(--rule);font:600 15px var(--f-body);text-decoration:none;margin-top:10px}
.f-check{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px;color:var(--muted)}
.f-mapbtn{position:absolute;top:10px;right:10px;display:flex;align-items:center;gap:7px;padding:10px 15px;border-radius:99px;border:1px solid rgba(255,255,255,.25);background:#D3261E;color:#fff;font:700 14.5px/1 var(--f-body);cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.f-mapbtn svg{width:17px;height:17px}
.f-mapbtn[aria-pressed="true"]{background:#fff;color:#B01F18}
#map.f-marcando{cursor:crosshair}
.f-modo .hint{max-width:calc(100% - 130px)}
.f-pin{cursor:pointer}
.wire.baja.on{stroke:#FFD36A}
.flow.baja{stroke:#FF8A00;stroke-dasharray:1.5 6;animation-duration:2.4s}
/* hoja (formulario abajo en celular, a la derecha en pantalla grande) */
.f-hoja{position:fixed;z-index:60;left:0;right:0;bottom:0;max-height:min(88dvh,720px);overflow:auto;overscroll-behavior:contain;
  padding:18px max(16px,env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));
  background:var(--panel);color:var(--fg);border-radius:20px 20px 0 0;border:1px solid var(--rule);box-shadow:0 -12px 40px rgba(0,0,0,.35);animation:f-sube .2s ease-out}
@media (min-width:901px){.f-hoja{left:auto;right:20px;bottom:20px;width:400px;border-radius:18px}}
@media (max-width:900px){.f-hoja{max-height:60dvh}}
@keyframes f-sube{from{transform:translateY(24px);opacity:0}}
.f-hoja h3{margin:0 40px 2px 0;font:700 22px/1.15 var(--f-display);letter-spacing:.02em;display:flex;align-items:center;gap:10px}
.f-hoja h3 .f-ico{width:34px;height:34px}
.f-cerca{margin:0 0 12px;color:var(--muted);font-size:13.5px}
.f-cerca.alerta{color:var(--amber-ink)}
.f-x{position:absolute;top:10px;right:10px;width:40px;height:40px;border:0;border-radius:12px;background:none;color:var(--muted);cursor:pointer;display:grid;place-items:center}
.f-x svg{width:18px;height:18px}
.f-lbl{display:block;margin:14px 0 6px;font:600 11.5px var(--f-display);letter-spacing:.12em;text-transform:uppercase;color:var(--muted)}
.f-tipos{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.f-tipo{display:grid;justify-items:center;gap:6px;padding:10px 4px;min-height:82px;border-radius:12px;border:1.5px solid var(--rule);background:var(--bg);color:var(--fg);font:600 12.5px/1.2 var(--f-body);cursor:pointer;text-align:center}
.f-tipo svg{width:28px;height:28px}
.f-tipo[aria-pressed="true"]{border-color:#D3261E;background:color-mix(in srgb,#D3261E 12%,var(--bg));box-shadow:inset 0 0 0 1px #D3261E}
.f-hoja input[type=text],.f-hoja input[type=number],.f-hoja textarea{width:100%;font:16px/1.35 var(--f-body);color:var(--fg);background:var(--bg);border:1px solid var(--rule);border-radius:10px;padding:10px 12px}
.f-hoja textarea{resize:vertical;min-height:70px}
.f-hoja input:focus-visible,.f-hoja textarea:focus-visible{outline:2px solid var(--amber);outline-offset:1px}
.f-foto{display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.f-foto img{width:84px;height:84px;object-fit:cover;border-radius:10px;border:1px solid var(--rule)}
.f-foto .f-big{width:auto;min-height:44px;padding:0 16px;font-size:15px}
.f-acc{display:grid;gap:8px;margin-top:18px}
.f-msg{min-height:1.2em;margin:8px 0 0;color:var(--red);font-size:13.5px}
.f-tip{margin:10px 0 0;color:var(--muted);font-size:12.5px}
.f-dato{margin:0 0 4px;font-size:14.5px}
.f-dato span{color:var(--muted)}
.f-nota{margin:6px 0 0;padding:10px 12px;border-radius:10px;background:var(--bg);white-space:pre-wrap;overflow-wrap:anywhere;font-size:14.5px}
.f-impacto{margin:0 0 12px;padding:10px 12px;border-radius:10px;font-size:14.5px;font-weight:600}
.f-impacto.corte,.f-impacto.energizador{background:color-mix(in srgb,#D3261E 14%,transparent);color:var(--red)}
.f-impacto.descarga{background:color-mix(in srgb,#E79A00 16%,transparent);color:var(--amber-ink)}
.f-impacto.fisico,.f-impacto.reparada{background:var(--chip);color:var(--muted)}
.f-img{display:block;width:100%;max-height:340px;object-fit:contain;margin-top:8px;border-radius:12px;background:var(--bg)}
.f-cargafoto{margin-top:8px;color:var(--muted);font-size:13px}
.f-sep{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--rule)}
.f-borrar{border:0;background:none;color:var(--red);font:600 14px var(--f-body);text-decoration:underline;text-underline-offset:2px;cursor:pointer;padding:8px 0}
.f-confirma{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;font-size:14px}`;
  document.head.appendChild(css);

  /* ---------- utilidades ---------- */
  const h = (tag, cls, texto) => { const n = document.createElement(tag); if (cls) n.className = cls; if (texto != null) n.textContent = texto; return n; };
  const ICONO_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const ICONO_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><path d="M12 7v4M12 13.5v.01"/></svg>';
  const ICONO_FOTO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>';
  const COLOR = {corte: '#D3261E', energizador: '#D3261E', descarga: '#E79A00', fisico: '#2E6BE6', reparada: '#6B746E'};
  const claseDe = f => f.estado === 'reparada' ? 'reparada' : F.tipoDe(f).efecto;
  const cuando = iso => {
    if (!iso) return '';
    const d = new Date(iso), min = Math.round((Date.now() - d) / 60000);
    if (min < 1) return 'hace un momento';
    if (min < 60) return 'hace ' + min + ' min';
    if (min < 60 * 24) return 'hace ' + Math.round(min / 60) + ' h';
    return d.toLocaleDateString('es-MX', {day: 'numeric', month: 'short'}) + ', ' + d.toLocaleTimeString('es-MX', {hour: 'numeric', minute: '2-digit'});
  };
  const CIRC = api.CIRC_NAME;

  /* ---------- dónde cae cada falla ---------- */
  // La línea con corriente más cercana al punto (las de alambre de púas no llevan corriente).
  function lineaCerca(x, y, radio) {
    let mejor = null;
    ALL.forEach(k => {
      const ln = L[k], cable = ln.via === 'br';   // cable sobre puerta: se toca en todo su largo, y cortarlo corta lo que alimenta
      const r = along(cable ? [ln.pa].concat(ln.pts) : fullPts(ln), x, y);
      if (r.dist <= radio && (!mejor || r.dist < mejor.dist)) mejor = {k, dist: r.dist, d: cable ? 0 : r.d, pt: r.pt};
    });
    return mejor;
  }
  const energizadorCerca = (x, y) => EN.reduce((m, e) => { const d = Math.hypot(e.pos[0] - x, e.pos[1] - y); return !m || d < m.d ? {id: e.id, d, e} : m; }, null);
  // Efecto de una falla en la red, calculado con la geometría (así sigue funcionando aunque el cerco se edite).
  function efectoDe(f, ef) {
    const t = F.tipoDe(f);
    if (t.efecto === 'energizador') { const e = f.en && EN.find(x => x.id === f.en) || (energizadorCerca(f.x, f.y) || {}).e; if (e) ef.enOff.add(e.id); return; }
    if (t.efecto === 'fisico') return;
    const ln = lineaCerca(f.x, f.y, 12); if (!ln) return;
    if (t.efecto === 'corte') { const prev = ef.cortes.get(ln.k); ef.cortes.set(ln.k, prev == null ? ln.d : Math.min(prev, ln.d)); }
    else ef.baja.add(L[ln.k].circuit);
  }
  const vacio = () => ({cortes: new Map(), enOff: new Set(), baja: new Set()});
  function efectos(lista) { const ef = vacio(); lista.forEach(f => efectoDe(f, ef)); ef.enOff.forEach(id => ef.baja.delete(id)); return ef; }   // circuito apagado: ya no "baja"
  // Qué provoca una sola falla, en palabras.
  function impacto(f) {
    if (f.estado === 'reparada') return {cls: 'reparada', txt: 'Reparada: ya no afecta la corriente.'};
    const t = F.tipoDe(f);
    if (t.efecto === 'fisico') return {cls: 'fisico', txt: 'Daño físico: no corta la corriente.'};
    const ef = efectos([f]);
    if (t.efecto === 'descarga') {
      const c = [...ef.baja][0];
      return {cls: 'descarga', txt: c ? 'Baja la corriente de todo el ' + (CIRC[c] || 'circuito') + '.' : 'Baja la corriente del circuito.'};
    }
    const m = api.medir(vacio()) - api.medir(ef);
    if (t.efecto === 'energizador') return {cls: 'energizador', txt: 'Deja sin corriente ' + fmtKm(m) + ' de cerca.'};
    if (m > 5) return {cls: 'corte', txt: 'Deja sin corriente ' + fmtM(m) + ' de cerca.'};
    const ln = lineaCerca(f.x, f.y, 12);
    if (ln && !api.vivas(vacio()).has(ln.k)) return {cls: 'fisico', txt: 'Este tramo ya estaba sin corriente: no está conectado o tiene un switch abierto.'};
    return {cls: 'corte', txt: 'Sin corriente en este punto.'};
  }

  /* ---------- estado ---------- */
  let todas = [], est = F.estado(), filtro = 'pendientes', marcando = false, borrador = null, hoja = null, sel = null, mostrarPines = true;
  const pend = () => todas.filter(f => f.estado !== 'reparada');
  const orden = (a, b) => (F.URGENCIA[F.tipoDe(a).efecto] - F.URGENCIA[F.tipoDe(b).efecto]) || String(b.creado).localeCompare(String(a.creado));

  /* ---------- pines ---------- */
  const gF = el('g', {id: 'g-fallas'}, $('vp'));
  const PINES = [];
  api.alEscalar(k => PINES.forEach(o => o.g.setAttribute('transform', `translate(${o.x} ${o.y}) scale(${k.toFixed(4)})`)));
  function pin(x, y, cls, t, borr) {
    const g = el('g', {class: 'f-pin'}, gF), col = borr ? '#fff' : COLOR[cls];
    el('path', {d: 'M0 0C-3.5-7-12-10-12-19a12 12 0 1 1 24 0c0 9-8.5 12-12 19z', fill: col, stroke: borr ? '#D3261E' : '#fff', 'stroke-width': 2}, g);
    const ic = el('svg', {x: -8, y: -27, width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: borr ? '#D3261E' : cls === 'descarga' ? '#1d1300' : '#fff', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'}, g);
    ic.innerHTML = t ? t.icono : '<path d="M12 7v6M12 16.5v.01"/>';
    PINES.push({g, x, y});
    return g;
  }
  function pintarPines() {
    gF.replaceChildren(); PINES.length = 0;
    if (mostrarPines) {
      const ver = FALLAS && filtro === 'reparadas' ? todas.filter(f => f.estado === 'reparada') : pend();
      ver.forEach(f => {
        const g = pin(f.x, f.y, claseDe(f), F.tipoDe(f));
        const ti = document.createElementNS(NS, 'title'); ti.textContent = F.tipoDe(f).nombre + (f.linea ? ' · ' + f.linea : ''); g.prepend(ti);
        g.addEventListener('click', e => { e.stopPropagation(); if (api.drag.moved) return; FALLAS ? abrirVer(f.id) : location.assign('/fallas/#' + f.id); });
      });
    }
    if (borrador) pin(borrador.x, borrador.y, 'corte', borrador.tipo ? F.TIPO[borrador.tipo] : null, true);
    api.reescalar();
  }

  /* botón sobre el mapa (en el celular la tarjeta queda abajo del mapa) */
  const movil = () => matchMedia('(max-width:900px)').matches;
  const mapBtn = FALLAS ? h('button', 'f-mapbtn') : null;
  if (mapBtn) { mapBtn.type = 'button'; mapBtn.onclick = () => ponerMarcando(!marcando); $('mapwrap').appendChild(mapBtn); }

  /* ---------- tarjeta del panel ---------- */
  const card = h('section', 'card f-card'); card.setAttribute('aria-live', 'polite');
  const panel = document.querySelector('.panel');
  panel.insertBefore(card, FALLAS ? panel.firstChild : panel.children[1] || null);

  function resumen(cont) {
    const p = pend();
    const ef = efectos(p), sinM = api.medir(vacio()) - api.medir(ef);
    const filas = [];
    if (sinM > 5) filas.push(['#D3261E', 'Sin corriente: ' + fmtM(sinM) + ' de cerca']);
    ef.baja.forEach(c => filas.push(['#E79A00', 'Corriente baja en el ' + (CIRC[c] || 'circuito')]));
    const fis = p.filter(f => F.tipoDe(f).efecto === 'fisico').length;
    if (fis) filas.push(['#2E6BE6', fis + (fis === 1 ? ' daño físico' : ' daños físicos')]);
    if (!filas.length) filas.push([getComputedStyle(document.documentElement).getPropertyValue('--ok') || '#2F8A4E', p.length ? 'La corriente no se ve afectada' : 'Sin fallas pendientes']);
    const r = h('div', 'f-resumen');
    filas.forEach(([c, t]) => { const d = h('div', 'r'); const i = h('i'); i.style.background = c; d.append(i, h('span', null, t)); r.appendChild(d); });
    cont.appendChild(r);
  }
  function textoSync() {
    if (est.sinSesion) return {t: 'Sin sesión: las fallas se guardan solo en este teléfono. Inicia sesión en el inicio para compartirlas.', alerta: true};
    if (est.porSubir) return {t: (est.porSubir === 1 ? '1 cambio por subir' : est.porSubir + ' cambios por subir') + ': se suben solos cuando haya señal.', alerta: true};
    if (est.errorNube) return {t: 'Sin conexión: se muestran las fallas guardadas en este teléfono.', alerta: true};
    return est.enNube ? {t: 'Al día con la nube.', alerta: false} : {t: 'Conectando…', alerta: false};
  }
  function pintarTarjeta() {
    card.replaceChildren();
    const p = pend(), t2 = h('h2', null, 'Fallas'), n = h('span', 'f-cuenta' + (p.length ? '' : ' cero'), p.length ? p.length + (p.length === 1 ? ' pendiente' : ' pendientes') : 'Todo bien');
    t2.appendChild(n); card.appendChild(t2);
    resumen(card);
    if (!FALLAS) {
      const a = h('a', 'f-link', p.length ? 'Ver y reparar fallas' : 'Abrir Fallas'); a.href = '/fallas/'; card.appendChild(a);
      const lb = h('label', 'f-check'), cb = h('input'); cb.type = 'checkbox'; cb.checked = mostrarPines;
      cb.onchange = () => { mostrarPines = cb.checked; pintarPines(); };
      lb.append(cb, document.createTextNode('Mostrar fallas en el mapa')); card.appendChild(lb);
      return;
    }
    const b = h('button', 'f-big'); b.type = 'button'; b.setAttribute('aria-pressed', marcando ? 'true' : 'false');
    b.innerHTML = ICONO_PIN; b.appendChild(document.createTextNode(marcando ? 'Cancelar reporte' : 'Reportar falla'));
    b.onclick = () => { ponerMarcando(!marcando); if (marcando && movil()) $('mapwrap').scrollIntoView({behavior: 'smooth', block: 'start'}); };
    card.appendChild(b);
    mapBtn.setAttribute('aria-pressed', marcando ? 'true' : 'false');
    mapBtn.innerHTML = marcando ? '' : ICONO_PIN; mapBtn.appendChild(document.createTextNode(marcando ? 'Cancelar' : 'Reportar falla'));
    const s = textoSync(), ps = h('p', 'f-sync' + (s.alerta ? ' alerta' : ''), s.t); card.appendChild(ps);
    const rep = todas.filter(f => f.estado === 'reparada');
    const tabs = h('div', 'f-tabs'); tabs.setAttribute('role', 'tablist');
    [['pendientes', 'Pendientes (' + p.length + ')'], ['reparadas', 'Reparadas (' + rep.length + ')']].forEach(([id, txt]) => {
      const t = h('button', 'f-tab', txt); t.type = 'button'; t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', filtro === id ? 'true' : 'false');
      t.onclick = () => { filtro = id; pintar(); }; tabs.appendChild(t);
    });
    card.appendChild(tabs);
    const ver = (filtro === 'pendientes' ? p : rep).slice().sort(filtro === 'pendientes' ? orden : (a, b) => String(b.reparado).localeCompare(String(a.reparado)));
    if (!ver.length) { card.appendChild(h('p', 'f-vacio', filtro === 'pendientes' ? 'No hay fallas pendientes. Si encuentras una, toca «Reportar falla».' : 'Todavía no hay fallas reparadas.')); return; }
    const ul = h('ul', 'f-list');
    ver.forEach(f => {
      const li = h('li'), r = h('button', 'f-row' + (sel === f.id ? ' hl' : '')); r.type = 'button';
      const t = F.tipoDe(f), ic = h('span', 'f-ico ' + claseDe(f)); ic.innerHTML = F.iconoSvg(t);
      const tx = h('span'); tx.appendChild(h('b', null, t.nombre));
      const quien = f.estado === 'reparada' ? 'Reparó ' + (f.reparo || '—') + ' · ' + cuando(f.reparado) : (f.reporto || '—') + ' · ' + cuando(f.creado);
      tx.appendChild(h('small', null, (f.linea ? f.linea + ' · ' : '') + quien));
      r.append(ic, tx, h('span', 'f-mini', (f.foto ? '📷 ' : '') + '#' + f.n));
      r.onclick = () => abrirVer(f.id, true);
      li.appendChild(r); ul.appendChild(li);
    });
    card.appendChild(ul);
  }

  /* ---------- hoja ---------- */
  let hojaEl = null;
  function cerrarHoja() { if (hojaEl) hojaEl.remove(); hojaEl = null; hoja = null; borrador = null; sel = null; pintar(); }
  function nuevaHoja(titulo, ico) {
    if (hojaEl) hojaEl.remove();
    hojaEl = h('div', 'f-hoja'); hojaEl.setAttribute('role', 'dialog'); hojaEl.setAttribute('aria-label', titulo);
    const t = h('h3');
    if (ico) t.appendChild(ico);
    t.appendChild(document.createTextNode(titulo));
    const x = h('button', 'f-x'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar'); x.innerHTML = ICONO_X; x.onclick = () => { if (hoja === 'nueva') ponerMarcando(false); else cerrarHoja(); };
    hojaEl.append(x, t); document.body.appendChild(hojaEl);
    return hojaEl;
  }
  addEventListener('keydown', e => { if (e.key === 'Escape' && hojaEl) { if (hoja === 'nueva') ponerMarcando(false); else cerrarHoja(); } });

  // Campo de foto: botón para tomarla (o elegirla) y vista previa. Devuelve () => dataURL|null.
  function campoFoto(cont, msg) {
    let url = null;
    const box = h('div', 'f-foto'), inp = h('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment'); inp.hidden = true;
    const b = h('button', 'f-big sec'); b.type = 'button';
    const pintarF = () => {
      box.replaceChildren(inp);
      if (url) { const im = h('img'); im.src = url; im.alt = 'Foto de la falla'; const q = h('button', 'f-borrar', 'Quitar foto'); q.type = 'button'; q.onclick = () => { url = null; pintarF(); }; box.append(im, q); }
      else { b.innerHTML = ICONO_FOTO; b.appendChild(document.createTextNode('Tomar foto')); box.appendChild(b); }
    };
    b.onclick = () => inp.click();
    inp.onchange = async () => {
      const a = inp.files && inp.files[0]; inp.value = ''; if (!a) return;
      b.disabled = true; msg.textContent = 'Preparando foto…';
      try { url = await F.comprimir(a); msg.textContent = ''; } catch (e) { msg.textContent = 'No se pudo usar esa foto. Intenta con otra.'; }
      b.disabled = false; pintarF();
    };
    pintarF(); cont.appendChild(box);
    return () => url;
  }
  // Pide el nombre una sola vez por teléfono.
  function campoNombre(cont) {
    if (F.nombre()) return () => F.nombre();
    cont.appendChild(h('label', 'f-lbl', '¿Quién eres? (solo se pide una vez)'));
    const i = h('input'); i.type = 'text'; i.maxLength = 40; i.autocomplete = 'name'; i.placeholder = 'Tu nombre'; cont.appendChild(i);
    return () => { const v = i.value.trim(); if (v) F.ponerNombre(v); return v; };
  }

  function abrirNueva() {
    hoja = 'nueva';
    const hj = nuevaHoja('Nueva falla');
    const cerca = h('p', 'f-cerca'); hj.appendChild(cerca);
    const pintarCerca = () => {
      const t = borrador.tipo && F.TIPO[borrador.tipo];
      if (t && t.efecto === 'energizador') { const e = energizadorCerca(borrador.x, borrador.y); cerca.className = 'f-cerca'; cerca.textContent = e ? 'Energizador: ' + e.e.name : ''; return; }
      cerca.className = 'f-cerca' + (borrador.linea ? '' : ' alerta');
      cerca.textContent = borrador.linea ? 'Cerca de: ' + borrador.linea : 'No hay cerco justo aquí. Toca más cerca de la línea si la falla está en un cerco.';
    };
    pintarCerca(); hj._cerca = pintarCerca;
    hj.appendChild(h('span', 'f-lbl', '¿Qué pasó?'));
    const grid = h('div', 'f-tipos');
    F.TIPOS.forEach(t => {
      const b = h('button', 'f-tipo'); b.type = 'button'; b.setAttribute('aria-pressed', borrador.tipo === t.id ? 'true' : 'false');
      b.innerHTML = F.iconoSvg(t); b.appendChild(document.createTextNode(t.nombre));
      b.onclick = () => { borrador.tipo = t.id; grid.querySelectorAll('.f-tipo').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); msg.textContent = ''; pintarCerca(); pintarPines(); };
      grid.appendChild(b);
    });
    hj.appendChild(grid);
    const msg = h('p', 'f-msg'); msg.setAttribute('role', 'status');
    hj.appendChild(h('span', 'f-lbl', 'Foto (opcional)'));
    const foto = campoFoto(hj, msg);
    hj.appendChild(h('label', 'f-lbl', 'Nota (opcional)'));
    const nota = h('textarea'); nota.maxLength = 600; nota.rows = 2; nota.placeholder = 'Ej: se rompió junto al bebedero, lleva 20 m de alambre'; hj.appendChild(nota);
    hj.appendChild(h('label', 'f-lbl', 'Lectura del medidor en kV (si traes medidor)'));
    const kv = h('input'); kv.type = 'number'; kv.inputMode = 'decimal'; kv.min = '0'; kv.max = '20'; kv.step = '0.1'; kv.placeholder = 'Ej: 2.5'; hj.appendChild(kv);
    const quien = campoNombre(hj);
    const acc = h('div', 'f-acc'), g = h('button', 'f-big', 'Guardar falla'); g.type = 'button';
    acc.appendChild(g); hj.append(acc, msg, h('p', 'f-tip', 'Si el pin quedó mal, toca otro punto del mapa para moverlo.'));
    g.onclick = () => {
      if (!borrador.tipo) { msg.textContent = 'Elige qué pasó.'; return; }
      const nom = quien(); if (!nom) { msg.textContent = 'Escribe tu nombre.'; return; }
      const t = F.TIPO[borrador.tipo], datos = {tipo: t.id, x: +borrador.x.toFixed(1), y: +borrador.y.toFixed(1), linea: borrador.linea || '', nota: nota.value.trim()};
      if (t.efecto === 'energizador') { const e = energizadorCerca(borrador.x, borrador.y); if (e) { datos.en = e.id; datos.linea = e.e.name; } }
      const v = parseFloat(kv.value); if (!isNaN(v)) datos.kv = v;
      const r = F.reportar(datos, foto());
      if (!r.ok) { msg.textContent = r.motivo; return; }
      marcando = false; svg.classList.remove('f-marcando'); borrador = null; filtro = 'pendientes';
      Cerco.aviso(est.sinSesion ? 'Falla guardada en este teléfono.' : 'Falla guardada. Se sube en cuanto haya señal.', {duracion: 3500});
      abrirVer(r.id);
    };
  }

  function ponerMarcando(on) {
    marcando = on; svg.classList.toggle('f-marcando', on);
    const hint = $('hint');
    if (on) { hint.textContent = 'Toca en el mapa el lugar de la falla.'; hint.hidden = false; if (hojaEl) { hojaEl.remove(); hojaEl = null; hoja = null; } sel = null; }
    else { hint.hidden = true; if (hoja === 'nueva') { hojaEl.remove(); hojaEl = null; hoja = null; } borrador = null; }
    pintar();
  }
  svg.addEventListener('click', e => {
    if (!FALLAS || !marcando) return;
    e.stopPropagation(); e.preventDefault(); if (api.drag.moved) return;
    const p = toSvg(e.clientX, e.clientY), x = (p.x - view.tx) / view.s, y = (p.y - view.ty) / view.s;
    const ln = lineaCerca(x, y, 30 * api.symK());
    borrador = Object.assign(borrador || {}, ln ? {x: ln.pt[0], y: ln.pt[1], linea: L[ln.k].name} : {x, y, linea: ''});
    $('hint').hidden = true;
    if (hoja !== 'nueva') { abrirNueva(); if (movil()) api.focusAt(borrador.x, borrador.y, Math.max(view.s, 2)); }   // que el pin quede a la vista arriba de la hoja
    else hojaEl._cerca();
    pintarPines();
  }, true);

  async function ponerFoto(cont, id) {
    const c = h('p', 'f-cargafoto', 'Cargando foto…'); cont.appendChild(c);
    const url = await F.foto(id);
    if (!c.isConnected) return;
    if (!url) { c.textContent = 'La foto todavía no está disponible (se verá cuando haya señal).'; return; }
    const im = h('img', 'f-img'); im.src = url; im.alt = 'Foto'; c.replaceWith(im);
  }
  function abrirVer(id, acercar) {
    const f = todas.find(x => x.id === id); if (!f) return;
    if (marcando) ponerMarcando(false);
    hoja = 'ver'; sel = id; borrador = null;
    if (acercar) api.focusAt(f.x, f.y, 3);
    const t = F.tipoDe(f), ic = h('span', 'f-ico ' + claseDe(f)); ic.innerHTML = F.iconoSvg(t);
    const hj = nuevaHoja(t.nombre, ic);
    hj.appendChild(h('p', 'f-cerca', (f.linea ? f.linea + ' · ' : '') + 'Falla #' + f.n + (f.estado === 'reparada' ? ' · reparada' : ' · pendiente')));
    const im = impacto(f); hj.appendChild(h('p', 'f-impacto ' + im.cls, im.txt));
    const d1 = h('p', 'f-dato'); d1.append(h('span', null, 'Reportó: '), document.createTextNode((f.reporto || '—') + ' · ' + cuando(f.creado))); hj.appendChild(d1);
    if (f.kv != null) { const d2 = h('p', 'f-dato'); d2.append(h('span', null, 'Lectura: '), document.createTextNode(f.kv + ' kV')); hj.appendChild(d2); }
    if (f.nota) hj.appendChild(h('p', 'f-nota', f.nota));
    if (f.foto) ponerFoto(hj, f.id);
    if (f.estado === 'reparada') {
      const s = h('div', 'f-sep'); hj.appendChild(s);
      const d3 = h('p', 'f-dato'); d3.append(h('span', null, 'Reparó: '), document.createTextNode((f.reparo || '—') + ' · ' + cuando(f.reparado))); s.appendChild(d3);
      if (f.notaRep) s.appendChild(h('p', 'f-nota', f.notaRep));
      if (f.fotoRep) ponerFoto(s, f.id + '-r');
      const acc = h('div', 'f-acc'), b = h('button', 'f-big sec', 'Volver a abrir (sigue fallando)'); b.type = 'button';
      b.onclick = () => { F.reabrir(f.id); filtro = 'pendientes'; abrirVer(f.id); };
      acc.appendChild(b); hj.appendChild(acc);
    } else {
      const acc = h('div', 'f-acc'), b = h('button', 'f-big ok', 'Ya quedó reparada'); b.type = 'button';
      b.onclick = () => abrirReparar(f.id);
      acc.appendChild(b); hj.appendChild(acc);
      const conf = h('div', 'f-confirma'), del = h('button', 'f-borrar', 'Borrar (se reportó por error)'); del.type = 'button';
      del.onclick = () => {
        conf.replaceChildren(h('span', null, '¿Borrar esta falla?'));
        const si = h('button', 'f-borrar', 'Sí, borrar'); si.type = 'button'; si.onclick = () => { F.borrar(f.id); Cerco.aviso('Falla borrada.', {duracion: 3000}); cerrarHoja(); };
        const no = h('button', 'f-borrar', 'No'); no.type = 'button'; no.style.color = 'var(--muted)'; no.onclick = () => abrirVer(f.id);
        conf.append(si, no);
      };
      conf.appendChild(del); hj.appendChild(conf);
    }
    pintar();
  }
  function abrirReparar(id) {
    const f = todas.find(x => x.id === id); if (!f) return;
    hoja = 'reparar';
    const hj = nuevaHoja('¿Cómo quedó?');
    hj.appendChild(h('p', 'f-cerca', F.tipoDe(f).nombre + (f.linea ? ' · ' + f.linea : '') + ' · #' + f.n));
    const msg = h('p', 'f-msg'); msg.setAttribute('role', 'status');
    hj.appendChild(h('label', 'f-lbl', 'Nota (opcional)'));
    const nota = h('textarea'); nota.maxLength = 600; nota.rows = 2; nota.placeholder = 'Ej: se cambiaron 2 aisladores y se tensó el alambre'; hj.appendChild(nota);
    hj.appendChild(h('span', 'f-lbl', 'Foto de cómo quedó (opcional)'));
    const foto = campoFoto(hj, msg);
    const quien = campoNombre(hj);
    const acc = h('div', 'f-acc'), g = h('button', 'f-big ok', 'Guardar como reparada'), c = h('button', 'f-big sec', 'Cancelar');
    g.type = c.type = 'button'; acc.append(g, c); hj.append(acc, msg);
    c.onclick = () => abrirVer(id);
    g.onclick = () => {
      if (!quien()) { msg.textContent = 'Escribe tu nombre.'; return; }
      const r = F.reparar(id, {nota: nota.value.trim()}, foto());
      if (!r.ok) { msg.textContent = r.motivo; return; }
      Cerco.aviso('Falla marcada como reparada.', {duracion: 3000});
      cerrarHoja();
    };
  }

  /* ---------- todo junto ---------- */
  function pintar() {
    if (FALLAS) api.ponerEfectos(efectos(pend()));
    pintarPines(); pintarTarjeta();
  }
  F.alCambiar(s => {
    est = s; todas = s.fallas;
    if (hoja === 'ver' && sel && !todas.find(f => f.id === sel)) cerrarHoja();
    pintar();
  });
  if (FALLAS) {
    // Para quien entra desde el mapa (/fallas/#id): abrir esa falla.
    const desdeHash = () => { const id = decodeURIComponent(location.hash.slice(1)); if (id && todas.find(f => f.id === id)) abrirVer(id, true); };
    addEventListener('hashchange', desdeHash); setTimeout(desdeHash, 0);
    // El resumen de corriente del panel habla de las fallas, no de los switches.
    api.alPintar((live, onM) => {
      const p = pend(), sinM = api.medir(vacio()) - onM;
      $('pw-msg').textContent = !p.length ? 'Sin fallas pendientes.' : sinM > 5 ? 'Por las fallas pendientes hay ' + fmtM(sinM) + ' de cerca sin corriente.' : 'Las fallas pendientes no dejan cerca sin corriente.';
    });
  }
};
