import http.server
import socketserver
import webbrowser
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        '': 'application/octet-stream',
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
    }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

def run():
    os.chdir(DIRECTORY)
    socketserver.TCPServer.allow_reuse_address = True
    
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0"
    is_cloud = bool(os.environ.get("RAILWAY_ENVIRONMENT") or os.environ.get("PORT"))
    
    try:
        httpd = socketserver.TCPServer((host, port), Handler)
    except OSError:
        fallback_port = 8080 if port == 8000 else port + 1
        httpd = socketserver.TCPServer((host, fallback_port), Handler)
        port = fallback_port

    print("=" * 60)
    print("  [OK] IELTS VOCAB MASTER (LUYEN TU) - SERVER READY")
    print(f"  Listening on: http://{host}:{port}")
    if is_cloud:
        print("  Running in Cloud / Production mode (Railway)")
    else:
        print(f"  Local access: http://localhost:{port}")
    print("=" * 60)

    if not is_cloud:
        try:
            webbrowser.open(f"http://localhost:{port}")
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()

if __name__ == "__main__":
    run()
