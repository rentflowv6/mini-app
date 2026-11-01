#!/usr/bin/env python3
"""Render-hosted Mini App server (Telegram initData + PIN-gated).

Serves the built frontend (static shell) AND proxies live /api/* calls to the
local backend via the penguin-relay HTTP bridge (no Cloudflare tunnel).

The relay bridge URL comes from the RELAY_HTTP_URL env var (e.g.
https://penguin-relay-v2.onrender.com/relay/http).

Auth has two primary paths:
  1. Telegram initData (preferred): when TELEGRAM_BOT_TOKEN is set, the
     frontend sends its WebApp initData to /api/auth/telegram; the server
     validates Telegram's signed hash (HMAC-SHA256 with the 'WebAppData'
     secret) and issues a deterministic bearer token derived from the
     validated Telegram user id.
  2. PIN (fallback): the legacy MINI_APP_PIN path. Kept working at all times
     so the app is never locked out when TELEGRAM_BOT_TOKEN is unset.
"""
import hashlib
import hmac
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

FRONTEND_DIR = Path(__file__).parent / "frontend" / "dist"
PORT = int(os.environ.get("PORT", "10000"))
RELAY_HTTP_URL = os.environ.get("RELAY_HTTP_URL", "").rstrip("/")
PIN = os.environ.get("MINI_APP_PIN", "")
BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()

INIT_DATA_MAX_AGE_SECONDS = 24 * 60 * 60  # 24h

# Tokens issued via the Telegram path. Populated at /api/auth/telegram time,
# consulted by _authorized() (single-process ThreadingHTTPServer).
ISSUED_TG_TOKENS = set()


def _token_for(pin: str) -> str:
    return hmac.new(pin.encode(), b"mini-app-v1", hashlib.sha256).hexdigest()


def _token_for_tg(user_id) -> str:
    """Deterministic bearer token for a validated Telegram user (stable per session)."""
    return hmac.new(f"tg:{user_id}".encode(), b"mini-app-v1", hashlib.sha256).hexdigest()


def validate_init_data(init_data_str: str, bot_token: str):
    """Validate Telegram WebApp initData.

    Implements Telegram's documented algorithm exactly:
      data_check_string = sorted key=value pairs (excluding hash) joined by newline
      secret_key        = HMAC_SHA256(bot_token, "WebAppData")
      computed_hash      = HMAC_SHA256(secret_key, data_check_string) hex
      compare computed_hash to provided hash (constant-time)

    Args:
        init_data_str: the raw initData query string (from
            window.Telegram.WebApp.initData).
        bot_token: the Telegram bot token (secret).

    Returns:
        The 'user' object (dict) on success.

    Raises:
        ValueError with a reason string on any validation failure.
    """
    if not bot_token:
        raise ValueError("bot_token_not_configured")
    if not init_data_str:
        raise ValueError("empty_init_data")

    # Parse the query string into key=value pairs.
    pairs = urllib.parse.parse_qsl(init_data_str, keep_blank_values=True)
    data = dict(pairs)

    provided_hash = data.get("hash", "")
    if not provided_hash:
        raise ValueError("missing_hash")

    # Build the data_check_string: all fields except hash, sorted by key,
    # joined as "key=value" lines in a newline-delimited block.
    filtered = [(k, v) for k, v in pairs if k != "hash"]
    filtered.sort(key=lambda kv: kv[0])
    data_check_string = "\n".join(f"{k}={v}" for k, v in filtered)

    # secret_key = HMAC_SHA256(bot_token, "WebAppData")
    secret_key = hmac.new(bot_token.encode(), b"WebAppData", hashlib.sha256).digest()
    # computed_hash = HMAC_SHA256(secret_key, data_check_string) as hex
    computed_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed_hash, provided_hash):
        raise ValueError("invalid_hash")

    # Reject stale auth_date (>24h old).
    try:
        auth_date = int(data.get("auth_date", "0"))
    except (TypeError, ValueError):
        raise ValueError("bad_auth_date")
    if time.time() - auth_date > INIT_DATA_MAX_AGE_SECONDS:
        raise ValueError("stale_auth_date")

    # Return the user object.
    user = data.get("user")
    if not user:
        raise ValueError("missing_user")
    try:
        user_obj = json.loads(user)
    except Exception:
        raise ValueError("bad_user_json")
    return user_obj


