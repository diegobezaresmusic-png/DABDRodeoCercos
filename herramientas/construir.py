# Genera mapa/index.html y editor/index.html desde sus plantillas en fuente/.
#
# El cerco vive en un solo lugar: la red del editor (guardada en Supabase, doc cerco/red).
# Antes de construir se baja la última versión de la nube a fuente/editor/guardado-diego-ultimo.json
# (si hay token en .env y conexión), y esa red se incluye en las dos apps como punto de partida:
#   mapa   = fuente/template2.html          + red del editor + fuente/red-mapa.js (la convierte al formato del mapa)
#   editor = fuente/editor/editor3.tpl.html + red del editor
# Lo llama publicar.py; también se puede correr solo.
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
F = RAIZ / 'fuente'
GUARDADO = F / 'editor' / 'guardado-diego-ultimo.json'


def bajar_de_la_nube():
    if not (RAIZ / '.env').exists():
        print('nube: sin .env, uso el guardado local')
        return
    try:
        import sb
        filas = sb.sql("select datos from public.documentos where coleccion = 'cerco' and doc_id = 'red' limit 1")
    except BaseException as e:   # sin conexión o token vencido: se construye con lo que haya
        print('nube: no se pudo bajar la red (' + str(e)[:120] + '), uso el guardado local')
        return
    if not filas:
        print('nube: no hay red guardada todavía, uso el guardado local')
        return
    nube = filas[0]['datos']
    local = json.loads(GUARDADO.read_text(encoding='utf-8'))
    if nube.get('net', {}).get('wires') and (nube.get('savedAt') or 0) >= (local.get('savedAt') or 0):
        if nube != local:
            GUARDADO.write_text(json.dumps(nube, ensure_ascii=False), encoding='utf-8')
            print(f"nube: red actualizada ({len(nube['net']['wires'])} alambres)")
        else:
            print('nube: la red local ya es la última')
    else:
        print('nube: la red local es más nueva que la de la nube; se queda la local')


def poner(texto, marca, valor, archivo):
    assert texto.count(marca) == 1, f'{archivo}: falta la marca {marca}'
    return texto.replace(marca, valor)


def construir(nube=True):
    if nube:
        bajar_de_la_nube()
    guardado = json.loads(GUARDADO.read_text(encoding='utf-8'))
    red = json.dumps({'net': guardado['net'], 'savedAt': guardado.get('savedAt', 0)}, ensure_ascii=False, separators=(',', ':'))

    t = (F / 'template2.html').read_text(encoding='utf-8')
    t = poner(t, '/*__RED__*/null', red, 'template2.html')
    t = poner(t, '/*__RED_MAPA__*/', (F / 'red-mapa.js').read_text(encoding='utf-8'), 'template2.html')
    (RAIZ / 'mapa' / 'index.html').write_text(t, encoding='utf-8', newline='\n')

    e = (F / 'editor' / 'editor3.tpl.html').read_text(encoding='utf-8')
    e = poner(e, '/*__BASE__*/null', json.dumps(guardado['net'], ensure_ascii=False, separators=(',', ':')), 'editor3.tpl.html')
    (RAIZ / 'editor' / 'index.html').write_text(e, encoding='utf-8', newline='\n')
    print(f"mapa y editor construidos con la red del {GUARDADO.name} ({len(guardado['net']['wires'])} alambres)")


if __name__ == '__main__':
    construir()
