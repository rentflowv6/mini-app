#!/usr/bin/env python3
"""
Mini App backend — serves the dashboard UI and proxies live status
from the local Hermes router/gateway.

Endpoints:
  GET  /                -> dashboard UI (frontend static)
  GET  /api/health      -> aggregated live status (services, router, relay, disk, ram)
  GET  /api/models       -> model list from router
  GET  /api/relay       -> relay roster
  GET  /api/memory      -> memory summary
  GET  /api/logs        -> recent agent log lines (streaming tail, incremental since offset)
"""
import json
import os
import subprocess
import time
from http.server import HTTPServer, ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

import fleet_relay
import osint_gateway
import collection
import pipeline
import task_feed
import settings
import review_actions

ROUTER = "http://127.0.0.1:8819"
ROUTER_V1 = f"{ROUTER}/v1"
GODSPEED = "http://127.0.0.1:8888"
FRONTEND_DIR = Path(__file__).parent.parent / "frontend" / "dist"

SERVICES = [
    "hermes-gateway.service",
    "gateway-mcp.service",
    "hermes-dashboard.service",
    "neves-model-router.service",
    "hermes-mini-app.service",
    "hermes-mini-app-tunnel.service",
    "neves-mem0.service",
]

# Services that must never be stopped/restarted from the mini app control
# panel. Stopping these would kill the very interface serving this UI or the
# gateway/relay that powers the whole fleet.
PROTECTED_SERVICES = {
    "hermes-mini-app.service",          # this UI itself
    "hermes-mini-app-tunnel.service",   # remote access to this UI
    "hermes-gateway.service",           # the gateway / control plane
}

# Additional user units worth showing if present (picked up dynamically).
EXTRA_SERVICE_GLOBS = [
    "neves-*.service",
    "hermes-*.service",
    "gateway-*.service",
    "godspeed*.service",
    "silk*.service",
]


def _list_user_services() -> list:
    """Enumerate real user systemd units matching our core + extra globs."""
    seen = set(SERVICES)
    out = list(SERVICES)
    try:
        r = subprocess.run(["systemctl", "--user", "list-units", "--type=service",
                            "--no-pager", "--no-legend"],
                           capture_output=True, text=True, timeout=8)
        for line in r.stdout.splitlines():
            name = line.split()[0] if line.split() else ""
            if not name.endswith(".service"):
                continue
            if any(name.startswith(g.rstrip("*")) for g in EXTRA_SERVICE_GLOBS):
                if name not in seen:
                    seen.add(name)
                    out.append(name)
    except Exception:
        pass
    return out


def _service_state(name: str) -> str:
    try:
        r = subprocess.run(["systemctl", "--user", "is-active", name],
                           capture_output=True, text=True, timeout=8)
        return r.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def _service_detail(name: str) -> dict:
    """Return state + uptime (ActiveEnterTimestamp) for one unit."""
    st = _service_state(name)
    detail = {"state": st, "uptime": None, "load": None}
    try:
        r = subprocess.run(["systemctl", "--user", "show", name,
                            "-p", "LoadState",
                            "-p", "ActiveEnterTimestamp",
                            "-p", "ActiveState"],
                           capture_output=True, text=True, timeout=8)
        for line in r.stdout.splitlines():
            if line.startswith("LoadState="):
                detail["load"] = line.split("=", 1)[1].strip() or None
            elif line.startswith("ActiveEnterTimestamp="):
                v = line.split("=", 1)[1].strip()
                detail["uptime"] = v if v and v != "n/a" else None
    except Exception:
        pass
    return detail


def _service_action(name: str, action: str) -> dict:
    """Run systemctl --user {action} <name> with an allowlist + protect list.

    Returns {'ok': bool, 'action': str, 'name': str, 'state': str,
             'error': str|None}.
    """
    allowed = {"start", "stop", "restart"}
    if action not in allowed:
        return {"ok": False, "action": action, "name": name,
                "state": _service_state(name), "error": "invalid_action"}
    if name not in _list_user_services():
        return {"ok": False, "action": action, "name": name,
                "state": _service_state(name), "error": "unknown_service"}
    if name in PROTECTED_SERVICES:
        return {"ok": False, "action": action, "name": name,
                "state": _service_state(name), "error": "protected_service"}
    try:
        r = subprocess.run(["systemctl", "--user", action, name],
                           capture_output=True, text=True, timeout=30)
    except Exception as e:
        return {"ok": False, "action": action, "name": name,
                "state": _service_state(name), "error": str(e)}
    # Regardless of rc, report the *new* state; systemctl returns nonzero for
    # some expected transitions (e.g. "stop" on an already-stopped unit).
    return {"ok": r.returncode == 0, "action": action, "name": name,
            "state": _service_state(name),
            "error": r.stderr.strip() or (None if r.returncode == 0 else "failed")}