class Handler(SimpleHTTPRequestHandler):
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
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
        # Open access only if no auth is configured at all (no PIN and no bot token).
        if not PIN and not BOT_TOKEN:
            return True
        auth = self.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return False
        token = auth[len("Bearer "):]
        if PIN and hmac.compare_digest(token, _token_for(PIN)):
            return True
        if BOT_TOKEN and token in ISSUED_TG_TOKENS:
            return True
        return False

    def _proxy_api(self, path):
        if not self._authorized():
            return self._json({"error": "unauthorized"}, 401)
        if not RELAY_HTTP_URL:
            return self._json({"error": "backend_unreachable", "detail": "no_relay_configured"}, 503)
        method = self.command or "GET"
        try:
            body = None
            if method == "POST":
                length = int(self.headers.get("Content-Length", 0) or 0)
                if length > 0 and length <= 64 * 1024:
                    body = self.rfile.read(length)
            req = urllib.request.Request(RELAY_HTTP_URL + path, method=method, data=body)
            ctype = self.headers.get("Content-Type", "application/json")
            req.add_header("Content-Type", ctype)
            with urllib.request.urlopen(req, timeout=70) as r:
                data = r.read()
                self.send_response(r.status)
                self.send_header("Content-Type", r.headers.get("Content-Type", "application/json"))
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self.send_header("Content-Type", e.headers.get("Content-Type", "application/json"))
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self._json({"error": "backend_unreachable", "detail": str(e)}, 502)

    def _handle_telegram_auth(self):
        if not BOT_TOKEN:
            return self._json({"ok": False, "error": "not_configured"}, 503)
        body = self._read_body()
        init_data = str(body.get("initData", ""))
        try:
            user = validate_init_data(init_data, BOT_TOKEN)
        except ValueError as e:
            return self._json({"ok": False, "error": str(e)}, 401)
        user_id = user.get("id")
        if user_id is None:
            return self._json({"ok": False, "error": "invalid_init_data"}, 401)
        token = _token_for_tg(user_id)
        ISSUED_TG_TOKENS.add(token)
        return self._json({
            "ok": True,
            "token": token,
            "user": {
                "id": user_id,
                "first_name": user.get("first_name", ""),
                "username": user.get("username", ""),
            },
        })

    def do_GET(self):
        if self.path == "/api/auth":
            return self._json({"pin_set": bool(PIN)})
        if self.path == "/api/auth/telegram":
            return self._json({"telegram_auth_available": bool(BOT_TOKEN)})
        if self.path == "/config.json":
            # Return this Render origin so the frontend calls Render directly,
            # same-origin works. The backend bridge goes through the relay.
            origin = f"https://{self.headers.get('Host', 'mini-app-vpem.onrender.com')}"
            return self._json({"tunnelUrl": origin, "originUrl": origin})
        if self.path.startswith("/api/"):
            return self._proxy_api(self.path)
        # Serve frontend static shell
        path = self.path.lstrip("/") or "index.html"
        target = FRONTEND_DIR / path
        if not target.is_file():
            target = FRONTEND_DIR / "index.html"
        self.directory = str(FRONTEND_DIR)
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/auth":
            if not PIN:
                # No PIN configured -> issue the (empty) open token.
                return self._json({"token": _token_for(""), "pin_set": False})
            body = self._read_body()
            provided = str(body.get("pin", ""))
            if hmac.compare_digest(provided, PIN):
                return self._json({"token": _token_for(PIN), "pin_set": True})
            return self._json({"error": "wrong_pin"}, 401)
        if self.path == "/api/auth/telegram":
            return self._handle_telegram_auth()
        if self.path.startswith("/api/"):
            return self._proxy_api(self.path)
        return self._json({"error": "not_found"}, 404)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        super().end_headers()


def main():
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(
        f"Mini App (Render) on :{PORT} relay={RELAY_HTTP_URL or 'unset'} "
        f"pin_set={bool(PIN)} telegram_auth={bool(BOT_TOKEN)}",
        flush=True,
    )
    httpd.serve_forever()


if __name__ == "__main__":
    main()
