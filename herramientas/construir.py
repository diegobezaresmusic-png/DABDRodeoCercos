# Genera mapa/index.html y editor/index.html desde sus plantillas en fuente/.
#   mapa   = fuente/template2.html          + fuente/network2.json         (en /*__NET__*/null)
#   editor = fuente/editor/editor3.tpl.html + fuente/editor/editor_base.json (en /*__BASE__*/null)
# Lo llama publicar.py; también se puede correr solo.
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
F = RAIZ / 'fuente'
PIEZAS = [
    ('mapa',   F / 'template2.html',             '/*__NET__*/null',  F / 'network2.json'),
    ('editor', F / 'editor' / 'editor3.tpl.html', '/*__BASE__*/null', F / 'editor' / 'editor_base.json'),
]


def construir():
    for app, plantilla, marca, datos in PIEZAS:
        t = plantilla.read_text(encoding='utf-8')
        assert t.count(marca) == 1, f'{plantilla.name}: falta la marca {marca}'
        html = t.replace(marca, datos.read_text(encoding='utf-8'))
        (RAIZ / app / 'index.html').write_text(html, encoding='utf-8', newline='\n')
        print(f'{app}/index.html: {len(html)} caracteres')


if __name__ == '__main__':
    construir()