def _router_models() -> list:
    try:
        import urllib.request
        with urllib.request.urlopen(f"{ROUTER_V1}/models", timeout=5) as resp:
            data = json.loads(resp.read())
            return data.get("data", [])
    except Exception:
        return []


def _router_chat(messages, model="auto-free", timeout=90):
    """Proxy a chat request to the local Hermes router (OpenAI-compatible).

    Returns {"ok": True, "reply": str, "model": str} on success, or
    {"ok": False, "error": str} on failure. Bounded timeout so a slow
    upstream model doesn't hang the mini-app backend.
    """
    import urllib.request
    body = json.dumps({
        "model": model,
        "messages": messages,
        "max_tokens": 1024,
        "stream": False,
    }).encode()
    req = urllib.request.Request(
        f"{ROUTER_V1}/chat/completions",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read())
        choice = (data.get("choices") or [{}])[0]
        reply = (choice.get("message") or {}).get("content", "")
        # Record usage for cost analytics (never fails the request).
        try:
            in_chars = sum(len(str(m.get("content", ""))) for m in (messages or []))
            _record_usage("chat", data.get("model", model), "", in_chars, len(reply or ""))
        except Exception:
            pass
        return {"ok": True, "reply": reply, "model": data.get("model", model)}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}


MEM0 = "http://127.0.0.1:8821"


