# Respaldos del cerco en la nube (Supabase de ESTE proyecto).
#
#   python herramientas/respaldo.py guardar [nombre]      -> respaldos/AAAA-MM-DD_HHMM_nombre.json
#   python herramientas/respaldo.py listar
#   python herramientas/respaldo.py restaurar <archivo>    -> vuelve a subir el cerco (cerco/red) del respaldo
#   python herramientas/respaldo.py restaurar <archivo> --todo
#        -> deja la nube EXACTAMENTE como en el respaldo: también correcciones, y borra lo que no estaba
#
# Antes de restaurar se guarda solo un respaldo "antes-de-restaurar", así cualquier restauración se puede deshacer.
# Al restaurar, el cerco se sube con fecha de ahora: así la nube gana sobre cualquier copia de un celular
# y el mapa de los demás dispositivos avisa que hay una versión nueva.
import json, sys, time, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sb

RAIZ = Path(__file__).resolve().parent.parent
DIR = RAIZ / 'respaldos'
Q = '$respaldo$'


def proyecto():
    import os
    if os.environ.get('CERCO_PROYECTO_PRUEBA'):   # solo para ensayar sin tocar el proyecto real
        return os.environ['CERCO_PROYECTO_PRUEBA']
    f = sb.sql("select proyecto_id from public.miembros where rol = 'dueno' limit 1")
    if not f:
        raise SystemExit('No hay proyecto con dueño en la nube.')
    return f[0]['proyecto_id']


def leer_nube(pid):
    return sb.sql(f"select coleccion, doc_id, datos, actualizado_en from public.documentos where proyecto_id = '{pid}' order by coleccion, doc_id")


def resumen(docs):
    partes = []
    for d in docs:
        if d['coleccion'] == 'cerco' and d['doc_id'] == 'red':
            n = d['datos']['net']
            t = datetime.datetime.fromtimestamp(d['datos'].get('savedAt', 0) / 1000).strftime('%Y-%m-%d %H:%M')
            partes.append(f"cerco: {len(n['wires'])} alambres, {sum(1 for p in n['parts'] if p['type'] == 'switch')} switches, guardado {t}")
    otros = [d for d in docs if not (d['coleccion'] == 'cerco' and d['doc_id'] == 'red')]
    if otros:
        partes.append(f'{len(otros)} documentos más (' + ', '.join(sorted({d["coleccion"] for d in otros})) + ')')
    return '; '.join(partes) or 'nube vacía'


def guardar(nombre='respaldo'):
    pid = proyecto()
    docs = leer_nube(pid)
    DIR.mkdir(exist_ok=True)
    nombre = ''.join(c if c.isalnum() or c in '-_' else '-' for c in nombre)
    ruta = DIR / f"{datetime.datetime.now().strftime('%Y-%m-%d_%H%M%S')}_{nombre}.json"
    ruta.write_text(json.dumps({'creado': datetime.datetime.now().isoformat(timespec='seconds'), 'proyecto_id': pid, 'documentos': docs},
                               ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'Respaldo guardado: {ruta.relative_to(RAIZ)}  ->  {resumen(docs)}')
    return ruta


def listar():
    for r in sorted(DIR.glob('*.json')):
        d = json.loads(r.read_text(encoding='utf-8'))
        print(f"{r.name}  ->  {resumen(d['documentos'])}")


def restaurar(archivo, todo=False):
    ruta = Path(archivo)
    if not ruta.exists():
        ruta = DIR / archivo
    resp = json.loads(ruta.read_text(encoding='utf-8'))
    docs = resp['documentos'] if todo else [d for d in resp['documentos'] if d['coleccion'] == 'cerco' and d['doc_id'] == 'red']
    if not docs:
        raise SystemExit('El respaldo no tiene el cerco.')
    pid = proyecto()
    guardar('antes-de-restaurar')
    ahora = int(time.time() * 1000)
    for d in docs:
        datos = dict(d['datos'])
        if d['coleccion'] == 'cerco' and d['doc_id'] == 'red':
            datos['savedAt'] = ahora
        texto = json.dumps(datos, ensure_ascii=False)
        assert Q not in texto
        sb.sql(f"insert into public.documentos (proyecto_id, coleccion, doc_id, datos) values ('{pid}', '{d['coleccion']}', '{d['doc_id']}', {Q}{texto}{Q}::jsonb) "
               f"on conflict (proyecto_id, coleccion, doc_id) do update set datos = excluded.datos")
    if todo:
        claves = {(d['coleccion'], d['doc_id']) for d in docs}
        sobran = [d for d in leer_nube(pid) if (d['coleccion'], d['doc_id']) not in claves]
        for d in sobran:
            sb.sql(f"delete from public.documentos where proyecto_id = '{pid}' and coleccion = '{d['coleccion']}' and doc_id = '{d['doc_id']}'")
        if sobran:
            print(f'Borrados {len(sobran)} documentos que no estaban en el respaldo (quedan en antes-de-restaurar).')
    print(f'Restaurado desde {ruta.name}  ->  ahora en la nube: {resumen(leer_nube(pid))}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] == 'listar':
        listar()
    elif args[0] == 'guardar':
        guardar(args[1] if len(args) > 1 else 'respaldo')
    elif args[0] == 'restaurar' and len(args) > 1:
        restaurar(args[1], '--todo' in args)
    else:
        raise SystemExit(__doc__ if __doc__ else 'uso: guardar | listar | restaurar <archivo> [--todo]')
