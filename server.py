#!/usr/bin/env python3
"""Render-hosted Mini App server (PIN-gated).

Serves the built frontend (static shell) AND proxies live /api/* calls to the
local backend via the current Cloudflare quick-tunnel URL.

The tunnel URL comes from the LOCAL_TUNNEL_URL env var, kept current by the
local self-heal script (backend/tunnel_selfheal.py). The dashboard is gated by
a PIN (MINI_APP_PIN env var): the frontend POSTs the PIN to /api/auth, gets a
bearer token, and sends it on subsequent /api/* calls.
"""
import hashlib
import hmac
import json
import os
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"
PORT = int(os.environ.get("PORT", "10000"))
LOCAL_TUNNEL = os.environ.get("LOCAL_TUNNEL_URL", "").rstrip("/")
PIN = os.environ.get("MINI_APP_PIN", "")


def _token_for(pin: str) -> str:
    return hmac.new(pin.encode(), b"mini-app-v1", hashlib.sha256).hexdigest()


class Handler(SimpleHTTPRequestHandler):
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0) or 0)
        if length <= 0:
            return {}
        try:
            return json.loads(self.rfile.read(length))
        except Exception:
            return {}

    def _authorized(self) -> bool:
        if not PIN:
            # No PIN configured -> open access.
            return True
        auth = self.headers.get("Authorization", "")
        return auth == f"Bearer {_token_for(PIN)}"

    def _proxy_api(self, path):
        if not self._authorized():
            return self._json({"error": "unauthorized"}, 401)
        base = LOCAL_TUNNEL or "http://127.0.0.1:8080"
        target = f"{base}{path}"
        method = self.command or "GET"
        try:
            body = None
            if method == "POST":
                length = int(self.headers.get("Content-Length", 0) or 0)
                if length > 0 and length <= 64 * 1024:
                    body = self.rfile.read(length)
            req = urllib.request.Request(target, method=method, data=body)
            req.add_header("Content-Type", self.headers.get("Content-Type", "application/json"))
            with urllib.request.urlopen(req, timeout=65) as r:
                data = r.read()
                self.send_response(r.status)
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            # Backend responded with an error status — relay it as-is.
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self._json({"error": "backend_unreachable", "detail": str(e)}, 502)

    def do_POST(self):
        if self.path == "/api/auth":
            if not PIN:
                return self._json({"token": _token_for(""), "pin_set": False})
            body = self._read_body()
            provided = str(body.get("pin", ""))
            if hmac.compare_digest(provided, PIN):
                return self._json({"token": _token_for(PIN), "pin_set": True})
            return self._json({"error": "wrong_pin"}, 401)
        if self.path.startswith("/api/"):
            # Proxy other POSTs (e.g. fleet dispatch) through to the local
            # backend, respecting the PIN gate.
            return self._proxy_api(self.path)
        return self._json({"error": "not_found"}, 404)

    def do_GET(self):
        if self.path == "/api/auth":
            return self._json({"pin_set": bool(PIN)})
        if self.path.startswith("/api/"):
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
    print(f"Mini App (Render) on :{PORT} tunnel={LOCAL_TUNNEL} pin_set={bool(PIN)}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
