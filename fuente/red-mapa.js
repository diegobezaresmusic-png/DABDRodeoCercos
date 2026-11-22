/* ---------- red del editor -> red del mapa ----------
   El editor guarda alambres que reciben corriente de otro alambre o de un energizador ("from"),
   y switches, puertas, fines de línea y notas como "parts". El mapa trabaja con tramos completos:
   cada tramo tiene un padre y, si un switch lo corta, el id de ese switch.
   Aquí se parte cada alambre en los puntos donde tiene switches o fin de línea, para que el mapa
   corte exactamente lo mismo que el editor. */
const RED_MAPA = (() => {
  const TOUCH_E = 2, TOUCH_W = 1.5;   // mismas tolerancias que el editor
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const plen = p => { let s = 0; for (let i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]); return s; };
  function project(q, p) {
    let best = {d: 1e9, s: 0, x: p[0][0], y: p[0][1]}, acc = 0;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1e-9;
      let t = ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / (l * l); t = Math.max(0, Math.min(1, t));
      const x = a[0] + t * dx, y = a[1] + t * dy, d = Math.hypot(q[0] - x, q[1] - y);
      if (d < best.d) best = {d, s: acc + t * l, x, y};
      acc += l;
    }
    return best;
  }
  function pointAt(p, s) {
    let acc = 0;
    for (let i = 1; i < p.length; i++) {
      const l = dist(p[i - 1], p[i]);
      if (acc + l >= s && l > 0) { const t = (s - acc) / l; return [p[i - 1][0] + t * (p[i][0] - p[i - 1][0]), p[i - 1][1] + t * (p[i][1] - p[i - 1][1])]; }
      acc += l;
    }
    return p[p.length - 1].slice(0, 2);
  }
  function slice(p, s0, s1) {   // tramo del alambre entre las distancias s0 y s1
    const out = [pointAt(p, s0)]; let acc = 0;
    for (let i = 1; i < p.length; i++) { acc += dist(p[i - 1], p[i]); if (acc > s0 + 1e-6 && acc < s1 - 1e-6) out.push(p[i].slice(0, 2)); }
    out.push(pointAt(p, s1));
    return out;
  }
  const r1 = v => Math.round(v * 10) / 10;
  const rp = p => p.map(q => [r1(q[0]), r1(q[1])]);

  function convertir(net) {
    const W = {}, EN = {};
    net.wires.forEach(w => { W[w.id] = w; });
    net.energizers.forEach(e => { EN[e.id] = e; });
    const mpp = net.mpp;
    const rootOf = (id, d = 0) => d > 400 ? null : EN[id] ? id : (W[id] && W[id].from ? rootOf(W[id].from, d + 1) : null);
    const posOn = (wid, s) => { const w = W[wid]; return w ? pointAt(w.pts, Math.min(s, plen(w.pts))) : null; };
    const partPos = p => {
      if (p.a && p.b) { const A = posOn(p.a.on, p.a.s), B = posOn(p.b.on, p.b.s); if (A && B) return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; }
      if (p.on && W[p.on]) return posOn(p.on, p.s);
      return p.x != null ? [p.x, p.y] : null;
    };

    /* switches: los agrupados (grp) son uno solo; los demás llevan número propio */
    const swParts = net.parts.filter(p => p.type === 'switch' && W[p.on]);
    const usados = new Set(), swId = {}, switches = [];
    const numDe = p => { const m = (p.grp || p.id).match(/^[sS](\d+)(_|$)/); return m ? +m[1] : null; };
    swParts.forEach(p => { if (p.grp) { swId[p.id] = p.grp; } else { const n = numDe(p); if (n && !usados.has('S' + n)) swId[p.id] = 'S' + n; } if (swId[p.id]) usados.add(swId[p.id]); });
    let sig = 1; const libre = () => { while (usados.has('S' + sig)) sig++; usados.add('S' + sig); return 'S' + sig; };
    swParts.forEach(p => { if (!swId[p.id]) swId[p.id] = libre(); });
    const nombres = {}; swParts.forEach(p => { nombres[p.name] = (nombres[p.name] || 0) + 1; });
    const visto = new Set();
    swParts.forEach(p => {
      const id = swId[p.id]; if (visto.has(id)) return; visto.add(id);
      const generico = /^Switch \d+$/.test(p.name || '') && nombres[p.name] > 1;
      switches.push({id, name: generico || !p.name ? 'Switch en «' + W[p.on].name + '»' : p.name, pos: rp([partPos(p)])[0]});
    });
    const abiertos = [...new Set(swParts.filter(p => p.open).map(p => swId[p.id]))];

    /* cortes por alambre: switches y fines de línea */
    const cortes = {};
    net.parts.forEach(p => {
      if (!(p.type === 'switch' || p.type === 'end') || !W[p.on]) return;
      const w = W[p.on]; if (w.kind === 'cable' || w.kind === 'barb') return;
      const L = plen(w.pts); (cortes[w.id] = cortes[w.id] || []).push({s: Math.max(0, Math.min(p.s, L)), sw: p.type === 'switch' ? swId[p.id] : null, fin: p.type === 'end'});
    });

    const lines = {}, tramos = {};   // tramos[wid] = [{id, s0, s1}]
    const MUERTO = '__sin_corriente';
    net.wires.forEach(w => {
      if (w.kind === 'barb' || w.kind === 'cable') return;
      const L = plen(w.pts), cs = (cortes[w.id] || []).sort((a, b) => a.s - b.s), lista = [];
      let s0 = 0;
      cs.forEach((c, i) => { lista.push({id: i ? w.id + '~' + i : w.id, s0, s1: c.s, corte: i ? cs[i - 1] : null}); s0 = c.s; });
      lista.push({id: cs.length ? w.id + '~' + cs.length : w.id, s0, s1: L, corte: cs.length ? cs[cs.length - 1] : null});
      tramos[w.id] = lista;
    });

    /* de dónde recibe corriente un alambre: el tramo del padre donde se apoya su inicio */
    function padreDe(w) {
      if (!w.from) return {parent: MUERTO};
      const e = EN[w.from];
      if (e) return dist(w.pts[0], [e.x, e.y]) <= TOUCH_E ? {parent: e.id} : {parent: MUERTO};
      const pw = W[w.from]; if (!pw || pw.kind === 'barb') return {parent: MUERTO};
      const pr = project(w.pts[0], pw.pts); if (pr.d > TOUCH_W) return {parent: MUERTO};
      if (pw.kind === 'cable') return {parent: pw.id};
      const t = tramos[pw.id].find((x, i, a) => pr.s < x.s1 - 1e-6 || i === a.length - 1);
      return {parent: t.id};
    }

    const gates = [], ends = [];
    net.wires.forEach(w => {
      if (w.kind === 'barb') return;
      const circuit = rootOf(w.id) || '';
      const {parent} = padreDe(w);
      if (w.kind === 'cable') {
        const A = w.pts[0], B = w.pts[w.pts.length - 1], m = Math.round(plen(w.pts) * mpp);
        const sw = net.parts.find(p => p.type === 'switch' && p.on === w.id);
        const ln = {name: w.name, m, kind: 'fence', circuit, parent: w.egate && w.open ? MUERTO : parent};
        if (sw) ln.sw = swId[sw.id];
        if (w.egate) { Object.assign(ln, {pts: rp([A, B]), via: 'j', pa: rp([A])[0]}); gates.push(rp([[(A[0] + B[0]) / 2, (A[1] + B[1]) / 2]])[0]); }
        else Object.assign(ln, {pts: rp([B]), via: 'br', pa: rp([A])[0]});
        if (w.gate) gates.push(rp([w.gate])[0]);
        lines[w.id] = ln;
        return;
      }
      tramos[w.id].forEach((t, i) => {
        const pts = rp(slice(w.pts, t.s0, t.s1));
        const ln = {name: w.name, pts, m: Math.round((t.s1 - t.s0) * mpp), kind: w.kind === 'perimeter' ? 'perimeter' : 'fence', circuit, via: 'j', pa: pts[0]};
        if (i === 0) ln.parent = parent;
        else if (t.corte.fin) ln.parent = MUERTO;
        else { ln.parent = tramos[w.id][i - 1].id; ln.sw = t.corte.sw; }
        lines[t.id] = ln;
      });
    });

    /* fines de línea: donde un alambre termina sin que otro siga, y los puestos a mano */
    net.wires.forEach(w => {
      if (w.kind === 'barb') return;
      const e = w.pts[w.pts.length - 1];
      if (net.wires.some(o => o !== w && o.from === w.id && dist(o.pts[0], e) < 2.5)) return;
      if (net.parts.some(q => q.type === 'end' && q.on === w.id && dist(partPos(q), e) < 2)) return;
      ends.push(rp([e])[0]);
    });
    net.parts.filter(p => p.type === 'end').forEach(p => { const q = partPos(p); if (q) ends.push(rp([q])[0]); });
    net.parts.filter(p => p.type === 'gate').forEach(p => { const q = partPos(p); if (q) gates.push(rp([q])[0]); });

    /* notas del editor: las de Claude sin contestar son dudas; las contestadas, ya confirmadas */
    const doubts = [], resolved = [];
    net.parts.filter(p => p.type === 'note' && (p.text || '').trim()).forEach((p, i) => {
      const m = p.text.match(/^\?(\d+)\s*/), n = m ? +m[1] : 100 + i, text = p.text.replace(/^\?\d+\s*/, '');
      if ((p.answer || '').trim()) resolved.push({n, text: text.split(/[.:?]/)[0] + ' — ' + p.answer.trim()});
      else doubts.push({n, pos: [r1(p.x), r1(p.y)], text: (p.by === 'claude' ? '' : 'Nota: ') + text});
    });

    const unicas = (lista, r) => lista.filter((q, i) => !lista.slice(0, i).some(o => dist(o, q) < r));
    return {
      mpp, size: net.size, gates: unicas(gates, 3), ends: unicas(ends, 2),
      energizers: net.energizers.map(e => ({id: e.id, name: e.name, pos: [r1(e.x), r1(e.y)], off: e.on === false})),
      lines, switches, abiertos, doubts, resolved,
      barb: net.wires.filter(w => w.kind === 'barb').map(w => ({name: w.name, pts: rp(w.pts), m: Math.round(plen(w.pts) * mpp)})),
    };
  }

  /* qué red usar: la incluida al publicar, la del editor en este dispositivo, o la última bajada de la nube */
  const leer = k => { try { const j = JSON.parse(localStorage.getItem(k) || 'null'); return j && j.net && j.net.wires ? j : null; } catch (e) { return null; } };
  const CLAVE_NUBE = 'cerco-mapa-red';
  function elegir(incluida) {
    // La nube manda: la incluida al publicar y la última bajada de la nube son versiones de la nube.
    // La copia del editor en este dispositivo solo cuenta si salió de la versión más nueva de la nube
    // (cambios hechos aquí que tal vez no se han subido). Una copia vieja con fecha nueva no la tapa.
    const nube = [incluida, leer(CLAVE_NUBE)].filter(Boolean).reduce((a, b) => (b.savedAt || 0) > (a.savedAt || 0) ? b : a);
    const local = leer('cerco-editor-v3');
    return local && local.base && local.base >= (nube.savedAt || 0) && (local.savedAt || 0) > (nube.savedAt || 0) ? local : nube;
  }
  /* después de dibujar: si la nube tiene una versión más nueva, se guarda y se ofrece recargar */
  async function revisarNube(usada, avisar) {
    try {
      const use = window.claude && window.claude.use ? window.claude.use('db') : null;
      const db = use ? await Promise.race([use, new Promise(r => setTimeout(() => r(null), 6000))]) : null;
      if (!db) return;
      const snap = await db.doc('cerco/red').get();
      const r = snap.exists ? snap.data() : null;
      if (!r || !r.net || !r.net.wires) return;
      try { localStorage.setItem(CLAVE_NUBE, JSON.stringify(r)); } catch (e) {}
      if ((r.savedAt || 0) > (usada.savedAt || 0) + 1000) avisar();
    } catch (e) { console.warn('Mapa: no se pudo revisar la nube', e); }
  }
  return {convertir, elegir, revisarNube};
})();
