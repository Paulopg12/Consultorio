from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SpaHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        clean_path = path.split("?", 1)[0].split("#", 1)[0]
        requested = ROOT / clean_path.lstrip("/")
        if requested.exists():
            return str(requested)
        return str(ROOT / "index.html")


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", 4173), SpaHandler)
    print("Serving http://localhost:4173/pages/consultorio")
    server.serve_forever()
