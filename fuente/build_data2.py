import json, math, importlib.util, sys
spec = importlib.util.spec_from_file_location('trace2', 'trace2.py'); T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
OX, OY = 68, 240
MPP = 400 / 216.5

def proj(pts, q):
    best = None
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; L2 = dx * dx + dy * dy or 1
        t = max(0, min(1, ((q[0] - a[0]) * dx + (q[1] - a[1]) * dy) / L2))
        p = (a[0] + t * dx, a[1] + t * dy); d = math.hypot(p[0] - q[0], p[1] - q[1])
        if best is None or d < best[0]: best = (d, p)
    return best
R = lambda p: [round(p[0] - OX, 1), round(p[1] - OY, 1)]
plen = lambda pts: sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))

lines = {}; errs = []
for k, (name, pts, f) in T.L.items():
    par = f['parent']
    if par in T.ENERGIZERS: pa = T.ENERGIZERS[par]['pos']
    elif par in T.L:
        d, pa = proj(T.L[par][1], f['at'] or pts[0])
        if d > 3.5 and f['at']: errs.append(f'{k}: at {f["at"]} is {d:.1f}px from {par}')
    else: errs.append(f'{k}: unknown parent {par}'); continue
    gap = math.hypot(pa[0] - pts[0][0], pa[1] - pts[0][1])
    if f['via'] == 'j' and gap > 12: errs.append(f'{k}: joint gap {gap:.1f}px to {par}')
    if f['via'] == 'br' and gap > 34: errs.append(f'{k}: bridge gap {gap:.1f}px to {par}')
    if f['sw'] and f['sw'] not in T.SWITCHES: errs.append(f'{k}: unknown switch {f["sw"]}')
    lines[k] = {'name': name, 'pts': [R(p) for p in pts], 'm': round(plen(pts) * MPP), 'kind': 'perimeter' if k in T.PERIMETER_LINES else 'fence',
                'parent': par, 'via': f['via'], 'pa': R(pa)}
    if f['sw']: lines[k]['sw'] = f['sw']
    if f['gate']: lines[k]['gate'] = R(f['gate'])
# circuit of each line
def root(k):
    seen = set()
    while k in lines:
        if k in seen: errs.append('cycle at ' + k); return None
        seen.add(k); k = lines[k]['parent']
    return k
for k in lines: lines[k]['circuit'] = root(k)
# end dots
ends = []
for k, ln in lines.items():
    p = ln['pts']; e = p[-1]
    if math.hypot(e[0] - p[0][0], e[1] - p[0][1]) < 1: continue
    touch = False
    for c, lc in lines.items():
        if c == k: continue
        if lc['parent'] == k and lc['via'] == 'j' and math.hypot(lc['pa'][0] - e[0], lc['pa'][1] - e[1]) < 3: touch = True; break
        if proj([(x + OX, y + OY) for x, y in lc['pts']], (e[0] + OX, e[1] + OY))[0] < 2.5: touch = True; break
    if not touch: ends.append(e)
# switches numbered north -> south
sw = sorted(T.SWITCHES.items(), key=lambda kv: (kv[1]['pos'][1], kv[1]['pos'][0]))
idmap = {old: 'S%d' % (i + 1) for i, (old, _) in enumerate(sw)}
switches = [{'id': idmap[old], 'name': s['name'], 'pos': R(s['pos'])} for old, s in sw]
for ln in lines.values():
    if 'sw' in ln: ln['sw'] = idmap[ln['sw']]
used = {ln.get('sw') for ln in lines.values()}
for s in switches:
    if s['id'] not in used: errs.append('switch not used: ' + s['name'])
gates = [R(g) for g in T.GATES] + [ln['gate'] for ln in lines.values() if 'gate' in ln]
out = {'mpp': MPP, 'size': [976, 1170],
       'energizers': [{'id': k, 'name': e['name'], 'pos': R(e['pos'])} for k, e in T.ENERGIZERS.items()],
       'lines': lines, 'switches': switches, 'gates': gates, 'ends': ends,
       'doubts': [{'n': i + 1, 'pos': R(p), 'text': t} for i, (p, t) in enumerate(T.DOUBTS) if i + 1 not in T.RESOLVED],
       'resolved': [{'n': n, 'text': t} for n, t in sorted(T.RESOLVED.items())]}
json.dump(out, open('network2.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
tot = {}
for ln in lines.values(): tot[ln['circuit']] = tot.get(ln['circuit'], 0) + ln['m']
print('lines', len(lines), 'switches', len(switches), 'gates', len(gates), 'cables', sum(1 for l in lines.values() if l['via'] == 'br'), 'ends', len(ends), 'metros', tot)
print('\n'.join(errs) if errs else 'sin errores')
