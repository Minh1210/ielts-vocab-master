import os
import sys
import time
import socket
import threading
import subprocess
import http.server
import socketserver

# Allow reuse of local addresses immediately
socketserver.TCPServer.allow_reuse_address = True

def resolve_app_dir():
    candidates = []
    
    # 1. Directory of current executable if frozen
    if getattr(sys, 'frozen', False):
        exe_dir = os.path.dirname(os.path.abspath(sys.executable))
        candidates.append(exe_dir)
        candidates.append(os.path.join(exe_dir, "ielts_vocab_app"))
        if hasattr(sys, '_MEIPASS'):
            candidates.append(sys._MEIPASS)
            candidates.append(os.path.join(sys._MEIPASS, "ielts_vocab_app"))

    # 2. Directory of current script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    candidates.append(script_dir)
    candidates.append(os.path.join(script_dir, "ielts_vocab_app"))

    # 3. Current working directory
    cwd = os.getcwd()
    candidates.append(cwd)
    candidates.append(os.path.join(cwd, "ielts_vocab_app"))

    # 4. Fallback well-known paths
    candidates.append(r"E:\học tiếng anh\ielts_vocab_app")
    candidates.append(r"E:\học tiếng anh")

    for d in candidates:
        if d and os.path.isdir(d) and os.path.isfile(os.path.join(d, "index.html")):
            return os.path.abspath(d)

    return script_dir

DIRECTORY = resolve_app_dir()

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
    icon_path = os.path.join(DIRECTORY, "app_icon.ico")

    # Priority 1: True Native Desktop Window via pywebview (WebView2 / WinForms)
    try:
        import webview
        window = webview.create_window(
            title="IELTS Vocab Master - Luyện Từ IELTS",
            url=url,
            width=1280,
            height=850,
            min_size=(800, 600),
            text_select=True,
            zoomable=True
        )
        kwargs = {
            "debug": False,
            "private_mode": False,
            "storage_path": user_data_dir
        }
        if os.path.isfile(icon_path):
            kwargs["icon"] = icon_path
            
        webview.start(**kwargs)
        # webview.start blocks until the window is closed by the user!
        return
    except Exception as e:
        # Fallback to Browser App Mode if pywebview is unavailable
        browser_bin, _ = find_browser_app()
        if browser_bin:
            cmd = [
                browser_bin,
                f"--app={url}",
                f"--user-data-dir={user_data_dir}",
                "--window-size=1280,850",
                "--window-position=100,50"
            ]
            subprocess.Popen(cmd)
        else:
            import webbrowser
            webbrowser.open(url)
        
        # In browser fallback mode, keep the server alive!
        # Do NOT shut down httpd prematurely.
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass

if __name__ == "__main__":
    main()