def _mem0_post(path, payload, timeout=20):
    """POST to mem0 (/add, /search). Returns parsed JSON or None."""
    import urllib.request
    try:
        req = urllib.request.Request(
            f"{MEM0}{path}",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def _mem0_recall(query, limit=5):
    """Search mem0 for memories relevant to the query."""
    r = _mem0_post("/search", {"query": query, "user_id": "swarm", "limit": limit}, timeout=15)
    if not r or not r.get("ok"):
        return []
    return [m.get("memory", "") for m in (r.get("results") or []) if m.get("memory")]


def _mem0_remember(text, source="chat"):
    """Store a distilled fact/conversation note into mem0."""
    _mem0_post("/add", {
        "text": text[:1500],
        "user_id": "swarm",
        "metadata": {"source": source, "ts": int(time.time())},
    }, timeout=15)


def _system_context():
    """A compact, factual snapshot of the current time + stack health."""
    now = time.strftime("%A %Y-%m-%d %H:%M:%S %Z")
    # Live service status (up/down) for grounding.
    svc = []
    for s in _list_user_services():
        try:
            active = subprocess.run(
                ["systemctl", "--user", "is-active", s],
                capture_output=True, text=True, timeout=5,
            ).stdout.strip()
        except Exception:
            active = "unknown"
        svc.append(f"{s}={active}")
    return (
        f"Current date/time: {now}.\n"
        f"Live service status:\n" + "\n".join(svc)
    )


# --- Safe read-only tools for the chat (Option B) ---
# Each tool: name, allowed leading tokens, and a function that runs the
# command WITHOUT a shell (no interpolation), bounded output, read-only only.
_SAFE_TOOLS = {
    "service_status": {
        "desc": "Check the active state of a service (e.g. godspeed-backend, router, hive). Usage: service_status <name>",
        "run": lambda args: _service_status_safe(args),
    },
    "list_services": {
        "desc": "List user services and their state. Usage: list_services",
        "run": lambda args: subprocess.run(
            ["systemctl", "--user", "list-units", "--type=service", "--no-pager", "--plain"],
            capture_output=True, text=True, timeout=8,
        ).stdout[:3000],
    },
    "disk": {
        "desc": "Show disk usage for / . Usage: disk",
        "run": lambda args: subprocess.run(
            ["df", "-h", "/"],
            capture_output=True, text=True, timeout=6,
        ).stdout,
    },
    "memory": {
        "desc": "Show RAM + swap usage. Usage: memory",
        "run": lambda args: subprocess.run(
            ["free", "-h"],
            capture_output=True, text=True, timeout=6,
        ).stdout,
    },
    "git_status": {
        "desc": "Show git status of a repo (silk, Northlet, or neves-hive). Usage: git_status <repo>",
        "run": lambda args: _git_status_safe(args),
    },
    "logs": {
        "desc": "Show recent log lines for a service. Usage: logs <service> [lines]",
        "run": lambda args: _logs_safe(args),
    },
}


def _git_status_safe(args):
    repo = (args[0] if args else "").strip()
    base = Path.home()
    paths = {"silk": base / "silk", "northlet": base / "Northlet", "neves-hive": base / "neves-hive"}
    p = paths.get(repo.lower())
    if not p or not p.is_dir():
        return "unknown repo (use silk, northlet, or neves-hive)"
    try:
        r = subprocess.run(
            ["git", "-C", str(p), "status", "--short", "--branch"],
            capture_output=True, text=True, timeout=8,
        )
        return (r.stdout or r.stderr).strip()[:1500]
    except Exception as e:
        return f"error: {e}"


def _service_status_safe(args):
    name = (args[0] if args else "").strip()
    if name.endswith(".service"):
        name = name[:-len(".service")]
    if not name:
        return "service name required"
    def probe(scope):
        try:
            r = subprocess.run(
                ["systemctl"] + scope + ["is-active", name],
                capture_output=True, text=True, timeout=6,
            )
            return r.stdout.strip(), r.returncode
        except Exception:
            return "", -1
    # User scope first.
    u_out, u_rc = probe(["--user"])
    if u_out == "active":
        return "active"
    # System scope (catches system services like hive, which show inactive in user scope).
    s_out, s_rc = probe([])
    if s_out == "active":
        return "active"
    # Prefer whichever scope actually has the unit (rc 0/3 = exists, 4 = no such unit).
    if u_rc in (0, 3) and u_out:
        return u_out
    if s_rc in (0, 3) and s_out:
        return s_out
    return "unknown"


def _logs_safe(args):
    svc = (args[0] if args else "").strip()
    if not svc:
        return "service required"
    try:
        lines = int(args[1]) if len(args) > 1 else 15
    except (ValueError, IndexError):
        lines = 15
    lines = max(1, min(40, lines))
    try:
        r = subprocess.run(
            ["journalctl", "--user", "-u", svc, "-n", str(lines), "--no-pager"],
            capture_output=True, text=True, timeout=10,
        )
        return (r.stdout or r.stderr).strip()[:2500]
    except Exception as e:
        return f"error: {e}"


def _run_safe_tool(text):
    """If the user's message looks like a tool request, run it and return the
    result text; else return None. Read-only only; allowlisted; no shell."""
    if not text:
        return None
    low = text.strip().lower()
    for name, spec in _SAFE_TOOLS.items():
        if low == name or low.startswith(name + " "):
            args = text.strip().split()[1:] if " " in text.strip() else []
            try:
                out = spec["run"](args)
            except Exception as e:
                out = f"error: {e}"
            return f"[tool:{name}]\n{out}"
    return None


def _relay_roster() -> dict:
    try:
        p = Path.home() / ".hermes/bot_relay/roster.json"
        with open(p) as f:
            return json.load(f)
    except Exception:
        return {}


def _community_summary() -> dict:
    """Godspeed community roster with role grouping and per-agent role."""
    roster = _relay_roster()
    agents = roster.get("agents", [])
    return {
        "community": roster.get("community", "God Speed"),
        "total_agents": len(agents),
        "agents": agents,
        "roles": sorted({a.get("role", "unassigned") for a in agents}),
        "updated_at": roster.get("updated_at", "unknown"),
    }


def _disk_ram():
    disk, ram = {}, {}
    try:
        r = subprocess.run(["df", "-h", "/"], capture_output=True, text=True, timeout=8)
        parts = r.stdout.splitlines()[1].split()
        disk = {"used": parts[4], "total": parts[1], "avail": parts[3]}
        # parts[4] like "56G" -> strip non-digits
        import re
        m = re.search(r"(\d+)", parts[4])
        if m:
            disk["used_pct"] = int(m.group(1))
    except Exception:
        pass
    try:
        r = subprocess.run(["free", "-m"], capture_output=True, text=True, timeout=8)
        parts = r.stdout.splitlines()[1].split()
        ram = {"used_mb": int(parts[2]), "total_mb": int(parts[1])}
    except Exception:
        pass
    return disk, ram


def _health_payload():
    services = {}
    for s in _list_user_services():
        d = _service_detail(s)
        d["protected"] = s in PROTECTED_SERVICES
        services[s] = d
    models = _router_models()
    roster = _relay_roster()
    disk, ram = _disk_ram()
    return {
        "ts": time.strftime("%Y-%m-%d %H:%M:%S"),
        "services": services,
        "router": {"models": len(models), "live": len(models) > 0},
        "relay": {"agents": len(roster.get("agents", [])), "roster": roster},
        "disk": disk,
        "ram": ram,
        "control": {"protected": sorted(PROTECTED_SERVICES)},
    }


AG_LOG = Path.home() / ".hermes/logs/agent.log"
LOG_LINE_LIMIT = int(settings.get("log_line_limit", 400))  # max lines returned per request

_START_TIME = time.time()

# --- Telegram alert helper (never print/log the token) ---
TELEGRAM_CHAT_ID = str(settings.get("telegram_chat_id", "6629458544"))


def _telegram_bot_token():
    """Read TELEGRAM_BOT_TOKEN from env sources without ever printing it."""
    # Priority: process env, then ~/.hermes/.env, then vault keys.env.
    tok = os.environ.get("TELEGRAM_BOT_TOKEN")
    for path in (Path.home() / ".hermes/.env", Path.home() / ".hermes/vault/keys.env"):
        if tok:
            break
        try:
            for line in path.read_text().splitlines():
                if line.startswith("TELEGRAM_BOT_TOKEN="):
                    tok = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
        except Exception:
            continue
    return tok or None


# --- Auth (PIN-based token for the local backend) ---
# The frontend already implements a PIN + Telegram flow and stores the token in
# localStorage as `mini_app_token`. This backend now implements the server side:
#   POST /api/auth            {pin} -> {token}
#   GET  /api/auth/telegram   -> {telegram_auth_available:false} (local uses PIN)
#   POST /api/auth/telegram   {initData} -> {token} (kept minimal; always 401)
# All mutating endpoints call self.require_auth() and reject without a valid
# Bearer token. The token is a short-lived HMAC over the owner PIN.

import hmac
import hashlib
import secrets

def _owner_pin():
    """Read MINI_APP_PIN from the vault (never log it)."""
    try:
        vault = Path.home() / ".hermes/vault/keys.env"
        if vault.exists():
            for line in vault.read_text().splitlines():
                if line.startswith("MINI_APP_PIN="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    except Exception:
        pass
    return None

def _auth_secret():
    """A stable per-owner secret = HMAC key over the PIN. If no PIN is set,
    auth is effectively disabled (matches the historical local behavior)."""
    pin = _owner_pin()
    if not pin:
        return None
    return hmac.new(pin.encode(), b"mini-app-auth-v1", hashlib.sha256).hexdigest()

def _make_token():
    secret = _auth_secret()
    if not secret:
        return None
    # token = hmac(secret, nonce) — stateless, no server-side store.
    nonce = secrets.token_hex(8)
    sig = hmac.new(secret.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return f"{nonce}.{sig}"

def _check_token(token):
    secret = _auth_secret()
    if not secret or not token:
        return False
    try:
        nonce, sig = token.split(".", 1)
    except (ValueError, AttributeError):
        return False
    expected = hmac.new(secret.encode(), nonce.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(sig, expected)

def _bearer_token(self):
    """Extract the Bearer token from the Authorization header."""
    auth = self.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        return auth[7:].strip()
    return None


def _send_telegram_alert(message):
    """Send a Telegram message to the configured chat. Returns (ok, result)."""
    tok = _telegram_bot_token()
    if not tok:
        return False, "no_token"
    if not message or not str(message).strip():
        return False, "empty_message"
    text = str(message).strip()
    if len(text) > 2000:
        return False, "message_too_long"
    try:
        import urllib.request
        url = f"https://api.telegram.org/bot{tok}/sendMessage"
        payload = json.dumps({"chat_id": int(TELEGRAM_CHAT_ID), "text": text}).encode()
        req = urllib.request.Request(url, data=payload,
                                     headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as r:
            data = json.loads(r.read())
        ok = bool(data.get("ok"))
        message_id = (data.get("result") or {}).get("message_id")
        return ok, message_id
    except Exception as e:
        return False, str(e)


def _tail_logs(since: int = 0, limit: int = 200):
    """Return log lines after byte offset `since`. Incremental, so the frontend
    can poll for new lines only. `since`=0 returns the last `limit` lines."""
    try:
        size = AG_LOG.stat().st_size
    except FileNotFoundError:
        return {"size": 0, "since": 0, "lines": []}
    if since < 0:
        since = 0
    if size <= since:
        return {"size": size, "since": size, "lines": []}
    with open(AG_LOG, "r", errors="replace") as f:
        f.seek(since)
        chunk = f.read()
    lines = chunk.splitlines()
    if since == 0 and len(lines) > limit:
        lines = lines[-limit:]
    return {"size": size, "since": since + len(chunk), "lines": lines}


class Handler(SimpleHTTPRequestHandler):
    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def require_auth(self):
        """Return None if a valid Bearer token is present, else a JSON error
        response (401). Call as: err = self.require_auth(); if err: return err"""
        if _check_token(_bearer_token(self)):
            return None
        return self._json({"error": "unauthorized"}, 401)

    def do_GET(self):
        if self.path == "/api/auth":
            # Report whether the local backend is PIN-gated. If a PIN is set in
            # the vault, the frontend must authenticate; otherwise it's open.
            return self._json({"pin_set": bool(_owner_pin())})
        if self.path == "/api/config":
            # Expose runtime config for the frontend (tunnel URL, etc.)
            return self._json({"tunnelUrl": "", "pinSet": bool(_owner_pin())})
        if self.path == "/api/auth/telegram":
            # Local backend uses PIN, not Telegram initData. Report unavailable
            # so the frontend falls back to the PIN gate.
            return self._json({"telegram_auth_available": False})
        if self.path == "/api/settings":
            return self._json(settings.load())
        if self.path == "/api/health":
            return self._json(_health_payload())
        if self.path == "/api/services":
            return self._json({s: _service_detail(s) for s in _list_user_services()})
        if self.path == "/api/self":
            return self._json({
                "ok": True,
                "service": "hermes-mini-app.service",
                "ts": time.strftime("%Y-%m-%d %H:%M:%S"),
                "pid": os.getpid(),
                "uptime_s": round(time.time() - _START_TIME),
            })
        if self.path == "/api/models":
            raw = _router_models()
            # Return full model objects so the frontend can render cards with
            # id + owned_by/provider badge + availability dot.
            return self._json({"models": raw})
        if self.path == "/api/relay":
            return self._json(_relay_roster())
        if self.path == "/api/community":
            return self._json(_community_summary())
        if self.path == "/api/export":
            return self._export_get()
        if self.path == "/api/pipelines":
            return self._json({"pipelines": pipeline.list_pipelines_state(),
                               "definitions": pipeline.list_pipelines()})
        if self.path.startswith("/api/pipelines/") and self.path.endswith("/advance"):
            return self._pipeline_advance_get()
        if self.path == "/api/fleet/roles":
            return self._json({"roles": fleet_relay.roles()})
        if self.path == "/api/fleet/replies":
            return self._json({"replies": fleet_relay.replies()})
        if self.path.startswith("/api/fleet/jobs"):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            job_id = qs.get("job_id", [None])[0]
            return self._json({"jobs": fleet_relay.list_jobs(job_id=job_id)})
        if self.path.startswith("/api/fleet/timeline"):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            try:
                limit = int(qs.get("limit", ["100"])[0])
            except (ValueError, TypeError):
                limit = 100
            return self._json({"events": fleet_relay.timeline(limit)})
        if self.path.startswith("/api/tasks/feed"):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            task_id = qs.get("task_id", [None])[0]
            return self._json(task_feed.feed(task_id))
        if self.path.startswith("/api/tasks/review"):
            return self._task_review_get()
        if self.path.startswith("/api/logs"):
            # /api/logs?since=<byte offset>&limit=N
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            try:
                since = int(qs.get("since", ["0"])[0])
            except ValueError:
                since = 0
            try:
                limit = int(qs.get("limit", ["200"])[0])
            except ValueError:
                limit = 200
            limit = max(1, min(limit, LOG_LINE_LIMIT))
            return self._json(_tail_logs(since=since, limit=limit))
        if self.path == "/api/osint/sources":
            return self._json(osint_gateway.catalog())
        if self.path.startswith("/api/osint/"):
            # /api/osint/<source>?<params>
            source = self.path.split("/api/osint/", 1)[1].split("?", 1)[0]
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            params = {k: v[0] for k, v in qs.items()}
            result = osint_gateway.run_query(source, params)
            if "error" in result and "rows" not in result:
                return self._json(result, 400)
            return self._json(result)
        if self.path == "/api/collection/stats":
            return self._json(collection.stats())
        if self.path.startswith("/api/collection/recent"):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            try:
                limit = int(qs.get("limit", ["50"])[0])
            except ValueError:
                limit = 50
            limit = max(1, min(limit, 200))
            return self._json({"items": collection.recent(limit)})
        if self.path.startswith("/api/collection/search"):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            q = qs.get("q", [""])[0].strip()
            if not q:
                return self._json({"error": "q_required"}, 400)
            return self._json({"items": collection.search(q)})
        if self.path.startswith("/api/collection/timeline"):
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(self.path).query)
            try:
                limit = int(qs.get("limit", ["200"])[0])
            except (ValueError, TypeError):
                limit = 200
            limit = max(1, min(limit, 200))
            return self._json({"events": collection.timeline(limit)})
        if self.path == "/api/collection/entities":
            return self._json({"entities": collection.entities()})
        if self.path.startswith("/api/agents/") and len(self.path) > len("/api/agents/"):
            return self._godspeed_agent_proxy()
        # serve frontend
        if FRONTEND_DIR.exists():
            self.directory = str(FRONTEND_DIR)
            path = self.path.lstrip("/") or "index.html"
            target = FRONTEND_DIR / path
            if not target.is_file():
                target = FRONTEND_DIR / "index.html"
            super().do_GET()
        else:
            self._json({"error": "frontend not built yet"}, 503)

    def do_POST(self):
        if self.path == "/api/auth":
            return self._auth_post()
        if self.path == "/api/auth/telegram":
            return self._json({"error": "unauthorized"}, 401)
        if self.path == "/api/settings":
            err = self.require_auth()
            if err:
                return err
            return self._settings_put()
        if self.path == "/api/fleet/dispatch":
            err = self.require_auth()
            if err:
                return err
            return self._dispatch_job()
        if self.path == "/api/tasks/review":
            return self._task_review_post()
        if self.path.startswith("/api/tasks/feed"):
            return self._task_feed_post()
        if self.path == "/api/collection/ingest":
            err = self.require_auth()
            if err:
                return err
            return self._collection_ingest()
        if self.path == "/api/alert/send":
            err = self.require_auth()
            if err:
                return err
            return self._alert_send()
        if self.path.startswith("/api/services/") and self.path.endswith("/action"):
            err = self.require_auth()
            if err:
                return err
            return self._service_action_post()
        if self.path == "/api/pipelines":
            err = self.require_auth()
            if err:
                return err
            return self._pipeline_create_post()
        if self.path.startswith("/api/pipelines/") and self.path.endswith("/advance"):
            err = self.require_auth()
            if err:
                return err
            return self._pipeline_advance_post()
        if self.path.startswith("/api/agents/") and len(self.path) > len("/api/agents/"):
            return self._godspeed_agent_proxy()
        if self.path == "/api/chat":
            return self._chat_post()
        return self._json({"error": "not_found"}, 404)

    def _auth_post(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        pin = str(body.get("pin", "") or "").strip()
        expected = _owner_pin()
        if not expected:
            # No PIN configured -> token is unnecessary; issue one anyway.
            return self._json({"ok": True, "token": _make_token() or ""})
        if not pin or not hmac.compare_digest(pin, expected):
            return self._json({"error": "invalid_pin"}, 401)
        return self._json({"ok": True, "token": _make_token()})

    def _settings_put(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        # Only accept known, scalar settings — never nested/unknown keys.
        allowed = {"telegram_chat_id", "alert_interval", "keepalive_interval",
                   "log_line_limit", "poll_timeline_s", "poll_review_s",
                   "poll_logs_s", "poll_health_s"}
        patch = {}
        for k, v in body.items():
            if k not in allowed:
                return self._json({"error": f"unknown_setting:{k}"}, 400)
            patch[k] = v
        if not patch:
            return self._json({"error": "no_settings"}, 400)
        try:
            merged = settings.save(patch)
        except Exception as e:
            return self._json({"error": f"save_failed:{e}"}, 500)
        return self._json({"ok": True, "settings": merged})

    def _pipeline_create_post(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        name = str(body.get("name", "") or "").strip()
        title = str(body.get("title", "") or "").strip()[:300]
        initial = str(body.get("input", "") or "")
        if name not in pipeline.PIPELINES:
            return self._json({"error": "unknown_pipeline"}, 400)
        if not title:
            return self._json({"error": "title_required"}, 400)
        try:
            st = pipeline.create_pipeline(name, title, initial)
        except Exception as e:
            return self._json({"error": f"create_failed:{e}"}, 500)
        # Immediately try to advance so the first stage dispatches now.
        cur, action, detail = pipeline.advance(st["pipeline_id"])
        return self._json({"ok": True, "pipeline": cur, "action": action, "detail": detail})

    def _pipeline_advance_get(self):
        pid = self.path[len("/api/pipelines/"):-len("/advance")].strip()
        state = pipeline.load_state(pid)
        if not state:
            return self._json({"error": "not_found"}, 404)
        return self._json({"pipeline": state})

    def _pipeline_advance_post(self):
        pid = self.path[len("/api/pipelines/"):-len("/advance")].strip()
        state = pipeline.load_state(pid)
        if not state:
            return self._json({"error": "not_found"}, 404)
        cur, action, detail = pipeline.advance(pid)
        return self._json({"ok": True, "action": action, "detail": detail, "pipeline": cur})

    def _chat_post(self):
        # POST /api/chat  body: {"messages": [{role, content}, ...], "model"?: str}
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        messages = body.get("messages")
        if not isinstance(messages, list) or not messages:
            return self._json({"error": "messages_required"}, 400)
        # Normalize: keep only string content, cap length, cap message count.
        clean = []
        for m in messages[-20:]:
            role = str(m.get("role", "user"))
            content = str(m.get("content", ""))
            if role not in ("system", "user", "assistant"):
                role = "user"
            if content.strip():
                clean.append({"role": role, "content": content[:4000]})
        if not clean:
            return self._json({"error": "empty_messages"}, 400)

        # --- SMART: ground the reply in real context + memory ---
        last_user = next((c["content"] for c in reversed(clean) if c["role"] == "user"), "")
        system = (
            "You are GODSPEED, the founder's capable AI agent. Be direct, sharp, "
            "and genuinely useful. You have LIVE access to the following facts — "
            "use them; never make up times, dates, or system status.\n\n"
            + _system_context()
        )
        # Recall relevant memory and inject if useful.
        try:
            memories = _mem0_recall(last_user, limit=4)
            if memories:
                system += "\n\nRelevant memory (use if helpful):\n- " + "\n- ".join(memories)
        except Exception:
            pass
        # SAFE TOOL: if the user asked for a read-only inspection, run it and
        # return the authoritative result directly (no LLM interpretation of the
        # data — this eliminates model flakiness misreading tool output).
        try:
            tool_out = _run_safe_tool(last_user)
            if tool_out:
                # Strip the [tool:...] marker and label the section.
                label = tool_out.split("\n", 1)[0].replace("[tool:", "").rstrip("]")
                data = tool_out.split("\n", 1)[1] if "\n" in tool_out else ""
                return self._json({"ok": True, "reply": data.strip(), "model": "tool", "tool": label})
        except Exception:
            pass
        system_prompt = {"role": "system", "content": system[:6000]}
        smart_messages = [system_prompt] + clean

        model = str(body.get("model", "gpt-oss-120b") or "gpt-oss-120b").strip()
        result = _router_chat(smart_messages, model=model)
        if not result["ok"]:
            return self._json({"ok": False, "error": result["error"]}, 502)

        # --- SMART: remember a distilled note about this exchange ---
        try:
            if last_user and result["reply"]:
                _mem0_remember(
                    f"User asked: {last_user[:300]} — AI replied: {result['reply'][:500]}",
                    source="chat",
                )
        except Exception:
            pass

        return self._json({"ok": True, "reply": result["reply"], "model": result["model"]})

    def _godspeed_agent_proxy(self):
        # Forward any GET/POST /api/agents/<name> to the GODSPEED backend :8888
        # and relay the response back to the client as-is.
        agent_name = self.path[len("/api/agents/"):]
        if not agent_name or "/" in agent_name:
            return self._json({"ok": False, "error": "invalid_agent"}, 400)

        import urllib.request, urllib.error, json

        target_url = f"{GODSPEED}/api/agents/{agent_name}"
        try:
            if self.command == "GET":
                req = urllib.request.Request(target_url, method="GET")
            else:
                body = self._read_json_body()
                if "_error" in body:
                    return self._json({"error": body["_error"]}, 413)
                payload = json.dumps(body).encode("utf-8")
                req = urllib.request.Request(
                    target_url, data=payload, method="POST",
                    headers={"Content-Type": "application/json"},
                )
            with urllib.request.urlopen(req, timeout=120) as resp:
                content_type = resp.headers.get("Content-Type", "text/plain")
                raw = resp.read()
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", "replace")[:500]
            return self._json({"ok": False, "error": str(e), "detail": err_body}, e.code)
        except Exception as e:
            return self._json({"ok": False, "error": str(e)}, 502)

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _service_action_post(self):
        # /api/services/<name>/action  body: {"action": "start|stop|restart"}
        name = self.path[len("/api/services/"):-len("/action")].strip()
        if not name:
            return self._json({"error": "service_required"}, 400)
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        action = str(body.get("action", "") or "").strip()
        if action not in ("start", "stop", "restart"):
            return self._json({"error": "invalid_action"}, 400)
        result = _service_action(name, action)
        status = 200 if result["ok"] else (403 if result.get("error") == "protected_service" else 400)
        return self._json(result, status)

    def _alert_send(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        message = body.get("message")
        level = body.get("level") or "info"
        if level not in ("info", "warn", "error", "critical"):
            level = "info"
        ok, result = _send_telegram_alert(message)
        if not ok:
            # Do not leak the token; return a generic error string.
            return self._json({"ok": False, "error": str(result)}, 500)
        return self._json({"ok": True, "message_id": result, "level": level})

    def _collection_ingest(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": "_error"}, 413)
        source = str(body.get("source", "") or "").strip()[:80]
        query = str(body.get("query", "") or "").strip()[:500]
        payload = body.get("payload")
        if not source:
            return self._json({"error": "source_required"}, 400)
        if payload is None:
            return self._json({"error": "payload_required"}, 400)
        try:
            rec = collection.ingest(source, query, payload)
        except Exception as e:
            return self._json({"error": f"ingest_failed:{e}"}, 500)
        return self._json({"ok": True, **rec})

    def _read_json_body(self):
        """Read and parse a JSON request body via Content-Length (bounded)."""
        try:
            length = int(self.headers.get("Content-Length", 0) or 0)
        except ValueError:
            length = 0
        if length <= 0:
            return {}
        if length > 64 * 1024:
            return {"_error": "body_too_large"}
        raw = self.rfile.read(length)
        try:
            return json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return {}

    def _task_review_post(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        task_id = str(body.get("task_id", "") or "").strip()
        action = str(body.get("action", "") or "").strip()
        owner_token = body.get("owner_token")
        reviewer = str(body.get("reviewer", "owner") or "owner").strip()
        reason = str(body.get("reason", "") or "")
        expected_run_id = body.get("expected_run_id")
        if expected_run_id is not None:
            try:
                expected_run_id = int(expected_run_id)
            except (TypeError, ValueError):
                return self._json({"error": "expected_run_id_invalid"}, 400)
        if not task_id or not action:
            return self._json({"error": "task_id_and_action_required"}, 400)
        ok, result = review_actions.review_action(
            task_id, action, owner_token, reviewer=reviewer,
            reason=reason, expected_run_id=expected_run_id,
        )
        code = 200 if ok else (401 if result.get("error") == "unauthorized" else 400)
        return self._json(result, code)

    def _task_review_get(self):
        from urllib.parse import urlparse, parse_qs
        qs = parse_qs(urlparse(self.path).query)
        task_id = qs.get("task_id", [None])[0]
        if not task_id:
            return self._json({"error": "task_id_required"}, 400)
        sc = review_actions._load_sync_core()
        feed = sc.read_record(review_actions.KANBAN_DB, review_actions.RELAY_DIR, task_id)
        feed["audit"] = review_actions._read_audit(task_id)
        return self._json(feed)

    def _task_feed_post(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": body["_error"]}, 413)
        task_id = str(body.get("task_id", "") or "").strip()
        result = body.get("result")
        worker = str(body.get("worker", "gpt-miniapp") or "gpt-miniapp").strip()
        if not task_id:
            return self._json({"error": "task_id_required"}, 400)
        if result is None or str(result).strip() == "":
            return self._json({"error": "result_required"}, 400)
        rec = task_feed.submit_result(task_id, result, worker)
        # Reload the feed so the caller sees the updated unified record.
        rec["feed"] = task_feed.feed(task_id)
        return self._json(rec)

    def _dispatch_job(self):
        body = self._read_json_body()
        if "_error" in body:
            return self._json({"error": "_error"}, 413)
        assignee = str(body.get("assignee", "") or "").strip()
        title = str(body.get("title", "") or "").strip()
        goal = str(body.get("goal", "") or "")
        # Caps on title/goal (roughly 2KB each).
        title = title[:fleet_relay.MAX_TITLE]
        goal = goal[:fleet_relay.MAX_GOAL]
        if not title:
            return self._json({"error": "title_required"}, 400)
        # Restrict assignee to the known role table.
        if assignee not in fleet_relay.relay.godspeed.ROLES:
            return self._json({"error": "unknown_assignee", "assignee": assignee}, 400)
        try:
            job_id = fleet_relay.dispatch_job(assignee, title, goal)
        except ValueError as e:
            return self._json({"error": str(e)}, 400)
        return self._json({"ok": True, "job_id": job_id, "assignee": assignee, "status": "open"})


def main():
    port = int(os.environ.get("PORT", "8080"))
    httpd = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"Mini App backend on :{port}", flush=True)
    httpd.serve_forever()


if __name__ == "__main__":
    main()
