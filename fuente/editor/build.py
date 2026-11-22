import json
t = open('editor3.tpl.html', encoding='utf-8').read()
base = open('../editor_base.json', encoding='utf-8').read()
html = t.replace('/*__BASE__*/null', base)
open('index.html', 'w', encoding='utf-8').write(html)
open('preview.html', 'w', encoding='utf-8').write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + html + '</body></html>')
print('ok', len(html))
