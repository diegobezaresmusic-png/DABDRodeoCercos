# Ayudante para administrar el Supabase de ESTE proyecto (no el de Rodeo).
# Lee el token de .env y usa la API de administración de Supabase.
#
#   python herramientas/sb.py sql "select 1"          -> corre SQL
#   python herramientas/sb.py archivo ruta.sql         -> corre un archivo SQL
#   python herramientas/sb.py get config/auth         -> GET a /v1/projects/<ref>/...
#   python herramientas/sb.py patch config/auth '{"disable_signup": true}'
import json, sys, urllib.request, urllib.error
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
REF = 'iemztqdgygxscwkmwipg'   # diegobezaresmusic-png's Project


def env(nombre):
    for linea in (RAIZ / '.env').read_text(encoding='utf-8').splitlines():
        if linea.startswith(nombre + '='):
            return linea.split('=', 1)[1].strip()
    raise SystemExit(f'Falta {nombre} en .env')


def api(metodo, ruta, cuerpo=None):
    req = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{REF}/' + ruta.lstrip('/'), method=metodo,
        data=json.dumps(cuerpo).encode() if cuerpo is not None else None,
        headers={'Authorization': 'Bearer ' + env('SUPABASE_ACCESS_TOKEN'), 'Content-Type': 'application/json',
                 'User-Agent': 'cerco-rancho-admin'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            t = r.read().decode() or 'null'
    except urllib.error.HTTPError as e:
        raise SystemExit(f'HTTP {e.code}: {e.read().decode()[:800]}')
    return json.loads(t)


def sql(texto):
    return api('POST', 'database/query', {'query': texto})


if __name__ == '__main__':
    cmd, *args = sys.argv[1:]
    if cmd == 'sql':
        r = sql(args[0])
    elif cmd == 'archivo':
        r = sql(Path(args[0]).read_text(encoding='utf-8'))
    elif cmd == 'get':
        r = api('GET', args[0])
    elif cmd == 'patch':
        r = api('PATCH', args[0], json.loads(args[1]))
    else:
        raise SystemExit('comando desconocido')
    print(json.dumps(r, ensure_ascii=False, indent=1))
