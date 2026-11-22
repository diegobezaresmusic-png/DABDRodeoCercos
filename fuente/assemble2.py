rd = lambda f: open(f, encoding='utf-8').read()
t = rd('template.html')
head = t.split('<script>')[0]

def rep(a, b, count=1):
    global head
    assert head.count(a) >= 1, a[:70]
    head = head.replace(a, b, count)

if 'g-doubt' not in head:
    rep('<g id="g-pins"></g>', '<g id="g-doubt"></g>\n          <g id="g-pins"></g>')
    rep('<dt>Cerca interna</dt>', '<dt>Circuito interior</dt>')
    rep('<dt>Perímetro</dt>', '<dt>Circuito perímetro</dt>')
    rep('<dt>Puentes</dt>', '<dt>Cables</dt>')
    rep('<div class="bar"><i id="pw-bar"></i></div>', '<div class="bar"><i id="pw-bar"></i></div>\n        <div class="circ" id="pw-circ"></div>')
    rep('        <button type="button" class="btn primary" id="mark2" aria-pressed="false" disabled>Marcar corrección</button>',
        '        <div class="fix-btns"><button type="button" class="btn primary" id="mark2" aria-pressed="false" disabled>Marcar corrección</button>'
        '<button type="button" class="btn" id="fix-copy" hidden>Copiar para Claude</button></div>\n'
        '        <textarea id="fix-copy-out" class="copy-out" rows="5" readonly hidden aria-label="Texto de las correcciones"></textarea>')
    rep('      <section class="card">\n        <h2>Switches</h2>',
        '      <section class="card">\n        <h2>Dudas de Claude</h2>\n'
        '        <label class="dz-toggle" for="doubt-toggle"><input type="checkbox" id="doubt-toggle" checked> Mostrar las dudas en el mapa</label>\n'
        '        <ul class="dz-list" id="doubt-list"></ul>\n'
        '        <p class="note">Son los puntos donde tu dibujo no me quedó claro. Contéstame por número.</p>\n'
        '        <p class="note dz-done" id="doubt-done" hidden></p>\n'
        '      </section>\n\n'
        '      <section class="card">\n        <h2>Switches</h2>')
    rep('</svg>Energizador</li>', '</svg>Energizador (2)</li>')
    rep('</svg>Puente</li>', '</svg>Cable sobre puerta</li>')
    css = '''
/* dudas y circuitos */
.circ{display:flex;flex-wrap:wrap;gap:2px 16px;color:var(--muted);font:500 12.5px var(--f-data);font-variant-numeric:tabular-nums}
.bridge-case{fill:none;stroke:#0b0f0d;stroke-opacity:.6;stroke-width:4.4;stroke-linecap:round}
.doubt{cursor:pointer}
.doubt-n{font:700 9.5px var(--f-data);fill:#fff;pointer-events:none}
.dz-toggle{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted);margin:0 0 6px}
.dz-list{list-style:none;margin:0;padding:0;display:grid}
.dz-row{display:grid;grid-template-columns:auto 1fr;gap:10px;padding:8px 2px;border-top:1px solid var(--rule);align-items:start}
.dz-row:first-child{border-top:0}
.dz-row.hl{background:color-mix(in srgb,#7C4DFF 12%,transparent)}
.dz-row p{margin:0;font-size:13.5px;min-width:0;overflow-wrap:anywhere}
.dz-tag{min-width:34px;border:0;border-radius:99px;padding:5px 0;background:#7C4DFF;color:#fff;font:700 12px var(--f-data);cursor:pointer}
.dz-tag:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
.dz-done{color:var(--fg)}
.fix-btns{display:flex;flex-wrap:wrap;gap:8px}
.copy-out{width:100%;margin-top:8px;font:12.5px/1.4 var(--f-data);color:var(--fg);background:var(--chip);border:1px solid var(--rule);border-radius:6px;padding:8px}
'''
    rep('@media (max-width:900px){', css + '@media (max-width:900px){')
    rep('.pulse{fill:none;stroke:#FFD23F;stroke-width:2;', '.pulse{fill:none;stroke-width:2;')

js = rd('app2.js.txt').replace('/*__FIX__*/', rd('fix2_js.txt'))
tpl = head + '<script>\n' + js + '</script>\n'
open('template2.html', 'w', encoding='utf-8').write(tpl)
html = tpl.replace('/*__NET__*/null', rd('network2.json'))
open('site/index.html', 'w', encoding='utf-8').write(html)
open('site/preview.html', 'w', encoding='utf-8').write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>')
print('ok', len(html))
