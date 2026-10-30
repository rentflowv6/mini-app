#!/usr/bin/env python3
"""Render-hosted Mini App server.

Serves the built frontend (static shell) AND proxies live /api/* calls to the
local backend via the current Cloudflare quick-tunnel URL.

The tunnel URL comes from the LOCALALUNNEL_URL env var, which is kept current by
the local self-heal script (backend/tunnel_selfheal.py) whenever the quick-tunnel
rotates. Falls back to a localhost URL when unset (local dev / same-host case).
"""
import json
import os
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"
PORT = int(os.environ.get("PORT", "10000"))
# Local tunnel that fronts the live API. Updated by self-heal on rotation.
LOCAL_TUNNEL = os.environ.get("LOCAL_TUNNEL_URL", "").rstrip("/")


class Handler(SimpleHTTPRequestHandler):
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _proxy_api(self, path):
        base = LOCAL_TUNNEL or "http://127.0.0.1:8080"
        target = f"{base}{path}"
        try:
            req = urllib.request.Request(target, method="GET")
            with urllib.request.urlopen(req, timeout=12) as r:
                data = r.read()
                self.send_response(r.status)
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(data)))
                # Allow the Render shell origin to call us if ever needed.
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(data)
        except Exception as e:
            self._json({"error": "backend_unreachable", "detail": str(e)}, 502)

    def do_GET(self):
        # CORS preflight for cross-origin API calls
        if self.path == "/api/health" or self.path.startswith("/api/"):
            return self._proxy_api(self.path)
        # Serve frontend static shell
        path = self.path.lstrip("/") or "index.html"
        target = FRONTEND_DIR / path
        if not target.is_file():
            target = FRONTEND_DIR / "index.html"
        self.directory = str(FRONTEND_DIR)
        super().do_GET()

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def main():
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Mini App (Render) on :{PORT} tunnel={LOCAL_TUNNEL}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
