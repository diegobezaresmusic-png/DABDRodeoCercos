# Genera supabase/importar-datos.sql a partir de un guardado del editor.
# Ese SQL se pega en Supabase → SQL Editor después de correr alta-dueno.sql.
#
# Uso:  python herramientas/importar.py [archivo.json]
#       (por defecto fuente/editor/guardado-diego-ultimo.json)
import json, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
origen = Path(sys.argv[1]) if len(sys.argv) > 1 else RAIZ / 'fuente' / 'editor' / 'guardado-diego-ultimo.json'
datos = json.loads(origen.read_text(encoding='utf-8'))
if not (isinstance(datos, dict) and isinstance(datos.get('net'), dict) and 'wires' in datos['net']):
    raise SystemExit('El archivo no parece un guardado del editor (falta net.wires).')

texto = json.dumps(datos, ensure_ascii=False, separators=(',', ':'))
marca = '$cerco$'
assert marca not in texto
sql = f'''-- Generado por herramientas/importar.py desde {origen.name}
-- Sube la red del editor al proyecto (reemplaza la que haya en la nube).
insert into public.documentos (proyecto_id, coleccion, doc_id, datos)
select proyecto_id, 'cerco', 'red', {marca}{texto}{marca}::jsonb
from public.miembros where rol = 'dueno' limit 1
on conflict (proyecto_id, coleccion, doc_id) do update set datos = excluded.datos
returning proyecto_id, coleccion, doc_id, jsonb_array_length(datos->'net'->'wires') as alambres;
'''
salida = RAIZ / 'supabase' / 'importar-datos.sql'
salida.write_text(sql, encoding='utf-8')
print(f'{salida.relative_to(RAIZ)} listo: {len(datos["net"]["wires"])} alambres, {len(texto)//1024} KB')
