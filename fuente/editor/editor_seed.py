# Convierte network2.json (segunda vuelta) al modelo del editor:
#   energizers [{id,name,x,y,on}]
#   wires      [{id,name,kind:'fence'|'perimeter'|'cable',pts,from,gate?}]  pts en sentido del flujo
#   parts      [{id,type:'switch'|'gate'|'note',x,y,name?,open?,grp?,text?,by?}]
import json, math, sys
sys.path.insert(0, '.')
import trace2 as T
from PIL import Image

d = json.load(open('network2.json', encoding='utf-8'))
L = d['lines']
OX, OY = 68, 240
R1 = lambda v: round(v, 1)

def length(pts):
    return sum(math.dist(a, b) for a, b in zip(pts, pts[1:]))

def at_dist(pts, s):
    acc = 0
    for a, b in zip(pts, pts[1:]):
        l = math.dist(a, b)
        if acc + l >= s and l > 0:
            t = (s - acc) / l
            return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
        acc += l
    return list(pts[-1])

energizers = [{'id': e['id'], 'name': e['name'], 'x': e['pos'][0], 'y': e['pos'][1], 'on': True} for e in d['energizers']]
wires, parts = [], []
ids = {}
sw_by_id = {s['id']: s for s in d['switches']}
sw_places = {}   # switch id -> list of (x,y)

# parentes primero
order, seen = [], set()
def visit(k):
    if k in seen or k not in L: return
    p = L[k]['parent']
    if p in L: visit(p)
    seen.add(k); order.append(k)
for k in L: visit(k)

for k in order:
    v = L[k]
    pts = [list(p) for p in v['pts']]
    pa = list(v['pa'])
    kind = v['kind']
    frm = v['parent']
    feed_wire = None
    if v['via'] == 'br':
        cab = {'id': 'c_' + k, 'name': 'Cable sobre puerta', 'kind': 'cable',
               'pts': [pa, pts[0]], 'from': frm}
        if v.get('gate'): cab['gate'] = list(v['gate'])
        wires.append(cab)
        frm = cab['id']
        feed_wire = cab
    else:
        if math.dist(pa, pts[0]) > 0.5:
            pts = [pa] + pts
    w = {'id': k, 'name': v['name'], 'kind': kind, 'pts': pts, 'from': frm}
    wires.append(w)
    if v.get('sw'):
        target = feed_wire or w
        tl = length(target['pts'])
        s = min(5, tl * 0.35)
        sw_places.setdefault(v['sw'], []).append((target['id'], round(s, 1)))

# switches: uno por lugar; si un switch real corta varias salidas, comparten grp
for sid, places in sw_places.items():
    s = sw_by_id[sid]
    for i, (wid, sd) in enumerate(places):
        parts.append({'id': f'{sid.lower()}_{i}', 'type': 'switch', 'on': wid, 's': sd,
                      'name': s['name'], 'open': False, 'grp': sid if len(places) > 1 else None})

def proj(p, pts):
    best = (1e9, 0); acc = 0
    for a, b in zip(pts, pts[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1e-9
        t = max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l / l))
        q = (a[0] + t * dx, a[1] + t * dy); dd = math.dist(p, q)
        if dd < best[0]: best = (dd, acc + t * l)
        acc += l
    return best
for i, (x, y) in enumerate(T.GATES):
    p = (x - OX, y - OY)
    near = min(((proj(p, w['pts']), w) for w in wires if w['kind'] != 'cable'), key=lambda t: t[0][0])
    (dd, sd), w = near
    print('gate', i, p, 'dist %.1f' % dd, w['id'], 's %.0f/%.0f' % (sd, length(w['pts'])))
    parts.append({'id': f'g{i}', 'type': 'gate', 'x': p[0], 'y': p[1]})

for dd in d['doubts']:
    parts.append({'id': f'q{dd["n"]}', 'type': 'note', 'by': 'claude', 'x': dd['pos'][0], 'y': dd['pos'][1],
                  'text': f'?{dd["n"]} ' + dd['text'], 'answer': ''})

for w in wires:
    w['pts'] = [[R1(a), R1(b)] for a, b in w['pts']]

net = {'v': 1, 'mpp': d['mpp'], 'size': d['size'], 'energizers': energizers, 'wires': wires, 'parts': parts}
json.dump(net, open('editor_seed.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('wires', len(wires), 'cables', sum(w['kind'] == 'cable' for w in wires),
      'switch parts', sum(p['type'] == 'switch' for p in parts), 'gates', sum(p['type'] == 'gate' for p in parts),
      'notes', sum(p['type'] == 'note' for p in parts), 'bytes', len(json.dumps(net, separators=(',', ':'))))

# foto ligera para el celular: 1.5x del recorte
im = Image.open('site/rancho.jpg').convert('RGB')
W, H = d['size']
im = im.resize((int(W * 1.5), int(H * 1.5)), Image.LANCZOS)
im.save('editor/rancho-cel.jpg', quality=70, optimize=True, progressive=True)
import os; print('foto', im.size, os.path.getsize('editor/rancho-cel.jpg'))
