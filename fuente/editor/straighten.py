# Endereza los alambres: cada uno queda en tramos rectos (solo esquinas reales).
# Uso: python straighten.py entrada.json salida.json [eps]
import json, math, sys

src, dst = sys.argv[1], sys.argv[2]
EPS = float(sys.argv[3]) if len(sys.argv) > 3 else 6.0
net = json.load(open(src, encoding='utf-8'))
W = {w['id']: w for w in net['wires']}
E = {e['id']: e for e in net['energizers']}

def plen(p): return sum(math.dist(a, b) for a, b in zip(p, p[1:]))
def project(q, p):
    best = (1e9, 0, p[0]); acc = 0
    for a, b in zip(p, p[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1e-9
        t = max(0, min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l / l))
        x, y = a[0] + t * dx, a[1] + t * dy; d = math.hypot(q[0] - x, q[1] - y)
        if d < best[0]: best = (d, acc + t * l, [x, y])
        acc += l
    return best
def point_at(p, s):
    acc = 0
    for a, b in zip(p, p[1:]):
        l = math.dist(a, b)
        if acc + l >= s and l > 0:
            t = (s - acc) / l; return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]
        acc += l
    return list(p[-1])
def seg_dist(q, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy)
    if l == 0: return math.dist(q, a)
    t = max(0, min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / l / l))
    return math.hypot(q[0] - a[0] - t * dx, q[1] - a[1] - t * dy)
def dp(pts, eps):
    if len(pts) < 3: return pts
    i, dmax = 0, 0
    for k in range(1, len(pts) - 1):
        d = seg_dist(pts[k], pts[0], pts[-1])
        if d > dmax: i, dmax = k, d
    if dmax <= eps: return [pts[0], pts[-1]]
    return dp(pts[:i + 1], eps)[:-1] + dp(pts[i:], eps)
def closed(p): return len(p) > 3 and math.dist(p[0], p[-1]) < 1.0
def simplify(p, eps):
    if not closed(p): return dp(p, eps)
    # un anillo: partir en el punto más lejano del inicio para no colapsarlo
    far = max(range(len(p)), key=lambda k: math.dist(p[0], p[k]))
    return dp(p[:far + 1], eps)[:-1] + dp(p[far:], eps)

# posiciones viejas de lo que va pegado a un alambre
old_pos = {q['id']: point_at(W[q['on']]['pts'], q['s']) for q in net['parts'] if q.get('on') in W}
end_on = {}   # alambres cuyo final toca otro alambre
for w in net['wires']:
    e = w['pts'][-1]
    for o in net['wires']:
        if o is w or o['kind'] == 'cable': continue
        if project(e, o['pts'])[0] < 2.0 and not (o['id'] == w['id']):
            end_on[w['id']] = o['id']; break

# orden: padres primero
order, seen = [], set()
def visit(i):
    if i in seen: return
    seen.add(i)
    f = W[i].get('from')
    if f in W: visit(f)
    order.append(i)
for i in W: visit(i)

before = sum(len(w['pts']) for w in net['wires'])
done = set()
for i in order:
    w = W[i]
    f = w.get('from')
    if f in E: w['pts'][0] = [E[f]['x'], E[f]['y']]
    elif f in W: w['pts'][0] = project(w['pts'][0], W[f]['pts'])[2]
    if w['kind'] != 'cable':
        w['pts'] = simplify(w['pts'], EPS)
    done.add(i)
# finales que tocan otro alambre: volver a pegarlos
for i, o in end_on.items():
    W[i]['pts'][-1] = project(W[i]['pts'][-1], W[o]['pts'])[2]
# switches y puertas: misma posición sobre el alambre nuevo
for q in net['parts']:
    if q['id'] in old_pos and q['on'] in W:
        q['s'] = round(project(old_pos[q['id']], W[q['on']]['pts'])[1], 1)
for w in net['wires']:
    w['pts'] = [[round(a, 1), round(b, 1)] for a, b in w['pts']]
after = sum(len(w['pts']) for w in net['wires'])
json.dump(net, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
mpp = net['mpp']
print(f'eps {EPS}: puntos {before} -> {after}')
