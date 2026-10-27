import os
import sys
import time
import socket
import threading
import subprocess
import http.server
import socketserver

if getattr(sys, 'frozen', False):
    base_dir = os.path.dirname(os.path.abspath(sys.executable))
else:
    base_dir = os.path.dirname(os.path.abspath(__file__))

if os.path.exists(os.path.join(base_dir, "index.html")):
    DIRECTORY = base_dir
elif os.path.exists(os.path.join(base_dir, "ielts_vocab_app", "index.html")):
    DIRECTORY = os.path.join(base_dir, "ielts_vocab_app")
else:
    DIRECTORY = base_dir

class QuietHandler(http.server.SimpleHTTPRequestHandler):
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

    def log_message(self, format, *args):
        pass  # Suppress console logging

    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        clean_path = self.path.split('?')[0].lower()
        if clean_path.endswith(('.html', '.js', '.json', '.webmanifest')) or clean_path == '/' or not clean_path:
            self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0')
        super().end_headers()

def get_free_port():
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]

def find_browser_app():
    # Priority 1: Edge (Built-in on Windows 10 & 11)
    edge_paths = [
        os.path.expandvars(r"%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LocalAppData%\Microsoft\Edge\Application\msedge.exe")
    ]
    for p in edge_paths:
        if os.path.isfile(p):
            return p, "edge"

    # Priority 2: Chrome
    chrome_paths = [
        os.path.expandvars(r"%ProgramFiles%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"),
        os.path.expandvars(r"%LocalAppData%\Google\Chrome\Application\chrome.exe")
    ]
    for p in chrome_paths:
        if os.path.isfile(p):
            return p, "chrome"

    return None, None

def main():
    os.chdir(DIRECTORY)
    port = 8765
    
    try:
        httpd = socketserver.TCPServer(("127.0.0.1", port), QuietHandler)
    except OSError:
        port = get_free_port()
        httpd = socketserver.TCPServer(("127.0.0.1", port), QuietHandler)

    server_thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    server_thread.start()

    url = f"http://127.0.0.1:{port}/index.html"
    user_data_dir = os.path.join(os.environ.get("LOCALAPPDATA", DIRECTORY), "IELTS_Vocab_Master_Data")
    os.makedirs(user_data_dir, exist_ok=True)

    browser_bin, _ = find_browser_app()
    
    if browser_bin:
        cmd = [
            browser_bin,
            f"--app={url}",
            f"--user-data-dir={user_data_dir}",
            "--window-size=1280,850",
            "--window-position=100,50"
        ]
        proc = subprocess.Popen(cmd)
        try:
            proc.wait()
        except KeyboardInterrupt:
            pass
        finally:
            httpd.shutdown()
            httpd.server_close()
    else:
        try:
            import webview
            webview.create_window("IELTS Vocab Master", url, width=1280, height=850, min_size=(800, 600))
            webview.start()
        except Exception:
            import webbrowser
            webbrowser.open(url)
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                pass
        finally:
            httpd.shutdown()
            httpd.server_close()

if __name__ == "__main__":
    main()
