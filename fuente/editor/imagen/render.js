// Dibuja todo el mapa a zoom K (pixeles por unidad del mapa, igual que el "Zoom" del editor) + leyenda, y lo guarda como JPG.
window.__render = async function (K, name, opts) {
  opts = opts || {};
  const M = 22;   // margen alrededor del cerco, en unidades del mapa
  const xs = [], ys = [];
  net.wires.forEach(w => w.pts.forEach(p => { xs.push(p[0]); ys.push(p[1]); }));
  net.energizers.forEach(e => { xs.push(e.x); ys.push(e.y); });
  const x0 = Math.max(0, Math.floor(Math.min(...xs) - M)), y0 = Math.max(0, Math.floor(Math.min(...ys) - M));
  const x1 = Math.min(net.size[0], Math.ceil(Math.max(...xs) + M)), y1 = Math.min(net.size[1], Math.ceil(Math.max(...ys) + M));
  const MW = Math.round((x1 - x0) * K), MH = Math.round((y1 - y0) * K);

  // dibujar con el mismo código del editor, como si la pantalla fuera del tamaño de la imagen
  const saved = Object.assign({}, view), bcr = svg.getBoundingClientRect, endMark0 = endMark;
  const SYMX = opts.sym || 1, LINEX = opts.line || 1;   // solo para la imagen: símbolos y líneas más grandes
  sel = null;
  view.k = K; view.tx = -x0 * K; view.ty = -y0 * K;
  svg.getBoundingClientRect = () => ({left: 0, top: 0, x: 0, y: 0, width: MW, height: MH, right: MW, bottom: MH});
  // el punto negro pegado al cruce: misma regla del editor, ajustada al tamaño agrandado
  if (SYMX !== 1) endMark = w => { const L = plen(w.pts); return pointAt(w.pts, GAP.has(w.id) ? L - Math.min((END_R * SYMX * symF() + 1.5 * LINEX) / view.k, L * 0.3) : L); };
  applyView(); render();
  const c = svg.cloneNode(true);
  endMark = endMark0;
  svg.getBoundingClientRect = bcr; Object.assign(view, saved); applyView(); render();

  c.querySelectorAll('.pulse').forEach(e => e.remove());
  if (LINEX !== 1) c.querySelectorAll('[vector-effect="non-scaling-stroke"]').forEach(e => { const sw = parseFloat(e.getAttribute('stroke-width')); if (sw) e.setAttribute('stroke-width', (sw * LINEX).toFixed(2)); });
  if (SYMX !== 1) c.querySelectorAll('g[transform^="translate("]').forEach(g => { g.setAttribute('transform', g.getAttribute('transform').replace(/scale\(([\d.]+)\)/, (m, s) => `scale(${(parseFloat(s) * SYMX).toFixed(4)})`)); });
  if (opts.dim) c.querySelector('#photo').setAttribute('filter', 'url(#dimf)');
  const photo = c.querySelector('#photo');
  const blob = await fetch(photo.getAttribute('href')).then(r => r.blob());
  const dataUrl = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(blob); });
  photo.setAttribute('href', dataUrl);
  c.removeAttribute('id'); c.removeAttribute('class'); c.removeAttribute('style');
  const inner = c.innerHTML;

  // ---------- leyenda ----------
  const LW = opts.legendW || 2700, PAD = 130, ART = 7.6, FS = 90, LH = FS * 1.28;
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const wrap = (s, n) => { const out = []; let line = ''; s.split(' ').forEach(wd => { if ((line + ' ' + wd).trim().length > n) { out.push(line.trim()); line = wd; } else line += ' ' + wd; }); if (line.trim()) out.push(line.trim()); return out; };
  const ci = circColor(net.energizers[0].id), cp = circColor(net.energizers[1] ? net.energizers[1].id : net.energizers[0].id);
  const rows = [
    ['<path d="M4 13H40" stroke="#050706" stroke-opacity=".75" stroke-width="5.5"/><path d="M4 13H40" stroke="' + ci + '" stroke-width="3.2"/>', 'Alambre con corriente (circuito interior)'],
    ['<path d="M4 13H40" stroke="#050706" stroke-opacity=".75" stroke-width="6.5"/><path d="M4 13H40" stroke="' + cp + '" stroke-width="4"/>', 'Alambre del perímetro, con su propio energizador'],
    ['<path d="M4 13H40" stroke="#050706" stroke-opacity=".75" stroke-width="5.5"/><path d="M4 13H40" stroke="#9aa29c" stroke-width="3.2" stroke-dasharray="5 4"/>', 'Alambre sin corriente'],
    ['<path d="M4 13H40" stroke="#050706" stroke-width="4.5"/><path d="M4 13H40" stroke="#D9B38C" stroke-width="2.2"/><path d="M9 9.5l4 7M13 9.5l-4 7M20 9.5l4 7M24 9.5l-4 7M31 9.5l4 7M35 9.5l-4 7" stroke="#D9B38C" stroke-width="1.8" stroke-linecap="round"/>', 'Cerca sin corriente: púas u otro alambre (casas, corrales)'],
    ['<path d="M18 7 25 13 18 19" fill="none" stroke="#FF9A3C" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>', 'Hacia dónde va la corriente'],
    ['<circle cx="22" cy="13" r="10" fill="#141414" stroke="' + ci + '" stroke-width="2"/><path d="M23.5 6 17.5 14.5 21.5 14.5 20 20 26.5 11.5 22.5 11.5Z" fill="#FFD23F"/>', 'Energizador: de aquí sale toda la corriente'],
    ['<path d="M4 13H40" stroke="' + ci + '" stroke-width="3"/><rect x="12" y="6" width="20" height="14" rx="4" fill="#E5352B" stroke="#fff" stroke-width="1.5"/><path d="M16 13H28" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>', 'Switch cerrado: pasa la corriente'],
    ['<path d="M4 13H40" stroke="' + ci + '" stroke-width="3"/><rect x="12" y="6" width="20" height="14" rx="4" fill="#2a0f0d" stroke="#FF5147" stroke-width="1.5"/><path d="M16 16 27 9" stroke="#FF5147" stroke-width="2.5" stroke-linecap="round"/>', 'Switch abierto: corta todo lo que sigue'],
    ['<path d="M2 13H12M32 13H42" stroke="' + ci + '" stroke-width="3"/><path d="M12 13H32" stroke="#fff" stroke-width="6"/><path d="M12 13H32" stroke="#1F6FE5" stroke-width="4"/><rect x="15" y="9" width="14" height="8" rx="4" fill="#1F6FE5" stroke="#fff" stroke-width="1.2"/>', 'Puerta (azul): va de un alambre a otro; por ahí no pasa la corriente'],
    ['<path d="M2 13H12M32 13H42" stroke="' + ci + '" stroke-width="3"/><path d="M12 13H32" stroke="#0b0b0b" stroke-width="6.5"/><path d="M12 13H32" stroke="#fff" stroke-width="4"/><rect x="15" y="9" width="14" height="8" rx="4" fill="#fff" stroke="#141414" stroke-width="1.2"/>', 'Puerta con corriente (blanca): cerrada pasa la corriente, abierta la corta'],
    ['<path d="M2 21H12M32 21H42" stroke="' + ci + '" stroke-width="2.5"/><path d="M12 21Q22 -1 32 21" fill="none" stroke="#1a1300" stroke-width="6" stroke-linecap="round"/><path d="M12 21Q22 -1 32 21" fill="none" stroke="#FFD23F" stroke-width="3.5" stroke-linecap="round"/><circle cx="12" cy="21" r="3" fill="#FFD23F" stroke="#1a1300"/><circle cx="32" cy="21" r="3" fill="#FFD23F" stroke="#1a1300"/><path d="M20 7.5 23.5 10 20 12.5" fill="none" stroke="#FF9A3C" stroke-width="2" stroke-linecap="round"/>', 'Cable puente: pasa la corriente de un alambre a otro (la flecha dice hacia dónde)'],
    ['<path d="M4 13H24" stroke="' + ci + '" stroke-width="3"/><path d="M24 13H40" stroke="#9aa29c" stroke-width="3" stroke-dasharray="4 3"/><circle cx="24" cy="13" r="4.6" fill="#0b0b0b"/>', 'Fin de línea (punto negro): ahí termina el alambre. Si llega a otro alambre, va pegado al cruce y no le pasa corriente'],
    ['<path d="M4 13H40" stroke="#C9A15A" stroke-opacity=".75" stroke-width="5" stroke-linecap="round"/>', 'Camino (no es cerco)'],
  ];
  let y = PAD, L = [];
  const T = (x, yy, s, size, weight, col) => `<text x="${x}" y="${yy}" font-family="Segoe UI, system-ui, sans-serif" font-size="${size}" font-weight="${weight || 400}" fill="${col || '#F2F4F1'}">${esc(s)}</text>`;
  L.push(T(PAD, y + 110, 'Cerco eléctrico del rancho', 120, 800)); y += 170;
  L.push(T(PAD, y + 70, opts.date || '', 64, 400, '#B9C2BB')); y += 150;
  // km por circuito (lo mismo que la barra de arriba del editor)
  net.energizers.forEach(e => { const cc = SOL.circ[e.id]; const nm = e.name.replace(/^Energizador (del )?/i, ''); const t = nm.charAt(0).toUpperCase() + nm.slice(1) + ': ' + fmt(cc.live) + (cc.live < cc.total - 1 ? ' de ' + fmt(cc.total) : '') + ' con corriente';
    L.push(`<rect x="${PAD}" y="${y + 18}" width="60" height="60" rx="12" fill="${circColor(e.id)}"/>`); L.push(T(PAD + 95, y + 70, t, 70, 600)); y += 110; });
  if (SOL.dead > 1) { L.push(`<rect x="${PAD}" y="${y + 18}" width="60" height="60" rx="12" fill="#9aa29c"/>`); L.push(T(PAD + 95, y + 70, 'Sin corriente: ' + fmt(SOL.dead), 70, 600)); y += 110; }
  y += 70;
  L.push(T(PAD, y + 90, '¿Qué es cada cosa?', 96, 800)); y += 170;
  const AW = 44 * ART, AH = 26 * ART, TX = PAD + AW + 70, NCH = Math.floor((LW - TX - PAD) / (FS * 0.5));
  rows.forEach(([art, txt]) => {
    const lines = wrap(txt, NCH), h = Math.max(AH, lines.length * LH + 20);
    L.push(`<g transform="translate(${PAD} ${y + (h - AH) / 2})"><rect width="${AW}" height="${AH}" rx="${6 * ART}" fill="#3a4a3f"/><g transform="scale(${ART})" fill="none">${art}</g></g>`);
    const ty = y + h / 2 - (lines.length * LH) / 2 + FS * 0.95;
    lines.forEach((ln, i) => L.push(T(TX, ty + i * LH, ln, FS)));
    y += h + 64;
  });
  // escala
  y += 60;
  const pxPerM = K / net.mpp, meters = [500, 200, 100, 50].find(m => m * pxPerM <= LW - 2 * PAD - 60) || 50, bw = meters * pxPerM;
  L.push(T(PAD, y + 70, 'Escala', 76, 700)); y += 110;
  L.push(`<rect x="${PAD}" y="${y}" width="${bw / 2}" height="34" fill="#F2F4F1"/><rect x="${PAD + bw / 2}" y="${y}" width="${bw / 2}" height="34" fill="#3a4a3f" stroke="#F2F4F1" stroke-width="4"/>`);
  L.push(T(PAD, y + 120, '0', 64)); L.push(`<text x="${PAD + bw}" y="${y + 120}" text-anchor="end" font-family="Segoe UI, system-ui, sans-serif" font-size="64" fill="#F2F4F1">${meters} m</text>`);
  y += 200;
  const LHt = y + PAD;

  const TW = MW + LW, TH = Math.max(MH, LHt);
  const css = '.w-case{fill:none;stroke:#050706;stroke-opacity:.75;stroke-linecap:round;stroke-linejoin:round}.w{fill:none;stroke-linecap:round;stroke-linejoin:round}.w.dead{stroke:#9aa29c;stroke-dasharray:5 5}.road{fill:none;stroke:#C9A15A;stroke-opacity:.55;stroke-linecap:round;stroke-linejoin:round}';
  let out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${TW}" height="${TH}" viewBox="0 0 ${TW} ${TH}"><style>${css}</style>`
    + `<defs><filter id="dimf" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="${opts.dimSat || 0.55}"/><feComponentTransfer><feFuncR type="linear" slope="${opts.dim || 1}"/><feFuncG type="linear" slope="${opts.dim || 1}"/><feFuncB type="linear" slope="${opts.dim || 1}"/></feComponentTransfer></filter></defs>`
    + `<rect width="${TW}" height="${TH}" fill="#1d2420"/>`
    + `<svg x="0" y="0" width="${MW}" height="${MH}" viewBox="0 0 ${MW} ${MH}" overflow="hidden">${inner}</svg>`
    + `<g transform="translate(${MW} 0)"><rect width="${LW}" height="${TH}" fill="#1d2420"/><rect width="10" height="${TH}" fill="#0b0f0d"/>${L.join('')}</g></svg>`;

  if (opts.colors) out = out.replace(/#[0-9a-fA-F]{6}\b/g, h => opts.colors[h.toUpperCase()] || h);
  const img = new Image();
  img.src = URL.createObjectURL(new Blob([out], {type: 'image/svg+xml'}));
  await img.decode();
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH;
  const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(img, 0, 0);
  const jpg = await new Promise(r => cv.toBlob(r, 'image/jpeg', opts.q || 0.9));
  const res = await fetch('/save?name=' + encodeURIComponent(name), {method: 'POST', body: jpg}).then(r => r.text());
  if (opts.svg) await fetch('/save?name=' + encodeURIComponent(name.replace(/\.jpg$/, '.svg')), {method: 'POST', body: out});
  return {TW, TH, MW, MH, x0, y0, x1, y1, bytes: res, legendH: LHt};
};
