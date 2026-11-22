# Sirve el editor (solo lectura) y guarda en disco la imagen que manda el navegador (POST /save?name=...)
import http.server, sys, os, urllib.parse
ROOT, OUT = sys.argv[1], sys.argv[2]
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_POST(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        name = os.path.basename(q.get('name', ['out.bin'])[0])
        n = int(self.headers['Content-Length']); data = self.rfile.read(n)
        open(os.path.join(OUT, name), 'wb').write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(str(n).encode())
http.server.ThreadingHTTPServer(('127.0.0.1', int(sys.argv[3])), H).serve_forever()
