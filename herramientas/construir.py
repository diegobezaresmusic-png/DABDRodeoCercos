# Arma las páginas del mapa y del editor desde sus plantillas. Las páginas NO llevan datos adentro:
# las dos leen el cerco de la misma fuente (herramientas/web/cerco.js):
#   nube (Supabase, cerco/red)  ->  /datos/cerco.json (copia al publicar)  ->  copia única en el dispositivo
# y la misma foto (/datos/rancho.jpg).
#
#   mapa   = fuente/template2.html   (+ /red-mapa.js, que pasa la red al formato del mapa)
#   editor = fuente/editor/editor3.tpl.html
# Lo usa publicar.py.
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
F = RAIZ / 'fuente'


def paginas():
    return {
        'mapa': (F / 'template2.html').read_text(encoding='utf-8'),
        'fallas': (F / 'template2.html').read_text(encoding='utf-8'),   # el mismo mapa, en modo Fallas (lo decide la ruta)
        'editor': (F / 'editor' / 'editor3.tpl.html').read_text(encoding='utf-8'),
    }


def cerco_de_la_nube():
    """La red actual de la nube ({net, savedAt}), o None si no hay .env o conexión."""
    if not (RAIZ / '.env').exists():
        print('nube: sin .env')
        return None
    try:
        import sb
        filas = sb.sql("select datos from public.documentos where coleccion = 'cerco' and doc_id = 'red' limit 1")
    except BaseException as e:   # sin conexión o token vencido
        print('nube: no se pudo leer (' + str(e)[:120] + ')')
        return None
    if not filas or not filas[0]['datos'].get('net', {}).get('wires'):
        print('nube: no hay cerco guardado')
        return None
    d = filas[0]['datos']
    return {'net': d['net'], 'savedAt': d.get('savedAt', 0)}
